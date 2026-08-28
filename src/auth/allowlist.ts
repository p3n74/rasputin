export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isEmailAllowed(
  email: string | null | undefined,
  allowed: Set<string>,
): boolean {
  if (!email) {
    return false;
  }
  if (allowed.size === 0) {
    return false;
  }
  return allowed.has(normalizeEmail(email));
}

export function parseAllowedEmails(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((part) => normalizeEmail(part))
      .filter(Boolean),
  );
}
