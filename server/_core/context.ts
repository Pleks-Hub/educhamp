import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { touchSession, isRevokedSession } from "../services/sessionTracker";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  sessionToken: string | null;
  /** When impersonating, this holds the real admin user so admin procedures still work */
  realUser: User | null;
  /** True if the current request is operating under impersonation */
  isImpersonating: boolean;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Extract the raw session token so we can pass it to session tracking helpers.
  const cookies = parseCookieHeader(opts.req.headers.cookie ?? "");
  const sessionToken = cookies[COOKIE_NAME] ?? null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Enforce admin-revoked sessions: if the session was administratively revoked,
  // treat the request as unauthenticated even if the JWT is still valid.
  if (user && sessionToken) {
    const revoked = await isRevokedSession(sessionToken).catch(() => false);
    if (revoked) {
      user = null;
    } else {
      // Throttled lastActiveAt update — best-effort, non-blocking.
      touchSession(user.id, sessionToken).catch(() => {});
    }
  }

  // ─── Impersonation: swap ctx.user to the impersonated user ─────────────────
  let realUser: User | null = null;
  let isImpersonating = false;

  const impersonationToken = opts.req.headers["x-impersonation-token"] as string | undefined;

  if (user && user.role === "admin" && impersonationToken) {
    // Validate the impersonation token and swap user
    try {
      const { getDb } = await import("../db");
      const { adminImpersonationSessions, users } = await import("../../drizzle/schema");
      const { eq, and, isNull, gt } = await import("drizzle-orm");
      const db = await getDb();
      if (db) {
        const [session] = await db
          .select()
          .from(adminImpersonationSessions)
          .where(
            and(
              eq(adminImpersonationSessions.token, impersonationToken),
              eq(adminImpersonationSessions.adminId, user.id),
              isNull(adminImpersonationSessions.endedAt),
              gt(adminImpersonationSessions.expiresAt, new Date())
            )
          )
          .limit(1);

        if (session) {
          const [impersonatedUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, session.impersonatedUserId))
            .limit(1);

          if (impersonatedUser) {
            realUser = user; // Preserve the real admin
            user = impersonatedUser; // Swap to impersonated user
            isImpersonating = true;
          }
        }
      }
    } catch {
      // If impersonation validation fails, continue as the real admin
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    sessionToken,
    realUser,
    isImpersonating,
  };
}
