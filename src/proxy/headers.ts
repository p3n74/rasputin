const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "http2-settings",
]);

export type HeaderBag = Record<string, string | string[] | undefined>;

function headerList(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }
  const joined = Array.isArray(value) ? value.join(",") : value;
  return joined
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function hopByHopNames(headers: HeaderBag): Set<string> {
  const names = new Set(HOP_BY_HOP);
  for (const extra of headerList(headers.connection)) {
    names.add(extra);
  }
  return names;
}

function flatten(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value.join(", ") : value;
}

export type UpstreamRequestOverrides = {
  authorization: string;
  host: string;
  forwardedProto: string;
  forwardedFor: string;
  forwardedHost?: string;
};

export function buildUpstreamRequestHeaders(
  incoming: HeaderBag,
  overrides: UpstreamRequestOverrides,
): Record<string, string> {
  const skip = hopByHopNames(incoming);
  skip.add("cookie");
  skip.add("authorization");
  skip.add("host");

  const out: Record<string, string> = {};
  for (const [rawName, rawValue] of Object.entries(incoming)) {
    const name = rawName.toLowerCase();
    if (skip.has(name)) {
      continue;
    }
    const value = flatten(rawValue);
    if (value === undefined) {
      continue;
    }
    out[name] = value;
  }

  out.host = overrides.host;
  out.authorization = overrides.authorization;
  out["x-forwarded-proto"] = overrides.forwardedProto;
  out["x-forwarded-for"] = overrides.forwardedFor;
  if (overrides.forwardedHost) {
    out["x-forwarded-host"] = overrides.forwardedHost;
  }
  return out;
}

export function buildUpstreamResponseHeaders(
  incoming: HeaderBag,
  options?: { sse?: boolean },
): Record<string, string | string[]> {
  const skip = hopByHopNames(incoming);
  const out: Record<string, string | string[]> = {};
  for (const [rawName, rawValue] of Object.entries(incoming)) {
    const name = rawName.toLowerCase();
    if (skip.has(name)) {
      continue;
    }
    if (rawValue === undefined) {
      continue;
    }
    out[name] = rawValue;
  }
  if (options?.sse) {
    out["x-accel-buffering"] = "no";
    out["cache-control"] = "no-cache";
  }
  return out;
}

export function isEventStream(headers: HeaderBag): boolean {
  const type = flatten(headers["content-type"]) ?? "";
  return type.toLowerCase().includes("text/event-stream");
}

export function clientIp(
  headers: HeaderBag,
  socketAddress?: string,
): string {
  const forwarded = flatten(headers["x-forwarded-for"]);
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return socketAddress ?? "127.0.0.1";
}

export function forwardedProto(
  headers: HeaderBag,
  encrypted?: boolean,
): string {
  const existing = flatten(headers["x-forwarded-proto"]);
  if (existing) {
    return existing.split(",")[0]?.trim() || "http";
  }
  return encrypted ? "https" : "http";
}

export function isUpgradeRequest(headers: HeaderBag): boolean {
  const connection = flatten(headers.connection)?.toLowerCase() ?? "";
  const upgrade = flatten(headers.upgrade)?.toLowerCase() ?? "";
  return connection.includes("upgrade") && upgrade.includes("websocket");
}
