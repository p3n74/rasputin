import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/env.ts";

const base = {
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:8787",
  WINNOW_UPSTREAM: "http://192.168.56.1:3210",
  WINNOW_UI_TOKEN: "token",
  RASPUTIN_ALLOWED_EMAILS: "you@example.com",
};

describe("loadEnv", () => {
  it("fails production boot without an allowlist", () => {
    expect(() =>
      loadEnv({
        ...base,
        NODE_ENV: "production",
        RASPUTIN_ALLOWED_EMAILS: "",
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "secret",
      }),
    ).toThrow(/RASPUTIN_ALLOWED_EMAILS/);
  });

  it("fails production boot without Google credentials", () => {
    expect(() =>
      loadEnv({
        ...base,
        NODE_ENV: "production",
      }),
    ).toThrow(/GOOGLE_CLIENT_ID/);
  });

  it("parses preview ports", () => {
    const env = loadEnv({
      ...base,
      NODE_ENV: "development",
      PREVIEW_PORTS: "5173, 3000",
    });
    expect(env.previewPorts).toEqual([5173, 3000]);
    expect(env.googleEnabled).toBe(false);
  });
});
