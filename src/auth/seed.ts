import { eq } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { account, user } from "../db/schema.js";
import type { Env } from "../env.js";
import type { Logger } from "../logger.js";
import { isEmailAllowed } from "./allowlist.js";
import { hashPassword } from "./password.js";

export async function seedOperator(
  db: Database,
  env: Env,
  log: Logger,
): Promise<void> {
  const seed = env.seedOperator;
  if (!seed) {
    return;
  }
  if (!isEmailAllowed(seed.email, env.allowedEmails)) {
    log.warn(
      { email: seed.email },
      "seed operator email is not on RASPUTIN_ALLOWED_EMAILS; skipping",
    );
    return;
  }

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, seed.email))
    .limit(1);
  if (existing[0]) {
    return;
  }

  const now = new Date();
  const userId = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const passwordHash = await hashPassword(seed.password);

  await db.insert(user).values({
    id: userId,
    name: seed.name,
    email: seed.email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(account).values({
    id: accountId,
    accountId: userId,
    providerId: "credential",
    issuer: "local:credential",
    userId,
    password: passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  log.info({ email: seed.email }, "seeded break-glass operator");
}
