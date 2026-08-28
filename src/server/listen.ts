import { createReadStream, existsSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize } from "node:path";
import { getRequestListener } from "@hono/node-server";
import type { Auth } from "../auth/index.js";
import { getAllowedSession, headersFromIncoming } from "../auth/session.js";
import type { Env } from "../env.js";
import type { Logger } from "../logger.js";
import { proxyHttp } from "../proxy/http.js";
import { proxyWebSocket, rejectUpgrade } from "../proxy/ws.js";
import type { ResolvedUpstream } from "../proxy/upstream.js";
import { isRasputinPath, isViteDevPath, requestPathname, wantsHtml } from "./routes.js";
import type { Hono } from "hono";
import type { AppBindings } from "./app.js";

const MIME: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

export type ListenDeps = {
  env: Env;
  auth: Auth;
  app: Hono<AppBindings>;
  log: Logger;
  upstream: ResolvedUpstream;
  webDist: string;
  webRoot: string;
};

function requestIdOf(req: IncomingMessage): string {
  const header = req.headers["x-request-id"];
  if (typeof header === "string" && header) {
    return header;
  }
  return crypto.randomUUID();
}

function serveFile(res: ServerResponse, filePath: string): boolean {
  if (!existsSync(filePath)) {
    return false;
  }
  const type = MIME[extname(filePath)] ?? "application/octet-stream";
  res.writeHead(200, { "content-type": type, "cache-control": "public, max-age=3600" });
  createReadStream(filePath).pipe(res);
  return true;
}

function redirect(res: ServerResponse, location: string, status = 302): void {
  res.writeHead(status, { location });
  res.end();
}

export async function listen(deps: ListenDeps) {
  const { env, auth, app, log, upstream, webDist } = deps;
  const honoListener = getRequestListener(app.fetch);
  const dev = env.NODE_ENV !== "production" && env.NODE_ENV !== "test";

  let vite:
    | {
        middlewares: (
          req: IncomingMessage,
          res: ServerResponse,
          next: (error?: unknown) => void,
        ) => void;
        transformIndexHtml: (url: string, html: string) => Promise<string>;
      }
    | undefined;

  if (dev) {
    const { createServer: createViteServer } = await import("vite");
    const viteServer = await createViteServer({
      configFile: join(deps.webRoot, "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "custom",
    });
    vite = viteServer;
  }

  const server = createServer(async (req, res) => {
    const id = requestIdOf(req);
    req.headers["x-request-id"] = id;
    const pathname = requestPathname(req.url);

    try {
      if (dev && vite && (pathname === "/login" || isViteDevPath(pathname))) {
        if (pathname === "/login") {
          const { readFile } = await import("node:fs/promises");
          const html = await readFile(join(deps.webRoot, "index.html"), "utf8");
          const transformed = await vite.transformIndexHtml("/login", html);
          res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          res.end(transformed);
          return;
        }
        vite.middlewares(req, res, () => {
          void honoListener(req, res);
        });
        return;
      }

      if (pathname.startsWith("/_rasputin/assets/")) {
        const relative = pathname.replace(/^\/_rasputin/, "");
        const filePath = normalize(join(webDist, relative));
        if (filePath.startsWith(normalize(webDist)) && serveFile(res, filePath)) {
          return;
        }
      }

      if (isRasputinPath(pathname)) {
        await honoListener(req, res);
        return;
      }

      const session = await getAllowedSession(
        auth,
        headersFromIncoming(req),
        env.allowedEmails,
      );
      if (!session) {
        if (wantsHtml(req.headers.accept) || pathname === "/") {
          redirect(res, "/login");
          return;
        }
        res.writeHead(401, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }

      proxyHttp({
        req,
        res,
        upstream,
        token: env.WINNOW_UI_TOKEN,
        log,
        requestId: id,
      });
    } catch (error) {
      log.error({ err: error, requestId: id }, "request handler failed");
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        res.end("Internal error");
      }
    }
  });

  server.on("upgrade", (req, socket, head) => {
    const id = requestIdOf(req);
    void (async () => {
      try {
        const session = await getAllowedSession(
          auth,
          headersFromIncoming(req),
          env.allowedEmails,
        );
        if (!session) {
          rejectUpgrade(socket, 401, "Unauthorized");
          return;
        }
        proxyWebSocket({
          req,
          socket,
          head,
          upstream,
          token: env.WINNOW_UI_TOKEN,
          log,
          requestId: id,
        });
      } catch (error) {
        log.error({ err: error, requestId: id }, "upgrade handler failed");
        rejectUpgrade(socket, 500, "Internal Server Error");
      }
    })();
  });

  await new Promise<void>((resolve) => {
    server.listen(env.PORT, env.HOST, () => resolve());
  });

  log.info({ host: env.HOST, port: env.PORT }, "rasputin listening");
  return server;
}
