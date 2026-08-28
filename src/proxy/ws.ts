import http from "node:http";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import type { Logger } from "../logger.js";
import {
  buildUpstreamRequestHeaders,
  clientIp,
  forwardedProto,
} from "./headers.js";
import type { ResolvedUpstream } from "./upstream.js";

export type ProxyWsOptions = {
  req: IncomingMessage;
  socket: Duplex;
  head: Buffer;
  upstream: ResolvedUpstream;
  token: string;
  log: Logger;
  requestId: string;
};

export function rejectUpgrade(
  socket: Duplex,
  status: number,
  message: string,
): void {
  socket.write(
    `HTTP/1.1 ${status} ${message}\r\nConnection: close\r\n\r\n`,
  );
  socket.destroy();
}

export function proxyWebSocket(options: ProxyWsOptions): void {
  const { req, socket, head, upstream, token, log, requestId } = options;
  const requestHeaders = buildUpstreamRequestHeaders(req.headers, {
    authorization: `Bearer ${token}`,
    host: upstream.url.host,
    forwardedProto: forwardedProto(req.headers),
    forwardedFor: clientIp(req.headers, req.socket.remoteAddress),
    forwardedHost:
      typeof req.headers.host === "string" ? req.headers.host : undefined,
  });
  requestHeaders.connection = "Upgrade";
  requestHeaders.upgrade = "websocket";

  const proxyReq = http.request({
    protocol: upstream.protocol,
    hostname: upstream.hostname,
    port: upstream.port,
    path: req.url,
    method: "GET",
    headers: requestHeaders,
  });

  proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
    const headerLines = [`HTTP/1.1 ${proxyRes.statusCode} Switching Protocols`];
    for (const [name, value] of Object.entries(proxyRes.headers)) {
      if (value === undefined) {
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          headerLines.push(`${name}: ${item}`);
        }
      } else {
        headerLines.push(`${name}: ${value}`);
      }
    }
    socket.write(`${headerLines.join("\r\n")}\r\n\r\n`);
    if (proxyHead.length) {
      socket.write(proxyHead);
    }
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);

    const hangup = () => {
      proxySocket.destroy();
      socket.destroy();
    };
    proxySocket.on("error", hangup);
    socket.on("error", hangup);
  });

  proxyReq.on("error", (error) => {
    log.error({ err: error, requestId }, "upstream websocket failed");
    rejectUpgrade(socket, 502, "Bad Gateway");
  });

  proxyReq.on("response", (res) => {
    const status = res.statusCode ?? 502;
    rejectUpgrade(socket, status, res.statusMessage || "Upgrade Failed");
  });

  if (head.length) {
    proxyReq.write(head);
  }
  proxyReq.end();
}
