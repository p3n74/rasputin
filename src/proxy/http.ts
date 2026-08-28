import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Logger } from "../logger.js";
import {
  injectWinnowOverlay,
  isHtmlContentType,
  winnowOfflineHtml,
} from "../server/chrome.js";
import {
  buildUpstreamRequestHeaders,
  buildUpstreamResponseHeaders,
  clientIp,
  forwardedProto,
  isEventStream,
} from "./headers.js";
import type { ResolvedUpstream } from "./upstream.js";

export type ProxyHttpOptions = {
  req: IncomingMessage;
  res: ServerResponse;
  upstream: ResolvedUpstream;
  token: string;
  log: Logger;
  requestId: string;
  wantsHtml?: boolean;
};

function writeOffline(res: ServerResponse, wantsHtml: boolean): void {
  if (res.headersSent) {
    res.destroy();
    return;
  }
  if (wantsHtml) {
    const html = winnowOfflineHtml();
    res.writeHead(503, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    res.end(html);
    return;
  }
  res.writeHead(503, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "winnow_unreachable", message: "Winnow is down" }));
}

export function proxyHttp(options: ProxyHttpOptions): void {
  const { req, res, upstream, token, log, requestId } = options;
  const wantsHtml = options.wantsHtml ?? false;
  const requestHeaders = buildUpstreamRequestHeaders(req.headers, {
    authorization: `Bearer ${token}`,
    host: upstream.url.host,
    forwardedProto: forwardedProto(req.headers),
    forwardedFor: clientIp(req.headers, req.socket.remoteAddress),
    forwardedHost:
      typeof req.headers.host === "string" ? req.headers.host : undefined,
  });
  if (wantsHtml) {
    requestHeaders["accept-encoding"] = "identity";
  }

  const proxyReq = http.request(
    {
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port,
      path: req.url,
      method: req.method,
      headers: requestHeaders,
    },
    (proxyRes) => {
      const sse = isEventStream(proxyRes.headers);
      const html = isHtmlContentType(
        Array.isArray(proxyRes.headers["content-type"])
          ? proxyRes.headers["content-type"].join(",")
          : proxyRes.headers["content-type"],
      );
      const responseHeaders = buildUpstreamResponseHeaders(proxyRes.headers, {
        sse,
      });

      if (html && !sse) {
        const chunks: Buffer[] = [];
        proxyRes.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        proxyRes.on("end", () => {
          const status = proxyRes.statusCode ?? 502;
          if (status === 502 || status === 503 || status === 504) {
            writeOffline(res, true);
            return;
          }
          const injected = injectWinnowOverlay(
            Buffer.concat(chunks).toString("utf8"),
          );
          delete responseHeaders["content-length"];
          delete responseHeaders["content-encoding"];
          res.writeHead(status, responseHeaders);
          res.end(injected);
        });
        proxyRes.on("error", () => {
          writeOffline(res, wantsHtml);
        });
        return;
      }

      res.writeHead(proxyRes.statusCode ?? 502, responseHeaders);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (error) => {
    log.error({ err: error, requestId }, "upstream request failed");
    writeOffline(res, wantsHtml);
  });

  req.on("aborted", () => {
    proxyReq.destroy();
  });

  req.pipe(proxyReq);
}
