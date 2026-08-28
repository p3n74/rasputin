import { describe, expect, it } from "vitest";
import { isEmailAllowed, parseAllowedEmails } from "../src/auth/allowlist.ts";

describe("allowlist", () => {
  it("matches case-insensitively", () => {
    const allowed = parseAllowedEmails("Ada@Example.com, bob@test.dev");
    expect(isEmailAllowed("ada@example.com", allowed)).toBe(true);
    expect(isEmailAllowed("BOB@test.dev", allowed)).toBe(true);
  });

  it("rejects unknown and empty", () => {
    const allowed = parseAllowedEmails("ada@example.com");
    expect(isEmailAllowed("eve@example.com", allowed)).toBe(false);
    expect(isEmailAllowed("", allowed)).toBe(false);
    expect(isEmailAllowed(null, allowed)).toBe(false);
    expect(isEmailAllowed("ada@example.com", new Set())).toBe(false);
  });
});
