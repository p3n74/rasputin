import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { Database } from "../db/index.js";
import { account, session, user, verification } from "../db/schema.js";
import type { Env } from "../env.js";
import { isEmailAllowed } from "./allowlist.js";
import {
  createLockoutStore,
  isLocked,
  lockoutMessage,
  recordFailure,
  recordSuccess,
  type LockoutStore,
} from "./lockout.js";
import { hashPassword, verifyPassword } from "./password.js";

const ACCESS_DENIED = "Access denied.";

export type Auth = ReturnType<typeof createAuth>;

export function createAuth(
  env: Env,
  db: Database,
  lockout: LockoutStore = createLockoutStore(),
) {
  return betterAuth({
    appName: "Rasputin",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user,
        session,
        account,
        verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      password: {
        hash: hashPassword,
        verify: async ({ hash, password }) => verifyPassword(hash, password),
      },
    },
    socialProviders: env.googleEnabled
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID as string,
            clientSecret: env.GOOGLE_CLIENT_SECRET as string,
            prompt: "select_account",
          },
        }
      : {},
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 12,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    advanced: {
      cookiePrefix: "rasputin",
      useSecureCookies: env.NODE_ENV === "production",
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
      customRules: {
        "/sign-in/email": {
          window: 60,
          max: 8,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (created) => {
            if (!isEmailAllowed(created.email, env.allowedEmails)) {
              throw new APIError("FORBIDDEN", { message: ACCESS_DENIED });
            }
            return { data: created };
          },
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-in/email") {
          return;
        }
        const email = String(ctx.body?.email ?? "");
        if (isLocked(lockout, email)) {
          throw new APIError("FORBIDDEN", { message: lockoutMessage() });
        }
        if (email && !isEmailAllowed(email, env.allowedEmails)) {
          recordFailure(lockout, email);
          throw new APIError("FORBIDDEN", { message: lockoutMessage() });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-in/email") {
          const email = String(ctx.body?.email ?? "");
          const returned = ctx.context.returned;
          const failed =
            returned instanceof Error ||
            (returned &&
              typeof returned === "object" &&
              "status" in returned &&
              (returned as { status: string }).status === "FORBIDDEN");
          if (failed || !ctx.context.newSession) {
            if (email) {
              recordFailure(lockout, email);
            }
          } else if (email) {
            recordSuccess(lockout, email);
          }
        }

        const newSession = ctx.context.newSession;
        if (
          newSession &&
          !isEmailAllowed(newSession.user.email, env.allowedEmails)
        ) {
          await ctx.context.internalAdapter.deleteSession(
            newSession.session.token,
          );
          throw new APIError("FORBIDDEN", { message: ACCESS_DENIED });
        }
      }),
    },
  });
}

export { createLockoutStore };
