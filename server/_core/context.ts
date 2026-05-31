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

  return {
    req: opts.req,
    res: opts.res,
    user,
    sessionToken,
  };
}
