import { describe, expect, it } from "vitest";
import {
  createLockoutStore,
  isLocked,
  recordFailure,
  recordSuccess,
} from "../src/auth/lockout.ts";

describe("password lockout", () => {
  it("locks after max failures in the window", () => {
    const store = createLockoutStore();
    const now = () => 1_000;
    for (let i = 0; i < 4; i += 1) {
      expect(recordFailure(store, "a@b.c", { now, maxFailures: 5 }).locked).toBe(
        false,
      );
    }
    expect(recordFailure(store, "a@b.c", { now, maxFailures: 5 }).locked).toBe(
      true,
    );
    expect(isLocked(store, "a@b.c", { now })).toBe(true);
  });

  it("clears on success", () => {
    const store = createLockoutStore();
    recordFailure(store, "a@b.c");
    recordSuccess(store, "a@b.c");
    expect(isLocked(store, "a@b.c")).toBe(false);
  });
});
