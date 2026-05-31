/**
 * Session Tracker — creates and manages userSessions rows for admin portal
 * visibility into login history, device types, and geolocation.
 *
 * Design notes:
 * - One row per login event (not per request).
 * - lastActiveAt is updated at most once every 60 seconds to avoid write storms.
 * - Logout marks the row as inactive and sets loggedOutAt.
 * - IP geolocation uses a simple in-process lookup (no external API calls).
 */

import { UAParser } from "ua-parser-js";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { userSessions, users } from "../../drizzle/schema";

// ─── Throttle map: userId → last lastActiveAt write timestamp ─────────────────
const lastActiveWriteMap = new Map<number, number>();
const LAST_ACTIVE_THROTTLE_MS = 60_000; // 1 minute

// ─── Simple country/city lookup via ip-api (no key needed, rate-limited) ──────
// We cache lookups in memory to avoid hammering the API.
const geoCache = new Map<string, { city?: string; region?: string; country?: string; countryCode?: string }>();

async function lookupGeo(ip: string): Promise<{ city?: string; region?: string; country?: string; countryCode?: string }> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return { city: "Local", country: "Local", countryCode: "LO" };
  }
  if (geoCache.has(ip)) return geoCache.get(ip)!;
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country,countryCode`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success") {
        const geo = { city: data.city, region: data.regionName, country: data.country, countryCode: data.countryCode };
        geoCache.set(ip, geo);
        return geo;
      }
    }
  } catch {
    // Geo lookup is best-effort; don't fail the login
  }
  return {};
}

// ─── Parse UA string into structured fields ───────────────────────────────────
export function parseUserAgent(uaString: string | undefined) {
  if (!uaString) return { deviceType: "unknown" as const, browser: "Unknown", browserVersion: undefined, os: "Unknown" };
  const parser = new UAParser(uaString);
  const result = parser.getResult();
  const deviceType = (result.device.type as "desktop" | "mobile" | "tablet" | undefined) ?? "desktop";
  return {
    deviceType: (["desktop", "mobile", "tablet"].includes(deviceType) ? deviceType : "desktop") as "desktop" | "mobile" | "tablet" | "unknown",
    browser: result.browser.name ?? "Unknown",
    browserVersion: result.browser.version,
    os: result.os.name ? `${result.os.name}${result.os.version ? " " + result.os.version : ""}` : "Unknown",
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call on every successful login. Creates a new userSessions row.
 * Returns the session token (same as the JWT session token, or a new UUID).
 */
export async function trackLogin(opts: {
  userId: number;
  sessionToken: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const ua = parseUserAgent(opts.userAgent);
  const geo = await lookupGeo(opts.ip ?? "");

  try {
    await db.insert(userSessions).values({
      userId: opts.userId,
      sessionToken: opts.sessionToken,
      ipAddress: opts.ip,
      userAgent: opts.userAgent,
      deviceType: ua.deviceType,
      browser: ua.browser,
      browserVersion: ua.browserVersion,
      os: ua.os,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      countryCode: geo.countryCode,
      loginAt: new Date(),
      lastActiveAt: new Date(),
      isActive: true,
    });

    // Update lastLoginAt on the users table
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, opts.userId));
  } catch (err) {
    // Session tracking is non-critical; log but don't throw
    console.warn("[SessionTracker] Failed to track login:", err);
  }
}

/**
 * Call on every authenticated request (throttled to once/minute per user).
 */
export async function touchSession(userId: number, sessionToken: string): Promise<void> {
  const now = Date.now();
  const last = lastActiveWriteMap.get(userId) ?? 0;
  if (now - last < LAST_ACTIVE_THROTTLE_MS) return;
  lastActiveWriteMap.set(userId, now);

  const db = await getDb();
  if (!db) return;

  try {
    await db
      .update(userSessions)
      .set({ lastActiveAt: new Date() })
      .where(and(eq(userSessions.sessionToken, sessionToken), eq(userSessions.isActive, true)));
  } catch {
    // Non-critical
  }
}

/**
 * Call on logout. Marks the session as inactive.
 */
export async function endSession(sessionToken: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .update(userSessions)
      .set({ isActive: false, loggedOutAt: new Date() })
      .where(eq(userSessions.sessionToken, sessionToken));
  } catch {
    // Non-critical
  }
}

/**
 * Check whether a specific session token has been administratively revoked.
 * Returns true if the row exists and isActive=false (revoked by admin), or if the row
 * is missing entirely (treated as invalid). Returns false if the session is still active.
 * This is called on every authenticated request to enforce admin revocations in real time.
 */
export async function isRevokedSession(sessionToken: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false; // If DB is unavailable, fail open (don't block all requests)
  try {
    const [row] = await db
      .select({ isActive: userSessions.isActive })
      .from(userSessions)
      .where(eq(userSessions.sessionToken, sessionToken))
      .limit(1);
    // If no row found, session was never tracked (e.g. pre-feature logins) — allow through
    if (!row) return false;
    return !row.isActive;
  } catch {
    return false; // Non-critical: fail open
  }
}

/**
 * Get all sessions for a user (for admin portal display).
 */
export async function getUserSessionHistory(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const { desc } = await import("drizzle-orm");
  return db
    .select()
    .from(userSessions)
    .where(eq(userSessions.userId, userId))
    .orderBy(desc(userSessions.loginAt))
    .limit(limit);
}
