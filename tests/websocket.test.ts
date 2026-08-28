import http from "node:http";
import { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket, WebSocketServer } from "ws";
import { createLogger } from "../src/logger.ts";
import { parseUpstream } from "../src/proxy/upstream.ts";
import { proxyWebSocket } from "../src/proxy/ws.ts";

const log = createLogger("silent");
const servers: http.Server[] = [];

afterEach(() => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    server.close();
  }
});

describe("websocket proxy", () => {
  it("forwards the upgrade and injects the Winnow token", async () => {
    let authorization = "";
    let cookie: string | undefined;

    const origin = http.createServer();
    const wss = new WebSocketServer({ server: origin });
    wss.on("connection", (socket, req) => {
      authorization = String(req.headers.authorization ?? "");
      cookie = req.headers.cookie;
      socket.send("from-origin");
    });
    servers.push(origin);
    const originPort = await new Promise<number>((resolve) => {
      origin.listen(0, "127.0.0.1", () => {
        resolve((origin.address() as AddressInfo).port);
      });
    });

    const gateway = http.createServer();
    gateway.on("upgrade", (req, socket, head) => {
      proxyWebSocket({
        req,
        socket,
        head,
        upstream: parseUpstream(`http://127.0.0.1:${originPort}`),
        token: "winnow-secret",
        log,
        requestId: "ws",
      });
    });
    servers.push(gateway);
    const gatewayPort = await new Promise<number>((resolve) => {
      gateway.listen(0, "127.0.0.1", () => {
        resolve((gateway.address() as AddressInfo).port);
      });
    });

    const message = await new Promise<string>((resolve, reject) => {
      const client = new WebSocket(`ws://127.0.0.1:${gatewayPort}/ws/main/1`, {
        headers: { cookie: "rasputin.session_token=nope" },
      });
      client.on("message", (data) => {
        resolve(String(data));
        client.close();
      });
      client.on("error", reject);
    });

    expect(message).toBe("from-origin");
    expect(authorization).toBe("Bearer winnow-secret");
    expect(cookie).toBeUndefined();
  });
});
