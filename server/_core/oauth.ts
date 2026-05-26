import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { sendWelcomeNotification } from "../routers/authEnhancements";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
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
      const isNewUser = !existingUser;

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // Send welcome notification for first-time sign-ups
      if (isNewUser) {
        const newUser = await db.getUserByOpenId(userInfo.openId);
        if (newUser) {
          sendWelcomeNotification(newUser).catch((err) =>
            console.warn("[OAuth] Welcome notification failed:", err)
          );
        }
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // For new users: redirect to onboarding wizard.
      // The frontend may have stored a post-login redirect in sessionStorage;
      // we pass a flag so the client-side router can pick it up.
      // For existing users who have completed onboarding, redirect normally.
      if (isNewUser) {
        // New user — send to parent onboarding by default.
        // If they arrived via a student invite link, the frontend sessionStorage
        // key "educhamp_post_login_redirect" will override this on the client side.
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
}
