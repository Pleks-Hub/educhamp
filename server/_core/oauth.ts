import { COOKIE_NAME, ONE_YEAR_MS, PENDING_2FA_COOKIE_NAME } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk, createPending2FAToken, verifyPending2FAToken } from "./sdk";
import { sendWelcomeNotification } from "../routers/authEnhancements";
import { trackLogin } from "../services/sessionTracker";
import speakeasy from "speakeasy";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // ─── OAuth callback ────────────────────────────────────────────────────────
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Check if this is a new user before upserting
      const existingUser = await db.getUserByOpenId(userInfo.openId);
      let isNewUser = !existingUser;

      // ── Account linking for parent-enrolled students ──────────────────────
      // If this OAuth openId is new but the email matches a parent-enrolled student
      // (who has a synthetic child_xxx openId), link the accounts by updating the
      // existing student's openId to the OAuth openId so they can use OAuth going forward.
      if (isNewUser && userInfo.email) {
        const existingByEmail = await db.getUserByEmail(userInfo.email);
        if (existingByEmail && existingByEmail.openId.startsWith("child_")) {
          // Link: update the parent-enrolled student's openId to the OAuth openId
          const dbConn = await db.getDb();
          if (dbConn) {
            const { users } = await import("../../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            await dbConn.update(users).set({
              openId: userInfo.openId,
              loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
              name: userInfo.name || existingByEmail.name,
              lastSignedIn: new Date(),
            }).where(eq(users.id, existingByEmail.id));
            isNewUser = false; // They already have an account, just linked
            console.log(`[OAuth] Linked parent-enrolled student ${existingByEmail.email} (id=${existingByEmail.id}) to OAuth openId ${userInfo.openId}`);
          }
        } else {
          // Normal new user flow
          await db.upsertUser({
            openId: userInfo.openId,
            name: userInfo.name || null,
            email: userInfo.email ?? null,
            loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
            lastSignedIn: new Date(),
          });
        }
      } else {
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: new Date(),
        });
      }

      // Send welcome notification for first-time sign-ups
      if (isNewUser) {
        const newUser = await db.getUserByOpenId(userInfo.openId);
        if (newUser) {
          sendWelcomeNotification(newUser).catch((err) =>
            console.warn("[OAuth] Welcome notification failed:", err)
          );
        }
      }

      // ── 2FA gate ─────────────────────────────────────────────────────────
      // Check if the user has 2FA enabled. New users skip this gate because
      // they cannot have 2FA set up yet.
      if (!isNewUser) {
        const freshUser = await db.getUserByOpenId(userInfo.openId);
        if (freshUser) {
          const twoFactor = await db.getTwoFactor(freshUser.id);
          if (twoFactor?.isEnabled) {
            // Issue a short-lived pending-2FA cookie and redirect to the challenge page
            const pendingToken = await createPending2FAToken(userInfo.openId);
            const cookieOptions = getSessionCookieOptions(req);
            res.cookie(PENDING_2FA_COOKIE_NAME, pendingToken, {
              ...cookieOptions,
              maxAge: 5 * 60 * 1000, // 5 minutes
            });
            res.redirect(302, "/verify-2fa");
            return;
          }
        }
      }

      // ── Normal session (no 2FA required) ─────────────────────────────────
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Track session for admin portal (best-effort, non-blocking)
      const freshUserForTracking = await db.getUserByOpenId(userInfo.openId);
      if (freshUserForTracking) {
        const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket?.remoteAddress;
        trackLogin({ userId: freshUserForTracking.id, sessionToken, ip, userAgent: req.headers["user-agent"] }).catch(() => {});
      }

      // For new users: redirect to onboarding wizard.
      if (isNewUser) {
        res.redirect(302, "/onboarding/parent");
      } else {
        // Check if onboarding is complete
        const freshUser = await db.getUserByOpenId(userInfo.openId);
        if (freshUser) {
          const profile = await db.getUserProfile(freshUser.id);
          if (!profile?.onboardingCompleted) {
            const isStudent = freshUser.accountType === "student";
            res.redirect(302, isStudent ? "/onboarding/student" : "/onboarding/parent");
            return;
          }
        }
        res.redirect(302, "/");
      }
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // ─── 2FA challenge endpoint ────────────────────────────────────────────────
  // Called from the /verify-2fa page after the user enters their TOTP code.
  app.post("/api/auth/verify-2fa-challenge", async (req: Request, res: Response) => {
    const cookies = req.headers.cookie ?? "";
    const parsed = Object.fromEntries(
      cookies.split(";").map((c) => c.trim().split("=").map(decodeURIComponent))
    );
    const pendingToken = parsed[PENDING_2FA_COOKIE_NAME];
    const openId = await verifyPending2FAToken(pendingToken);

    if (!openId) {
      res.status(401).json({ error: "Pending 2FA session expired or invalid. Please sign in again." });
      return;
    }

    const { code } = req.body as { code?: string };
    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "TOTP code is required." });
      return;
    }

    const user = await db.getUserByOpenId(openId);
    if (!user) {
      res.status(401).json({ error: "User not found." });
      return;
    }

    const twoFactor = await db.getTwoFactor(user.id);
    if (!twoFactor?.isEnabled) {
      res.status(400).json({ error: "2FA is not enabled for this account." });
      return;
    }

    // Accept TOTP code (6 digits) or backup code (10 chars)
    let isValid = false;
    if (code.length === 6) {
      isValid = speakeasy.totp.verify({
        token: code,
        secret: twoFactor.secret,
        encoding: "base32",
        window: 1,
      });
    } else {
      // Backup code
      isValid = !!(await db.consumeBackupCode(user.id, code));
    }

    if (!isValid) {
      res.status(401).json({ error: "Invalid code. Please try again." });
      return;
    }

    // Code is valid — issue a full session cookie and clear the pending cookie
    const sessionToken = await sdk.createSessionToken(openId, {
      name: user.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    // Clear the pending-2FA cookie
    res.clearCookie(PENDING_2FA_COOKIE_NAME, { ...cookieOptions });

    // Track session for admin portal (best-effort, non-blocking)
    const ip2fa = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket?.remoteAddress;
    trackLogin({ userId: user.id, sessionToken, ip: ip2fa, userAgent: req.headers["user-agent"] }).catch(() => {});

    res.json({ success: true });
  });
}
