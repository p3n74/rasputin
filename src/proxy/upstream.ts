export type ResolvedUpstream = {
  url: URL;
  hostname: string;
  port: number;
  protocol: "http:" | "https:";
};

export function parseUpstream(raw: string): ResolvedUpstream {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported upstream protocol: ${url.protocol}`);
  }
  const port = url.port
    ? Number.parseInt(url.port, 10)
    : url.protocol === "https:"
      ? 443
      : 80;
  return {
    url,
    hostname: url.hostname,
    port,
    protocol: url.protocol,
  };
}

export function assertAllowedUpstream(
  target: ResolvedUpstream,
  allowed: ResolvedUpstream,
): void {
  const targetHost = target.hostname.toLowerCase();
  const allowedHost = allowed.hostname.toLowerCase();
  if (targetHost !== allowedHost || target.port !== allowed.port) {
    throw new Error("Upstream is not on the allowlist");
  }
}

export function isPreviewPortAllowed(
  port: number,
  allowlist: number[],
): boolean {
  return allowlist.includes(port);
}
