import http from "node:http";
import { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createLogger } from "../src/logger.ts";
import { proxyHttp } from "../src/proxy/http.ts";
import { parseUpstream } from "../src/proxy/upstream.ts";

const log = createLogger("silent");
const servers: http.Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
});

function listen(server: http.Server): Promise<number> {
  servers.push(server);
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve((server.address() as AddressInfo).port);
    });
  });
}

describe("streaming proxy", () => {
  it("forwards HTTP and injects the Winnow token", async () => {
    let authorization = "";
    let cookie: string | undefined;
    const origin = http.createServer((req, res) => {
      authorization = String(req.headers.authorization ?? "");
      cookie = req.headers.cookie;
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ide");
    });
    const originPort = await listen(origin);

    const gateway = http.createServer((req, res) => {
      proxyHttp({
        req,
        res,
        upstream: parseUpstream(`http://127.0.0.1:${originPort}`),
        token: "winnow-secret",
        log,
        requestId: "test",
      });
    });
    const gatewayPort = await listen(gateway);

    const response = await fetch(`http://127.0.0.1:${gatewayPort}/`, {
      headers: { cookie: "rasputin.session_token=nope" },
    });
    expect(await response.text()).toBe("ide");
    expect(authorization).toBe("Bearer winnow-secret");
    expect(cookie).toBeUndefined();
  });

  it("flushes SSE chunks as they arrive", async () => {
    const origin = http.createServer((req, res) => {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      });
      res.write("data: one\n\n");
      setTimeout(() => {
        res.write("data: two\n\n");
        res.end();
      }, 40);
    });
    const originPort = await listen(origin);

    const gateway = http.createServer((req, res) => {
      proxyHttp({
        req,
        res,
        upstream: parseUpstream(`http://127.0.0.1:${originPort}`),
        token: "t",
        log,
        requestId: "sse",
      });
    });
    const gatewayPort = await listen(gateway);

    const response = await fetch(
      `http://127.0.0.1:${gatewayPort}/api/agent/1/stream`,
    );
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("missing body");
    }
    const decoder = new TextDecoder();
    let seen = "";
    const first = await reader.read();
    seen += decoder.decode(first.value);
    expect(seen).toContain("data: one");
    const rest = await reader.read();
    seen += decoder.decode(rest.value);
    expect(seen).toContain("data: two");
  });
});
