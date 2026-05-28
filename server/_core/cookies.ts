import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

/**
 * Detect Safari browsers from User-Agent.
 * Safari has a known bug with SameSite=None cookies (Safari 12/13 treat them
 * as SameSite=Strict). Modern Safari (15+) handles it correctly.
 * We use SameSite=Lax for Safari to avoid the cookie being dropped entirely.
 */
function isSafariBrowser(req: Request): boolean {
  const ua = req.headers["user-agent"] ?? "";
  // Safari UA contains "Safari" but NOT "Chrome" or "Chromium" (Chrome on iOS also has Safari in UA)
  // We specifically target Safari desktop and iOS Safari
  return /Safari\//.test(ua) && !/Chrome\/|Chromium\/|CriOS\/|FxiOS\/|EdgA\//.test(ua);
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);

  // Safari has a known bug with SameSite=None — use Lax for Safari browsers.
  // For all other browsers on HTTPS, use None to allow cross-origin requests.
  // On HTTP (local dev), use Lax since SameSite=None requires Secure=true.
  let sameSite: CookieOptions["sameSite"];
  if (!secure) {
    // Local dev over HTTP — Lax is the safest option
    sameSite = "lax";
  } else if (isSafariBrowser(req)) {
    // Safari ITP compatibility — use Lax to prevent cookie being dropped
    sameSite = "lax";
  } else {
    // All other modern browsers on HTTPS
    sameSite = "none";
  }

  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure,
  };
}
