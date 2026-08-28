import { describe, expect, it } from "vitest";
import { isRasputinPath, isViteDevPath } from "../src/server/routes.ts";

describe("rasputin routes", () => {
  it("keeps auth, health, and UI off the Winnow proxy", () => {
    expect(isRasputinPath("/login")).toBe(true);
    expect(isRasputinPath("/healthz")).toBe(true);
    expect(isRasputinPath("/api/auth/callback/google")).toBe(true);
    expect(isRasputinPath("/_rasputin/status")).toBe(true);
    expect(isRasputinPath("/")).toBe(false);
    expect(isRasputinPath("/ws/main/1")).toBe(false);
    expect(isRasputinPath("/api/health")).toBe(false);
  });

  it("recognizes Vite internals in development", () => {
    expect(isViteDevPath("/@vite/client")).toBe(true);
    expect(isViteDevPath("/_rasputin/api/config")).toBe(false);
    expect(isViteDevPath("/_rasputin/src/main.tsx")).toBe(true);
  });
});
