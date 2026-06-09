/**
 * studentInviteAutoExpire.ts — Scheduled heartbeat handler
 *
 * Runs daily (via Manus Heartbeat cron) to:
 *  1. Find all studentInviteTokens where status = 'pending' AND expiresAt < now()
 *  2. Mark them as 'expired' in the database
 *  3. Create an in-app notification for the parent
 *
 * Endpoint: POST /api/scheduled/student-invite-auto-expire
 * Auth:     sdk.authenticateRequest → user.isCron === true
 */
import type { Request, Response } from "express";
import { getDb } from "../db";
import { studentInviteTokens, userNotifications } from "../../drizzle/schema";
import { eq, and, lt } from "drizzle-orm";
import { sdk } from "../_core/sdk";

export async function studentInviteAutoExpireHandler(req: Request, res: Response) {
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

    // ── 1. Find all pending student invites that have expired ──────────────────
    const expiredInvites = await db
      .select({
        id: studentInviteTokens.id,
        parentId: studentInviteTokens.parentId,
        childName: studentInviteTokens.childName,
        childEmail: studentInviteTokens.childEmail,
        expiresAt: studentInviteTokens.expiresAt,
      })
      .from(studentInviteTokens)
      .where(
        and(
          eq(studentInviteTokens.status, "pending"),
          lt(studentInviteTokens.expiresAt, now)
        )
      );

    if (expiredInvites.length === 0) {
      console.log("[StudentInviteAutoExpire] No expired invites to clean up.");
      return res.json({ ok: true, expired: 0 });
    }

    // ── 2. Mark each as 'expired' and notify parent ────────────────────────────
    let expiredCount = 0;
    for (const invite of expiredInvites) {
      await db
        .update(studentInviteTokens)
        .set({ status: "expired" })
        .where(eq(studentInviteTokens.id, invite.id));

      // Create in-app notification for the parent
      await db.insert(userNotifications).values({
        userId: invite.parentId,
        type: "invite_expired",
        title: "Student Invite Expired",
        message: `Your invite to ${invite.childName || invite.childEmail || "your child"} has expired. You can resend a new invite from your Parent Dashboard.`,
        isRead: false,
        metadata: JSON.stringify({
          inviteId: invite.id,
          childName: invite.childName,
          childEmail: invite.childEmail,
          expiredAt: invite.expiresAt.toISOString(),
          action: "resend_invite",
        }),
      });

      expiredCount++;
    }

    console.log(
      `[StudentInviteAutoExpire] Marked ${expiredCount} invite(s) as expired.`
    );
    return res.json({
      ok: true,
      expired: expiredCount,
      processedAt: now.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[StudentInviteAutoExpire] Handler error:", message);
    return res.status(500).json({
      error: message,
      stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
