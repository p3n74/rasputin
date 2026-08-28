import { describe, expect, it } from "vitest";
import {
  assertAllowedUpstream,
  isPreviewPortAllowed,
  parseUpstream,
} from "../src/proxy/upstream.ts";

describe("upstream allowlist", () => {
  it("parses the configured Winnow origin", () => {
    const upstream = parseUpstream("http://192.168.56.1:3210");
    expect(upstream.hostname).toBe("192.168.56.1");
    expect(upstream.port).toBe(3210);
  });

  it("rejects a different host or port", () => {
    const allowed = parseUpstream("http://192.168.56.1:3210");
    expect(() =>
      assertAllowedUpstream(parseUpstream("http://127.0.0.1:3210"), allowed),
    ).toThrow(/allowlist/);
    expect(() =>
      assertAllowedUpstream(parseUpstream("http://192.168.56.1:5173"), allowed),
    ).toThrow(/allowlist/);
  });

  it("allowlists preview ports independently", () => {
    expect(isPreviewPortAllowed(5173, [5173, 3000])).toBe(true);
    expect(isPreviewPortAllowed(4173, [5173, 3000])).toBe(false);
  });
});
