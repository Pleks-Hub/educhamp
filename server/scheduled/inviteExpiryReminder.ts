/**
 * inviteExpiryReminder.ts — Scheduled heartbeat handler
 *
 * Runs daily (via Manus Heartbeat cron) to:
 *  1. Find all studentInviteTokens where status = 'pending' AND expiresAt is within 24-48 hours
 *  2. Email the parent reminding them the invite is about to expire
 *  3. Create an in-app notification for the parent
 *
 * Endpoint: POST /api/scheduled/invite-expiry-reminder
 * Auth:     sdk.authenticateRequest → user.isCron === true
 */
import type { Request, Response } from "express";
import { getDb } from "../db";
import { studentInviteTokens, users, userNotifications, userProfiles } from "../../drizzle/schema";
import { eq, and, gt, lt, isNull, sql } from "drizzle-orm";
import { sdk } from "../_core/sdk";
import { sendEmail } from "../emailService";

function buildExpiryReminderEmail(opts: {
  parentName: string;
  childName: string;
  childEmail: string;
  expiresAt: Date;
  resendUrl: string;
}): { html: string; text: string } {
  const expiryStr = opts.expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:#fef3c7;border-radius:50%;width:48px;height:48px;line-height:48px;font-size:24px;">⏰</div>
      </div>
      <h1 style="color:#0f172a;font-size:20px;text-align:center;margin:0 0 8px;">Invite Expiring Soon</h1>
      <p style="color:#64748b;text-align:center;margin:0 0 24px;font-size:14px;">
        Your student invite is about to expire
      </p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">
        Hi ${opts.parentName},
      </p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">
        The invitation you sent to <strong>${opts.childName || opts.childEmail}</strong> to join EduChamp will expire on <strong>${expiryStr}</strong>.
      </p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">
        If they haven't accepted yet, you can resend the invite from your Parent Dashboard to give them a fresh link.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${opts.resendUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
          Go to Parent Dashboard
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px;text-align:center;margin-top:24px;">
        If the student has already accepted, you can ignore this email.
      </p>
    </div>
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:16px;">
      EduChamp — Helping every student succeed
    </p>
  </div>
</body>
</html>`;

  const text = `Hi ${opts.parentName},

The invitation you sent to ${opts.childName || opts.childEmail} to join EduChamp will expire on ${expiryStr}.

If they haven't accepted yet, you can resend the invite from your Parent Dashboard: ${opts.resendUrl}

If the student has already accepted, you can ignore this email.

— EduChamp`;

  return { html, text };
}

export async function inviteExpiryReminderHandler(req: Request, res: Response) {
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
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // ── 1. Find pending invites expiring in 24-48 hours that haven't been reminded yet ──
    const expiringInvites = await db
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
          gt(studentInviteTokens.expiresAt, in24h),
          lt(studentInviteTokens.expiresAt, in48h),
          isNull(studentInviteTokens.reminderSentAt) // don't double-send
        )
      );

    if (expiringInvites.length === 0) {
      console.log("[InviteExpiryReminder] No invites expiring in 24-48h.");
      return res.json({ ok: true, reminded: 0 });
    }

    // ── 2. Group by parent and check notification preferences ─────────────────
    const parentIds = Array.from(new Set(expiringInvites.map((i) => i.parentId)));
    const parentRows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(sql`${users.id} IN (${sql.join(parentIds.map(id => sql`${id}`), sql`, `)})`);

    const parentMap = new Map(parentRows.map((p) => [p.id, p]));

    // Check notification preferences — skip parents who opted out
    const parentPrefs = await db
      .select({ userId: userProfiles.userId, inviteRemindersEnabled: userProfiles.inviteRemindersEnabled })
      .from(userProfiles)
      .where(sql`${userProfiles.userId} IN (${sql.join(parentIds.map(id => sql`${id}`), sql`, `)})`);
    const prefsMap = new Map(parentPrefs.map((p) => [p.userId, p.inviteRemindersEnabled]));

    // Determine the base URL from the request origin or use the production domain
    const baseUrl = "https://educhamp.co";

    let reminded = 0;
    for (const invite of expiringInvites) {
      const parent = parentMap.get(invite.parentId);
      if (!parent || !parent.email) continue;
      // Respect parent's notification preference
      const remindersEnabled = prefsMap.get(invite.parentId) ?? true;
      if (!remindersEnabled) {
        // Mark as reminded so we don't re-check next run
        await db.update(studentInviteTokens).set({ reminderSentAt: now }).where(eq(studentInviteTokens.id, invite.id));
        continue;
      }

      const { html, text } = buildExpiryReminderEmail({
        parentName: parent.name || "Parent",
        childName: invite.childName || "",
        childEmail: invite.childEmail || "your child",
        expiresAt: invite.expiresAt,
        resendUrl: `${baseUrl}/parent`,
      });

      try {
        await sendEmail({
          to: parent.email,
          subject: `⏰ Invite expiring soon for ${invite.childName || invite.childEmail || "your child"}`,
          html,
          text,
          templateName: "invite-expiry-reminder",
        });

        // Also create an in-app notification
        await db.insert(userNotifications).values({
          userId: invite.parentId,
          type: "invite_expiring",
          title: "Student Invite Expiring Soon",
          message: `Your invite to ${invite.childName || invite.childEmail || "your child"} expires in less than 24 hours. Resend from your dashboard if they haven't accepted.`,
          isRead: false,
          metadata: JSON.stringify({
            inviteId: invite.id,
            childName: invite.childName,
            expiresAt: invite.expiresAt.toISOString(),
            action: "resend_invite",
          }),
        });

        // Mark reminder as sent
        await db.update(studentInviteTokens).set({ reminderSentAt: now }).where(eq(studentInviteTokens.id, invite.id));
        reminded++;
      } catch (emailErr) {
        console.error(
          `[InviteExpiryReminder] Failed to email parent ${parent.email}:`,
          emailErr
        );
      }
    }

    console.log(
      `[InviteExpiryReminder] Sent ${reminded} reminder(s) for ${expiringInvites.length} expiring invite(s).`
    );
    return res.json({
      ok: true,
      reminded,
      total: expiringInvites.length,
      processedAt: now.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[InviteExpiryReminder] Handler error:", message);
    return res.status(500).json({
      error: message,
      stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
