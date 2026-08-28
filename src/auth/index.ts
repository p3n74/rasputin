import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { Database } from "../db/index.js";
import { account, session, user, verification } from "../db/schema.js";
import type { Env } from "../env.js";
import { isEmailAllowed } from "./allowlist.js";

const ACCESS_DENIED = "Access denied.";

export type Auth = ReturnType<typeof createAuth>;

export function createAuth(env: Env, db: Database) {
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
      enabled: false,
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
      after: createAuthMiddleware(async (ctx) => {
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
