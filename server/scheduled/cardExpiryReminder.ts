/**
 * cardExpiryReminder.ts — Scheduled heartbeat handler
 *
 * Runs daily (via Manus Heartbeat cron) to:
 *  1. Find subscriptions with cards expiring within 30 days
 *  2. Send reminder emails to the parent (always) and the student (if age-appropriate, ≥ 13)
 *  3. De-duplicate: only send one reminder per card per 14-day window
 *
 * Endpoint: POST /api/scheduled/card-expiry-reminder
 * Auth:     sdk.authenticateRequest → user.isCron === true
 */
import type { Request, Response } from "express";
import { getExpiringCardSubscriptions, getDb } from "../db";
import { sdk } from "../_core/sdk";
import { sendEmail } from "../emailService";
import { buildCardExpiryEmail } from "../emailTemplates/cardExpiry";
import { parentChildren, users, userProfiles, adminAuditLog } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { BRAND } from "../emailTemplates/emailBase";

const DEDUP_WINDOW_DAYS = 14;
const AGE_APPROPRIATE_MIN = 13;

/** Calculate age from YYYY-MM-DD date string */
function calcAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// In-memory dedup map (persists across invocations within same Cloud Run instance)
// Key: `${userId}-${cardLast4}-${cardExpMonth}-${cardExpYear}`
// Value: last sent timestamp
const sentCache = new Map<string, number>();

function dedupKey(userId: number, cardLast4: string, expMonth: number, expYear: number) {
  return `${userId}-${cardLast4}-${expMonth}-${expYear}`;
}

function wasRecentlySent(key: string): boolean {
  const lastSent = sentCache.get(key);
  if (!lastSent) return false;
  const daysSince = (Date.now() - lastSent) / (1000 * 60 * 60 * 24);
  return daysSince < DEDUP_WINDOW_DAYS;
}

export async function cardExpiryReminderHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

    const expiringCards = await getExpiringCardSubscriptions(30);
    if (!expiringCards.length) {
      return res.json({ ok: true, sent: 0, skipped: "no expiring cards" });
    }

    let sentCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const billingUrl = `${BRAND.websiteUrl}/billing`;

    for (const card of expiringCards) {
      if (!card.cardLast4 || !card.cardExpMonth || !card.cardExpYear) {
        skippedCount++;
        continue;
      }

      // ── Send to the subscription owner (parent or student) ──
      const ownerKey = dedupKey(card.userId, card.cardLast4, card.cardExpMonth, card.cardExpYear);
      if (!wasRecentlySent(ownerKey) && card.userEmail) {
        try {
          const email = buildCardExpiryEmail({
            recipientName: card.userName ?? "there",
            cardBrand: card.cardBrand ?? "Card",
            cardLast4: card.cardLast4,
            cardExpMonth: card.cardExpMonth,
            cardExpYear: card.cardExpYear,
            billingUrl,
          });
          await sendEmail({
            to: card.userEmail,
            subject: email.subject,
            html: email.html,
            text: email.text,
            templateName: "card-expiry-reminder",
            referenceId: `sub-${card.subscriptionId}`,
          });
          sentCache.set(ownerKey, Date.now());
          sentCount++;
        } catch (err: any) {
          errors.push(`Failed to send to ${card.userEmail}: ${err.message}`);
        }
      } else {
        skippedCount++;
      }

      // ── If owner is a parent, also check if any linked students are age-appropriate ──
      if (card.userAccountType === "parent") {
        try {
          const children = await db
            .select({
              childId: parentChildren.childId,
            })
            .from(parentChildren)
            .where(eq(parentChildren.parentId, card.userId));

          for (const child of children) {
            // Check if student is age-appropriate
            const [demo] = await db
              .select({ dateOfBirth: userProfiles.dateOfBirth })
              .from(userProfiles)
              .where(eq(userProfiles.userId, child.childId))
              .limit(1);

            if (!demo?.dateOfBirth) continue;
            const age = calcAge(demo.dateOfBirth);
            if (age === null || age < AGE_APPROPRIATE_MIN) continue;

            // Get student email
            const [student] = await db
              .select({ email: users.email, name: users.name })
              .from(users)
              .where(eq(users.id, child.childId))
              .limit(1);

            if (!student?.email) continue;

            const studentKey = dedupKey(child.childId, card.cardLast4, card.cardExpMonth, card.cardExpYear);
            if (wasRecentlySent(studentKey)) continue;

            try {
              const email = buildCardExpiryEmail({
                recipientName: student.name ?? "there",
                cardBrand: card.cardBrand ?? "Card",
                cardLast4: card.cardLast4,
                cardExpMonth: card.cardExpMonth,
                cardExpYear: card.cardExpYear,
                billingUrl,
              });
              await sendEmail({
                to: student.email,
                subject: email.subject,
                html: email.html,
                text: email.text,
                templateName: "card-expiry-reminder-student",
                referenceId: `sub-${card.subscriptionId}-student-${child.childId}`,
              });
              sentCache.set(studentKey, Date.now());
              sentCount++;
            } catch (err: any) {
              errors.push(`Failed to send to student ${student.email}: ${err.message}`);
            }
          }
        } catch (err: any) {
          errors.push(`Failed to check children for user ${card.userId}: ${err.message}`);
        }
      }

      // ── If owner is a student, also notify their parent ──
      if (card.userAccountType === "student") {
        try {
          const [parentLink] = await db
            .select({ parentId: parentChildren.parentId })
            .from(parentChildren)
            .where(eq(parentChildren.childId, card.userId))
            .limit(1);

          if (parentLink) {
            const [parent] = await db
              .select({ email: users.email, name: users.name })
              .from(users)
              .where(eq(users.id, parentLink.parentId))
              .limit(1);

            if (parent?.email) {
              const parentKey = dedupKey(parentLink.parentId, card.cardLast4, card.cardExpMonth, card.cardExpYear);
              if (!wasRecentlySent(parentKey)) {
                try {
                  const email = buildCardExpiryEmail({
                    recipientName: parent.name ?? "there",
                    cardBrand: card.cardBrand ?? "Card",
                    cardLast4: card.cardLast4,
                    cardExpMonth: card.cardExpMonth,
                    cardExpYear: card.cardExpYear,
                    billingUrl,
                  });
                  await sendEmail({
                    to: parent.email,
                    subject: email.subject,
                    html: email.html,
                    text: email.text,
                    templateName: "card-expiry-reminder-parent",
                    referenceId: `sub-${card.subscriptionId}-parent-${parentLink.parentId}`,
                  });
                  sentCache.set(parentKey, Date.now());
                  sentCount++;
                } catch (err: any) {
                  errors.push(`Failed to send to parent ${parent.email}: ${err.message}`);
                }
              }
            }
          }
        } catch (err: any) {
          errors.push(`Failed to check parent for student ${card.userId}: ${err.message}`);
        }
      }
    }

    // Audit log
    try {
      await db.insert(adminAuditLog).values({
        adminId: 0, // system action
        action: "card_expiry_reminder",
        targetType: "subscription",
        details: {
          totalExpiring: expiringCards.length,
          emailsSent: sentCount,
          skipped: skippedCount,
          errorCount: errors.length,
        },
      });
    } catch {}

    return res.json({
      ok: true,
      totalExpiring: expiringCards.length,
      sent: sentCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error("[card-expiry-reminder] Error:", err);
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
      context: { url: req.url, taskUid: (err as any).taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
