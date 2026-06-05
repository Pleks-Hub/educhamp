/**
 * learningPlanReminder.ts — Scheduled heartbeat handler
 *
 * Runs every hour to check for students who have a learning plan block
 * starting within the next hour. Sends an email reminder.
 *
 * Endpoint: POST /api/scheduled/learning-plan-reminder
 * Auth:     sdk.authenticateRequest → user.isCron === true
 */
import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { sendEmail } from "../emailService";
import { buildLearningPlanReminderEmail } from "../emailTemplates/learningPlanReminder";
import { getDb } from "../db";
import { learningPlans, users } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

const DAY_MAP: Record<number, string> = {
  0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
};

const DAY_LABELS: Record<string, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};

export async function learningPlanReminderHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) return res.json({ ok: true, skipped: "no-db" });

    // Get today's day of week
    const now = new Date();
    const todayKey = DAY_MAP[now.getUTCDay()];

    // Find all active learning plans that have blocks for today
    const activePlans = await db
      .select({
        planId: learningPlans.id,
        userId: learningPlans.userId,
        schedule: learningPlans.schedule,
        preferredDays: learningPlans.preferredDays,
      })
      .from(learningPlans)
      .where(eq(learningPlans.isActive, true));

    let emailsSent = 0;
    let errors = 0;

    for (const plan of activePlans) {
      // Check if today is one of the preferred days
      const days = plan.preferredDays as string[];
      if (!days.includes(todayKey)) continue;

      // Get the user's email
      const [userRow] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, plan.userId))
        .limit(1);

      if (!userRow?.email) continue;

      // Find blocks for today
      const schedule = plan.schedule as { blocks: Array<{ day: string; courseId: number; courseName: string; durationMinutes: number; priority: "high" | "medium" | "low"; notes?: string }> };
      const todayBlocks = (schedule?.blocks ?? []).filter(b => b.day === todayKey);

      if (todayBlocks.length === 0) continue;

      // Send one reminder per block (combine into one email for simplicity)
      const primaryBlock = todayBlocks[0];
      const totalMinutes = todayBlocks.reduce((sum, b) => sum + b.durationMinutes, 0);

      try {
        const { subject, html } = buildLearningPlanReminderEmail({
          studentName: userRow.name ?? "Student",
          courseName: todayBlocks.length > 1
            ? `${primaryBlock.courseName} + ${todayBlocks.length - 1} more`
            : primaryBlock.courseName,
          durationMinutes: totalMinutes,
          priority: primaryBlock.priority,
          dayLabel: DAY_LABELS[todayKey] ?? todayKey,
          notes: primaryBlock.notes,
        });

        await sendEmail({
          to: userRow.email,
          subject,
          html,
          text: `Study Reminder: ${primaryBlock.courseName} (${totalMinutes}min) - Time to study!`,
          templateName: "learning_plan_reminder",
        });
        emailsSent++;
      } catch (err) {
        console.error(`[LearningPlanReminder] Failed to send to user ${plan.userId}:`, err);
        errors++;
      }
    }

    return res.json({ ok: true, emailsSent, errors, plansChecked: activePlans.length });
  } catch (err: any) {
    console.error("[LearningPlanReminder] Handler error:", err);
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
      context: { url: req.url, taskUid: (err as any).taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
