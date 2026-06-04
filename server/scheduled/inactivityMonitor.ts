/**
 * inactivityMonitor.ts — Scheduled heartbeat handler
 *
 * Runs daily (via Manus Heartbeat cron) to:
 *  1. Find students inactive for 7, 14, and 30 days
 *  2. Send tier-appropriate notification emails to student + linked parent
 *  3. Record sent notifications to prevent duplicates within the window
 *  4. Flag 30-day inactive students in adminAuditLog for intervention
 *
 * Endpoint: POST /api/scheduled/inactivity-monitor
 * Auth:     sdk.authenticateRequest → user.isCron === true
 *
 * Tiers:
 *  - 7-day:  first reminder
 *  - 14-day: second reminder (escalation)
 *  - 30-day: escalation + admin flag
 */
import type { Request, Response } from "express";
import {
  getInactiveStudents,
  hasInactivityNotificationBeenSent,
  recordInactivityNotification,
  getDb,
} from "../db";
import { sdk } from "../_core/sdk";
import { sendEmail } from "../emailService";
import { buildInactivityEmail } from "../emailTemplates/inactivityNotification";
import { adminAuditLog, parentChildren, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/** Notification tiers to process in order. */
const TIERS: Array<{
  type: "7day" | "14day" | "30day";
  minDays: number;
  maxDays?: number;
  windowDays: number; // de-dup window: don't re-send within this many days
}> = [
  { type: "7day",  minDays: 7,  maxDays: 13, windowDays: 7 },
  { type: "14day", minDays: 14, maxDays: 29, windowDays: 7 },
  { type: "30day", minDays: 30,              windowDays: 7 },
];

export async function inactivityMonitorHandler(req: Request, res: Response) {
  try {
    // ── Auth: cron-only ────────────────────────────────────────────────────────
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "DB unavailable" });

    const origin = process.env.VITE_FRONTEND_FORGE_API_URL
      ? "https://educhamp.co"
      : "https://educhamp.co";

    const results: Record<string, { processed: number; emailsSent: number }> = {};

    for (const tier of TIERS) {
      const students = await getInactiveStudents(tier.minDays, tier.maxDays);
      let processed = 0;
      let emailsSent = 0;

      for (const student of students) {
        if (!student.email) continue;

        const lastActive = student.lastActiveAt ?? student.lastSignedIn;
        const inactiveDays = Math.floor(
          (Date.now() - new Date(lastActive).getTime()) / 86_400_000
        );

        // ── De-dup: skip if already notified this window ──────────────────────
        const alreadySent = await hasInactivityNotificationBeenSent(
          student.id,
          tier.type,
          tier.windowDays
        );
        if (alreadySent) continue;

        processed++;

        // ── Email the student ─────────────────────────────────────────────────
        try {
          const studentEmail = buildInactivityEmail({
            studentName: student.name ?? "Student",
            inactiveDays,
            lastActiveDate: new Date(lastActive).toLocaleDateString("en-US", {
              year: "numeric", month: "long", day: "numeric",
            }),
            resumeUrl: `${origin}/courses`,
            recipientType: "student",
          });
          await sendEmail({
            to: student.email,
            subject: studentEmail.subject,
            html: studentEmail.html,
            text: studentEmail.text,
            templateName: "inactivityReminder",
            referenceId: `inactivity-${tier.type}-student-${student.id}`,
          });
          await recordInactivityNotification(
            student.id, tier.type, "student", student.email, inactiveDays
          );
          emailsSent++;
        } catch (err) {
          console.error(`[InactivityMonitor] Failed to email student ${student.id}:`, err);
        }

        // ── Email linked parents ──────────────────────────────────────────────
        try {
          const parentLinks = await db
            .select({ parentId: parentChildren.parentId })
            .from(parentChildren)
            .where(eq(parentChildren.childId, student.id));

          for (const link of parentLinks) {
            const parentRows = await db
              .select({ id: users.id, name: users.name, email: users.email })
              .from(users)
              .where(eq(users.id, link.parentId))
              .limit(1);
            const parent = parentRows[0];
            if (!parent?.email) continue;

            const parentEmail = buildInactivityEmail({
              studentName: student.name ?? "Student",
              inactiveDays,
              lastActiveDate: new Date(lastActive).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
              }),
              resumeUrl: `${origin}/parent`,
              recipientType: "parent",
              parentName: parent.name ?? undefined,
            });
            await sendEmail({
              to: parent.email,
              subject: parentEmail.subject,
              html: parentEmail.html,
              text: parentEmail.text,
              templateName: "inactivityReminderParent",
              referenceId: `inactivity-${tier.type}-parent-${parent.id}-student-${student.id}`,
            });
            await recordInactivityNotification(
              student.id, tier.type, "parent", parent.email, inactiveDays
            );
            emailsSent++;
          }
        } catch (err) {
          console.error(`[InactivityMonitor] Failed to email parents for student ${student.id}:`, err);
        }

        // ── 30-day: flag for admin intervention ───────────────────────────────
        if (tier.type === "30day") {
          try {
            await db.insert(adminAuditLog).values({
              adminId: 0, // system action
              action: "user.inactivity_flag_30day",
              targetType: "user",
              targetId: student.id,
              details: {
                inactiveDays,
                lastActive: new Date(lastActive).toISOString(),
                flaggedAt: new Date().toISOString(),
              },
            });
          } catch (err) {
            console.error(`[InactivityMonitor] Failed to flag student ${student.id} for admin:`, err);
          }
        }
      }

      results[tier.type] = { processed, emailsSent };
      console.log(`[InactivityMonitor] ${tier.type}: processed=${processed}, emailsSent=${emailsSent}`);
    }

    return res.json({
      ok: true,
      results,
      processedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[InactivityMonitor] Handler error:", message);
    return res.status(500).json({
      error: message,
      stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
