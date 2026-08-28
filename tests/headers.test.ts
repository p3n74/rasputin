import { describe, expect, it } from "vitest";
import {
  buildUpstreamRequestHeaders,
  buildUpstreamResponseHeaders,
  isEventStream,
  isUpgradeRequest,
} from "../src/proxy/headers.ts";

describe("proxy headers", () => {
  it("strips cookies and injects the Winnow bearer token", () => {
    const headers = buildUpstreamRequestHeaders(
      {
        cookie: "rasputin.session_token=secret",
        authorization: "Bearer user-token",
        host: "ide.example.com",
        accept: "text/html",
        connection: "keep-alive",
      },
      {
        authorization: "Bearer winnow-token",
        host: "192.168.56.1:3210",
        forwardedProto: "https",
        forwardedFor: "1.2.3.4",
        forwardedHost: "ide.example.com",
      },
    );

    expect(headers.cookie).toBeUndefined();
    expect(headers.authorization).toBe("Bearer winnow-token");
    expect(headers.host).toBe("192.168.56.1:3210");
    expect(headers.accept).toBe("text/html");
    expect(headers.connection).toBeUndefined();
    expect(headers["x-forwarded-proto"]).toBe("https");
    expect(headers["x-forwarded-for"]).toBe("1.2.3.4");
  });

  it("marks SSE responses as unbuffered", () => {
    const headers = buildUpstreamResponseHeaders(
      { "content-type": "text/event-stream", connection: "keep-alive" },
      { sse: true },
    );
    expect(headers["x-accel-buffering"]).toBe("no");
    expect(headers.connection).toBeUndefined();
    expect(isEventStream({ "content-type": "text/event-stream; charset=utf-8" })).toBe(
      true,
    );
  });

  it("detects websocket upgrades", () => {
    expect(
      isUpgradeRequest({
        connection: "keep-alive, Upgrade",
        upgrade: "websocket",
      }),
    ).toBe(true);
    expect(isUpgradeRequest({ connection: "keep-alive" })).toBe(false);
  });
});
