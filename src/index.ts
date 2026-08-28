import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createAuth, createLockoutStore } from "./auth/index.js";
import { seedOperator } from "./auth/seed.js";
import { createDatabase } from "./db/index.js";
import { applyMigrations } from "./db/migrate.js";
import { loadEnv } from "./env.js";
import { createLogger } from "./logger.js";
import { parseUpstream } from "./proxy/upstream.js";
import { createApp } from "./server/app.js";
import { listen } from "./server/listen.js";

config();

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, "..");

async function probeWinnow(
  origin: string,
  token: string,
): Promise<{ ok: boolean; status?: number }> {
  try {
    const response = await fetch(new URL("/api/health", origin), {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2500),
    });
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false };
  }
}

async function main() {
  const env = loadEnv();
  const log = createLogger();
  const { db } = createDatabase(env.DATABASE_URL);
  await applyMigrations(db);
  await seedOperator(db, env, log);

  const auth = createAuth(env, db, createLockoutStore());
  const upstream = parseUpstream(env.WINNOW_UPSTREAM);
  const webDist = join(projectRoot, "web", "dist");
  const webRoot = join(projectRoot, "web");

  const app = createApp({
    env,
    auth,
    log,
    upstream,
    webDist,
    probeUpstream: () => probeWinnow(env.WINNOW_UPSTREAM, env.WINNOW_UI_TOKEN),
  });

  await listen({
    env,
    auth,
    app,
    log,
    upstream,
    webDist,
    webRoot,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
