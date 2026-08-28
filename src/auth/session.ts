import type { IncomingMessage } from "node:http";
import type { Auth } from "./index.js";
import { isEmailAllowed } from "./allowlist.js";

export function headersFromIncoming(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

export async function getAllowedSession(
  auth: Auth,
  headers: Headers,
  allowedEmails: Set<string>,
) {
  const session = await auth.api.getSession({ headers });
  if (!session) {
    return null;
  }
  if (!isEmailAllowed(session.user.email, allowedEmails)) {
    await auth.api.signOut({ headers }).catch(() => undefined);
    return null;
  }
  return session;
}
