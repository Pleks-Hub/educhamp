/**
 * parentBillingReminder.ts — Scheduled heartbeat handler
 *
 * Runs every 12 hours (via Manus Heartbeat cron) to:
 *  1. Find parents who received a "billing_setup_needed" notification ≥ 48h ago
 *  2. Check if they still haven't completed billing (no active subscription)
 *  3. Re-send a reminder email + in-app notification
 *  4. De-duplicate: only send one reminder per 48h window
 *
 * Endpoint: POST /api/scheduled/parent-billing-reminder
 * Auth:     sdk.authenticateRequest → user.isCron === true
 */
import type { Request, Response } from "express";
import { getDb } from "../db";
import { sdk } from "../_core/sdk";
import { sendEmail } from "../emailService";
import { buildParentBillingNotificationEmail } from "../emailTemplates/parentBillingNotification";
import { userNotifications, subscriptions, users } from "../../drizzle/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { BRAND } from "../emailTemplates/emailBase";

const REMINDER_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours
const DEDUP_WINDOW_MS = 48 * 60 * 60 * 1000; // Don't re-send within 48h of last reminder

// In-memory dedup (persists within same Cloud Run instance)
const sentCache = new Map<string, number>();

function wasRecentlySent(parentId: number): boolean {
  const lastSent = sentCache.get(`billing-reminder-${parentId}`);
  if (!lastSent) return false;
  return (Date.now() - lastSent) < DEDUP_WINDOW_MS;
}

function markSent(parentId: number): void {
  sentCache.set(`billing-reminder-${parentId}`, Date.now());
}

export async function parentBillingReminderHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) {
      return res.json({ ok: true, skipped: "no-db" });
    }

    // Find all "billing_setup_needed" notifications that were created ≥ 48h ago
    const cutoffDate = new Date(Date.now() - REMINDER_THRESHOLD_MS);

    const pendingNotifications = await db
      .select({
        id: userNotifications.id,
        userId: userNotifications.userId,
        metadata: userNotifications.metadata,
        createdAt: userNotifications.createdAt,
      })
      .from(userNotifications)
      .where(
        and(
          eq(userNotifications.type, "billing_setup_needed"),
          lte(userNotifications.createdAt, cutoffDate)
        )
      );

    let reminded = 0;
    let skipped = 0;

    for (const notif of pendingNotifications) {
      const parentId = notif.userId;

      // Dedup check
      if (wasRecentlySent(parentId)) {
        skipped++;
        continue;
      }

      // Check if parent still has no active subscription
      const [parentSub] = await db
        .select({ id: subscriptions.id, status: subscriptions.status })
        .from(subscriptions)
        .where(eq(subscriptions.userId, parentId))
        .limit(1);

      if (parentSub && (parentSub.status === "active" || parentSub.status === "trialing")) {
        // Parent has completed billing — clean up the notification
        skipped++;
        continue;
      }

      // Get parent info for email
      const [parent] = await db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, parentId))
        .limit(1);

      if (!parent || !parent.email) {
        skipped++;
        continue;
      }

      // Parse metadata to get student name
      let studentName = "Your student";
      try {
        const meta = JSON.parse(notif.metadata || "{}");
        if (meta.studentName) studentName = meta.studentName;
      } catch { /* ignore */ }

      // Send reminder email
      const emailData = buildParentBillingNotificationEmail({
        studentName,
        parentName: parent.name ?? undefined,
        billingSetupUrl: `${BRAND.websiteUrl}/billing/setup`,
        isReminder: true,
      });

      await sendEmail({
        to: parent.email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        templateName: "parent-billing-reminder",
        referenceId: `billing-reminder-${parentId}-${Date.now()}`,
      }).catch((err) => {
        console.error(`[BillingReminder] Failed to send email to parent ${parentId}:`, err);
      });

      // Send in-app reminder notification
      await db.insert(userNotifications).values({
        userId: parentId,
        type: "billing_reminder",
        title: "Reminder: Complete Billing Setup",
        message: `${studentName} is still waiting for account access. Please complete billing setup to activate their EduChamp account.`,
        isRead: false,
        metadata: JSON.stringify({
          studentName,
          action: "billing_setup",
          isReminder: true,
          originalNotificationId: notif.id,
        }),
      });

      markSent(parentId);
      reminded++;
    }

    console.log(`[BillingReminder] Processed: ${reminded} reminded, ${skipped} skipped`);
    return res.json({ ok: true, reminded, skipped, total: pendingNotifications.length });
  } catch (err: any) {
    console.error("[BillingReminder] Handler error:", err);
    return res.status(500).json({
      error: err.message || "Internal error",
      stack: err.stack,
      context: { url: req.url, taskUid: (req as any).user?.taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
