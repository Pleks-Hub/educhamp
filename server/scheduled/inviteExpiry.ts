/**
 * inviteExpiry.ts — Scheduled heartbeat handler
 *
 * Runs daily (via Manus Heartbeat cron) to:
 *  1. Find all parentInviteTokens where status = 'pending' AND expiresAt < now()
 *  2. Mark them as 'expired'
 *  3. Create an in-app notification for each affected student prompting them to resend
 *
 * Endpoint: POST /api/scheduled/invite-expiry
 * Auth:     sdk.authenticateRequest → user.isCron === true
 */

import type { Request, Response } from "express";
import { getDb } from "../db";
import { parentInviteTokens, userNotifications } from "../../drizzle/schema";
import { eq, and, lt, inArray } from "drizzle-orm";
import { sdk } from "../_core/sdk";

export async function inviteExpiryHandler(req: Request, res: Response) {
  try {
    // ── Auth: cron-only ────────────────────────────────────────────────────────
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "DB unavailable" });
    }

    const now = new Date();

    // ── 1. Find all expired-but-still-pending tokens ───────────────────────────
    const expiredTokens = await db
      .select({
        id: parentInviteTokens.id,
        studentId: parentInviteTokens.studentId,
        parentEmail: parentInviteTokens.parentEmail,
        studentName: parentInviteTokens.studentName,
      })
      .from(parentInviteTokens)
      .where(
        and(
          eq(parentInviteTokens.status, "pending"),
          lt(parentInviteTokens.expiresAt, now)
        )
      );

    if (expiredTokens.length === 0) {
      console.log("[InviteExpiry] No expired pending tokens found.");
      return res.json({ ok: true, expired: 0, notified: 0 });
    }

    // ── 2. Mark all found tokens as 'expired' ─────────────────────────────────
    const tokenIds = expiredTokens.map((t) => t.id);
    await db
      .update(parentInviteTokens)
      .set({ status: "expired" })
      .where(inArray(parentInviteTokens.id, tokenIds));

    // ── 3. Create in-app notifications for each affected student ──────────────
    // Deduplicate: one notification per student (a student may have multiple expired tokens)
    // Deduplicate: one notification per student
    const studentMap: Record<number, { parentEmail: string; studentName: string }> = {};
    for (const token of expiredTokens) {
      if (!studentMap[token.studentId]) {
        studentMap[token.studentId] = {
          parentEmail: token.parentEmail ?? "",
          studentName: token.studentName ?? "Student",
        };
      }
    }

    let notified = 0;
    for (const studentIdStr of Object.keys(studentMap)) {
      const studentId = Number(studentIdStr);
      const info = studentMap[studentId];
      try {
        await db.insert(userNotifications).values({
          userId: studentId,
          type: "invite_expired",
          title: "Parent Invitation Expired",
          message: `Your invitation to ${info.parentEmail} has expired. Please resend the invitation from your dashboard to continue the enrollment process.`,
          isRead: false,
          metadata: JSON.stringify({
            parentEmail: info.parentEmail,
            expiredAt: now.toISOString(),
            action: "resend_invite",
          }),
        });
        notified++;
      } catch (notifErr) {
        // Non-fatal: log but continue processing other students
        console.error(`[InviteExpiry] Failed to notify student ${studentId}:`, notifErr);
      }
    }

    console.log(
      `[InviteExpiry] Marked ${tokenIds.length} token(s) expired, notified ${notified} student(s).`
    );

    return res.json({
      ok: true,
      expired: tokenIds.length,
      notified,
      processedAt: now.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[InviteExpiry] Handler error:", message);
    return res.status(500).json({
      error: message,
      stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
