/**
 * weeklyStudentReviewSummary.ts — Scheduled heartbeat handler
 *
 * Runs every Monday at 9 AM UTC (via Manus Heartbeat cron) to:
 *  1. Find all student accounts with email who have NOT opted out of digest emails
 *  2. Gather each student's spaced repetition review stats and streak status
 *  3. Build and send a personalised weekly review summary email
 *  4. Skip students with no scheduled reviews
 *
 * Endpoint: POST /api/scheduled/weekly-student-review-summary
 * Auth:     sdk.authenticateRequest → user.isCron === true
 */
import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { sendEmail } from "../emailService";
import { buildWeeklyStudentReviewSummaryEmail } from "../emailTemplates/weeklyStudentReviewSummary";
import { getDb, getStreakStats } from "../db";
import { getReviewStats, getSkillsDueForReview } from "../spacedRepetition";
import { users, userProfiles, skills, skillReviewSchedule } from "../../drizzle/schema";
import { eq, and, inArray, lte, asc } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

export async function weeklyStudentReviewSummaryHandler(req: Request, res: Response) {
  try {
    // ── Auth: cron-only ────────────────────────────────────────────────────────
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "DB unavailable" });

    // ── Find eligible students ─────────────────────────────────────────────────
    // Students with email, active status, and emailDigestEnabled = true
    const eligibleStudents = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(
        and(
          eq(users.role, "student"),
          eq(users.status, "active"),
          eq(userProfiles.emailDigestEnabled, true)
        )
      );

    // Filter out students without email
    const studentsWithEmail = eligibleStudents.filter(
      (s) => s.email && s.email.trim().length > 0
    );

    let emailsSent = 0;
    let studentsSkipped = 0;

    // Determine the app URL from the request origin
    const appUrl = `https://${req.headers.host || "educhamp.co"}`;

    for (const student of studentsWithEmail) {
      try {
        // Get all review schedules for this student (across all courses)
        const allSchedules = await db
          .select()
          .from(skillReviewSchedule)
          .where(eq(skillReviewSchedule.userId, student.id));

        // Skip students with no review schedules
        if (allSchedules.length === 0) {
          studentsSkipped++;
          continue;
        }

        // Calculate review stats across all courses
        const now = new Date();
        const dueNow = allSchedules.filter(
          (s) => new Date(s.nextReviewAt) <= now
        ).length;
        const dueToday = allSchedules.filter((s) => {
          const reviewDate = new Date(s.nextReviewAt);
          return reviewDate.toDateString() === now.toDateString();
        }).length;
        const totalScheduled = allSchedules.length;

        // Get top due skills (up to 5)
        const dueSkillRows = allSchedules
          .filter((s) => new Date(s.nextReviewAt) <= now)
          .sort(
            (a, b) =>
              new Date(a.nextReviewAt).getTime() -
              new Date(b.nextReviewAt).getTime()
          )
          .slice(0, 5);

        // Enrich with skill names
        let topDueSkills: Array<{
          skillName: string;
          daysSinceReview: number | null;
        }> = [];
        if (dueSkillRows.length > 0) {
          const skillIds = dueSkillRows.map((r) => r.skillId);
          const skillRows = await db
            .select({ skillId: skills.skillId, skillName: skills.skillName })
            .from(skills)
            .where(inArray(skills.skillId, skillIds));
          const nameMap = new Map(
            skillRows.map((r) => [r.skillId, r.skillName])
          );

          topDueSkills = dueSkillRows.map((r) => ({
            skillName: nameMap.get(r.skillId) || r.skillId,
            daysSinceReview: r.lastReviewedAt
              ? Math.floor(
                  (now.getTime() - new Date(r.lastReviewedAt).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : null,
          }));
        }

        // Get streak stats
        const streakData = await getStreakStats(student.id);

        // Build and send email
        const emailData = buildWeeklyStudentReviewSummaryEmail({
          studentName: student.name || "Student",
          studentEmail: student.email!,
          currentStreak: streakData.currentStreak,
          todayActive: streakData.todayActive,
          longestStreak: streakData.longestStreak,
          dueNow,
          dueToday,
          totalScheduled,
          topDueSkills,
          appUrl,
        });

        await sendEmail({
          to: student.email!,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
          templateName: "weekly-student-review-summary",
        });

        emailsSent++;
      } catch (err) {
        console.error(
          `[WeeklyStudentReview] Error processing student ${student.id}:`,
          err
        );
        studentsSkipped++;
      }
    }

    await notifyOwner({
      title: "Weekly Student Review Summary Sent",
      content: `Processed ${studentsWithEmail.length} students, sent ${emailsSent} review summary emails, skipped ${studentsSkipped} (no reviews or errors).`,
    });

    return res.json({
      ok: true,
      studentsProcessed: studentsWithEmail.length,
      emailsSent,
      studentsSkipped,
    });
  } catch (err: unknown) {
    console.error("[WeeklyStudentReview] Handler error:", err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
