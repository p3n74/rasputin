import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Logger } from "../logger.js";
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
};

export function proxyHttp(options: ProxyHttpOptions): void {
  const { req, res, upstream, token, log, requestId } = options;
  const requestHeaders = buildUpstreamRequestHeaders(req.headers, {
    authorization: `Bearer ${token}`,
    host: upstream.url.host,
    forwardedProto: forwardedProto(req.headers),
    forwardedFor: clientIp(req.headers, req.socket.remoteAddress),
    forwardedHost:
      typeof req.headers.host === "string" ? req.headers.host : undefined,
  });

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
      const responseHeaders = buildUpstreamResponseHeaders(proxyRes.headers, {
        sse,
      });
      res.writeHead(proxyRes.statusCode ?? 502, responseHeaders);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (error) => {
    log.error({ err: error, requestId }, "upstream request failed");
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      res.end("Bad gateway");
    } else {
      res.destroy();
    }
  });

  req.on("aborted", () => {
    proxyReq.destroy();
  });

  req.pipe(proxyReq);
}
