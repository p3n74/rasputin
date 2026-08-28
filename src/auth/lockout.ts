const GENERIC_DENIED = "Invalid email or password.";

export type LockoutStore = {
  failures: Map<string, { count: number; firstAt: number; lockedUntil?: number }>;
};

export function createLockoutStore(): LockoutStore {
  return { failures: new Map() };
}

export type LockoutOptions = {
  windowMs?: number;
  maxFailures?: number;
  lockMs?: number;
  now?: () => number;
};

const defaults = {
  windowMs: 15 * 60 * 1000,
  maxFailures: 5,
  lockMs: 15 * 60 * 1000,
};

export function lockoutKey(email: string): string {
  return email.trim().toLowerCase();
}

export function isLocked(
  store: LockoutStore,
  email: string,
  options: LockoutOptions = {},
): boolean {
  const now = options.now?.() ?? Date.now();
  const entry = store.failures.get(lockoutKey(email));
  if (!entry?.lockedUntil) {
    return false;
  }
  if (entry.lockedUntil <= now) {
    store.failures.delete(lockoutKey(email));
    return false;
  }
  return true;
}

export function recordFailure(
  store: LockoutStore,
  email: string,
  options: LockoutOptions = {},
): { locked: boolean } {
  const now = options.now?.() ?? Date.now();
  const windowMs = options.windowMs ?? defaults.windowMs;
  const maxFailures = options.maxFailures ?? defaults.maxFailures;
  const lockMs = options.lockMs ?? defaults.lockMs;
  const key = lockoutKey(email);
  const existing = store.failures.get(key);

  if (existing?.lockedUntil && existing.lockedUntil > now) {
    return { locked: true };
  }

  if (!existing || now - existing.firstAt > windowMs) {
    store.failures.set(key, { count: 1, firstAt: now });
    return { locked: false };
  }

  const count = existing.count + 1;
  if (count >= maxFailures) {
    store.failures.set(key, {
      count,
      firstAt: existing.firstAt,
      lockedUntil: now + lockMs,
    });
    return { locked: true };
  }

  store.failures.set(key, { count, firstAt: existing.firstAt });
  return { locked: false };
}

export function recordSuccess(store: LockoutStore, email: string): void {
  store.failures.delete(lockoutKey(email));
}

export function lockoutMessage(): string {
  return GENERIC_DENIED;
}
