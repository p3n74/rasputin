import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Auth } from "../auth/index.js";
import { getAllowedSession } from "../auth/session.js";
import type { Env } from "../env.js";
import type { Logger } from "../logger.js";
import type { ResolvedUpstream } from "../proxy/upstream.js";

export type AppBindings = {
  Variables: {
    requestId: string;
  };
};

export type AppDeps = {
  env: Env;
  auth: Auth;
  log: Logger;
  upstream: ResolvedUpstream;
  webDist: string;
  probeUpstream: () => Promise<{ ok: boolean; status?: number }>;
};

export function createApp(deps: AppDeps) {
  const app = new Hono<AppBindings>();
  const { env, auth, webDist, probeUpstream } = deps;

  app.use("*", async (c, next) => {
    const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
    c.set("requestId", requestId);
    c.header("x-request-id", requestId);
    await next();
  });

  app.on(["GET", "HEAD"], "/healthz", (c) =>
    c.json({ ok: true, service: "rasputin" }),
  );

  app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

  app.get("/_rasputin/api/config", (c) =>
    c.json({
      googleEnabled: env.googleEnabled,
      passwordEnabled: true,
    }),
  );

  app.get("/_rasputin/api/me", async (c) => {
    const session = await getAllowedSession(
      auth,
      c.req.raw.headers,
      env.allowedEmails,
    );
    if (!session) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }
    return c.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
    });
  });

  app.get("/_rasputin/api/upstream-health", async (c) => {
    const session = await getAllowedSession(
      auth,
      c.req.raw.headers,
      env.allowedEmails,
    );
    if (!session) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }
    const result = await probeUpstream();
    return c.json(result, result.ok ? 200 : 503);
  });

  app.get("/login", async (c) => {
    const html = await readFile(join(webDist, "index.html"), "utf8");
    return c.html(html);
  });

  app.get("/_rasputin", async (c) => {
    const html = await readFile(join(webDist, "index.html"), "utf8");
    return c.html(html);
  });

  app.get("/_rasputin/status", async (c) => {
    const html = await readFile(join(webDist, "index.html"), "utf8");
    return c.html(html);
  });

  app.notFound((c) => c.json({ error: "not found" }, 404));

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return error.getResponse();
    }
    deps.log.error({ err: error, requestId: c.get("requestId") }, "hono error");
    return c.json({ error: "internal error" }, 500);
  });

  return app;
}
