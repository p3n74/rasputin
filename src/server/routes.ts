export function isRasputinSpaPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/_rasputin" ||
    pathname === "/_rasputin/" ||
    pathname === "/_rasputin/status"
  );
}

export function isRasputinPath(pathname: string): boolean {
  return (
    pathname === "/healthz" ||
    pathname === "/login" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_rasputin")
  );
}

export function isViteDevPath(pathname: string): boolean {
  if (pathname.startsWith("/_rasputin/api")) {
    return false;
  }
  return (
    pathname.startsWith("/_rasputin") ||
    pathname.startsWith("/@") ||
    pathname.startsWith("/src/") ||
    pathname.startsWith("/node_modules") ||
    pathname.startsWith("/@id") ||
    pathname.startsWith("/@fs")
  );
}

export function requestPathname(url = "/"): string {
  try {
    return new URL(url, "http://rasputin.local").pathname;
  } catch {
    return "/";
  }
}

export function wantsHtml(accept: string | undefined): boolean {
  if (!accept) {
    return false;
  }
  return accept.includes("text/html");
}
