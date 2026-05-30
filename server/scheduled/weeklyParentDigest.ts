/**
 * weeklyParentDigest.ts — Scheduled heartbeat handler
 *
 * Runs every Monday at 8 AM (via Manus Heartbeat cron) to:
 *  1. Find all parent accounts with linked Pre-K through Grade 2 children
 *  2. Gather each child's weekly learning activity (lessons, quizzes, mastery)
 *  3. Build and send a personalised weekly digest email to each parent
 *  4. Skip parents who have no linked early-learner children
 *
 * Endpoint: POST /api/scheduled/weekly-parent-digest
 * Auth:     sdk.authenticateRequest → user.isCron === true
 */
import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { sendEmail } from "../emailService";
import { buildWeeklyParentDigestEmail } from "../emailTemplates/weeklyParentDigest";
import { getDb } from "../db";
import {
  users,
  userProfiles,
  parentChildren,
  lessonProgress,
  quizAttempts,
  userMastery,
  unitProgress,
  units,
} from "../../drizzle/schema";
import { and, eq, gte, inArray, desc } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

// ─── Early-learner grades ─────────────────────────────────────────────────────

const EARLY_GRADES = new Set(["Pre-K", "Kindergarten", "Grade 1", "Grade 2"]);

// ─── At-home activity suggestions by grade ───────────────────────────────────

const AT_HOME_ACTIVITIES: Record<string, string[]> = {
  "Pre-K": [
    "Count objects around the house together — socks, spoons, or toy blocks!",
    "Practice sorting: group toys by colour or size.",
    "Sing counting songs like '5 Little Ducks' or '10 in the Bed'.",
    "Draw shapes and name them together.",
  ],
  "Kindergarten": [
    "Play 'How many?' — count stairs, windows, or books on a shelf.",
    "Use snack time to practice addition: '3 grapes + 2 grapes = ?'",
    "Draw a picture and count how many things are in it.",
    "Practice writing numbers 1–10 with chalk outside.",
  ],
  "Grade 1": [
    "Play 'Number War' with a standard deck of cards — highest card wins!",
    "Practice skip-counting by 2s and 5s while jumping or clapping.",
    "Use coins to practise adding up to 20 cents.",
    "Tell a 'math story': 'There were 6 birds, 2 flew away. How many are left?'",
  ],
  "Grade 2": [
    "Play 'Double It' — call out a number and have your child double it quickly.",
    "Practise telling time on an analogue clock together.",
    "Use a ruler to measure household objects in centimetres and inches.",
    "Try mental addition: add two 2-digit numbers without writing anything down.",
  ],
};

function pickActivity(grade: string, childId: number): string {
  const list = AT_HOME_ACTIVITIES[grade] ?? AT_HOME_ACTIVITIES["Grade 1"];
  return list[childId % list.length];
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function weeklyParentDigestHandler(req: Request, res: Response) {
  try {
    // ── Auth: cron-only ────────────────────────────────────────────────────────
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "DB unavailable" });

    // ── Date window: past 7 days ───────────────────────────────────────────────
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(weekStart.getDate() - 7);

    const weekEnd = new Date(now);
    weekEnd.setHours(23, 59, 59, 999);

    const appUrl = "https://educhamp.app";

    // ── Fetch all parent accounts ──────────────────────────────────────────────
    const parentUsers = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.accountType, "parent"));

    let emailsSent = 0;
    let parentsProcessed = 0;
    let parentsSkipped = 0;

    for (const parent of parentUsers) {
      if (!parent.email) { parentsSkipped++; continue; }

      // ── Get active children ────────────────────────────────────────────────
      const links = await db
        .select()
        .from(parentChildren)
        .where(and(eq(parentChildren.parentId, parent.id), eq(parentChildren.isActive, true)));

      if (links.length === 0) { parentsSkipped++; continue; }

      const childIds = links.map((l) => l.childId);

      // ── Get child profiles (filter to early grades) ────────────────────────
      const childProfiles = await db
        .select({
          userId: userProfiles.userId,
          gradeLevel: userProfiles.gradeLevel,
        })
        .from(userProfiles)
        .where(inArray(userProfiles.userId, childIds));

      const earlyLearnerProfiles = childProfiles.filter(
        (p) => p.gradeLevel && EARLY_GRADES.has(p.gradeLevel)
      );

      if (earlyLearnerProfiles.length === 0) { parentsSkipped++; continue; }

      const earlyChildIds = earlyLearnerProfiles.map((p) => p.userId);

      // ── Get child user records ─────────────────────────────────────────────
      const childUsers = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, earlyChildIds));

      // ── Build per-child digest data ────────────────────────────────────────
      const digestChildren = [];

      for (const childUser of childUsers) {
        const profile = earlyLearnerProfiles.find((p) => p.userId === childUser.id);
        const grade = profile?.gradeLevel ?? "Grade 1";

        // Lessons completed this week
        const weekLessons = await db
          .select()
          .from(lessonProgress)
          .where(
            and(
              eq(lessonProgress.userId, childUser.id),
              eq(lessonProgress.completed, true),
              gte(lessonProgress.completedAt, weekStart)
            )
          );

        // Lessons completed previous week (for improvement detection)
        const prevWeekLessons = await db
          .select()
          .from(lessonProgress)
          .where(
            and(
              eq(lessonProgress.userId, childUser.id),
              eq(lessonProgress.completed, true),
              gte(lessonProgress.completedAt, prevWeekStart),
              // less than weekStart
            )
          );

        // Quiz attempts this week
        const weekQuizzes = await db
          .select()
          .from(quizAttempts)
          .where(
            and(
              eq(quizAttempts.userId, childUser.id),
              gte(quizAttempts.completedAt, weekStart)
            )
          );

        const bestQuizScore = weekQuizzes.length > 0
          ? Math.max(...weekQuizzes.map((q) => q.score ?? 0))
          : null;

        // Mastery: count skills with masteryScore >= 75 updated this week (confirmed threshold)
        const weekMastery = await db
          .select()
          .from(userMastery)
          .where(
            and(
              eq(userMastery.userId, childUser.id),
              gte(userMastery.updatedAt, weekStart)
            )
          );
        const newSkillsMastered = weekMastery.filter((m) => (m.score ?? 0) >= 75).length;

        // Total mastery score (average across all skills)
        const allMastery = await db
          .select({ score: userMastery.score })
          .from(userMastery)
          .where(eq(userMastery.userId, childUser.id));
        const totalMasteryScore = allMastery.length > 0
          ? Math.round(allMastery.reduce((s, m) => s + (m.score ?? 0), 0) / allMastery.length)
          : 0;

        // Recent unit names (from unitProgress)
        const recentUnitProgress = await db
          .select({ unitId: unitProgress.unitId })
          .from(unitProgress)
          .where(eq(unitProgress.userId, childUser.id))
          .orderBy(desc(unitProgress.updatedAt))
          .limit(2);

        let recentUnitNames: string[] = [];
        if (recentUnitProgress.length > 0) {
          const unitIds = recentUnitProgress.map((u) => u.unitId);
          const unitRows = await db
            .select({ id: units.id, title: units.title })
            .from(units)
            .where(inArray(units.id, unitIds));
          recentUnitNames = unitRows.map((u) => u.title);
        }

        const showedImprovement = weekLessons.length > prevWeekLessons.length;

        digestChildren.push({
          name: childUser.name ?? "Your learner",
          grade,
          lessonsCompleted: weekLessons.length,
          quizAttempts: weekQuizzes.length,
          bestQuizScore,
          newSkillsMastered,
          totalMasteryScore,
          recentUnits: recentUnitNames,
          showedImprovement,
          suggestedActivity: pickActivity(grade, childUser.id),
          progressUrl: `${appUrl}/parent`,
          nextLessonUrl: `${appUrl}/curriculum`,
        });
      }

      if (digestChildren.length === 0) { parentsSkipped++; continue; }

      // ── Build and send email ───────────────────────────────────────────────
      const emailData = buildWeeklyParentDigestEmail({
        parentName: parent.name ?? "Parent",
        parentEmail: parent.email,
        weekStart,
        weekEnd,
        children: digestChildren,
        appUrl,
      });

      await sendEmail({
        to: parent.email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        templateName: "weekly-parent-digest",
      });

      emailsSent++;
      parentsProcessed++;
    }

    await notifyOwner({
      title: "✅ Weekly Parent Digest Sent",
      content: `Processed ${parentsProcessed} parents, sent ${emailsSent} digest emails, skipped ${parentsSkipped} (no early learners or no email).`,
    });

    return res.json({
      ok: true,
      parentsProcessed,
      emailsSent,
      parentsSkipped,
      weekRange: `${weekStart.toISOString()} – ${weekEnd.toISOString()}`,
    });
  } catch (err: any) {
    console.error("[weekly-parent-digest]", err);
    return res.status(500).json({
      error: err?.message ?? "unknown error",
      stack: err?.stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
