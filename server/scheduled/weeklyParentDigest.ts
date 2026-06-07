/**
 * weeklyParentDigest.ts — Scheduled heartbeat handler
 *
 * Runs every Monday at 8 AM UTC (via Manus Heartbeat cron) to:
 *  1. Find all parent accounts who have NOT opted out of weekly digest emails
 *  2. Gather each child's weekly learning activity (lessons, quizzes, mastery)
 *  3. Build and send a personalised weekly digest email to each parent
 *  4. Skip parents with no linked children or no activity
 *
 * Endpoint: POST /api/scheduled/weekly-parent-digest
 * Auth:     sdk.authenticateRequest → user.isCron === true
 */
import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { sendEmail } from "../emailService";
import { buildWeeklyParentDigestEmail, type WeeklyDigestChild } from "../emailTemplates/weeklyParentDigest";
import { getWeeklyDigestEligibleParents, getWeeklyDigestDataForParent, getWeeklyTaskDigestForParent, getUserProfile } from "../db";
import { getDb } from "../db";
import {
  userMastery,
  unitProgress,
  units,
  diagnosticAttempts,
} from "../../drizzle/schema";
import { and, eq, gte, inArray, desc } from "drizzle-orm";
// notifyOwner removed — all notifications now go through sendEmail (Resend) only.

// ─── At-home activity suggestions by grade band ──────────────────────────────

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
  "elementary": [
    "Practice multiplication facts with flashcards or a timed quiz game.",
    "Measure ingredients together while cooking — fractions in action!",
    "Create a budget for a pretend shopping trip with a $20 limit.",
    "Read a chapter book together and discuss the main idea.",
  ],
  "middle": [
    "Discuss current events and ask your child to identify cause and effect.",
    "Work through a logic puzzle or Sudoku together.",
    "Have your child explain a concept they learned this week in their own words.",
    "Practice estimation: guess quantities, distances, or times, then verify.",
  ],
  "high": [
    "Discuss a real-world application of what they're learning (e.g., algebra in budgeting).",
    "Encourage them to teach you something new they learned this week.",
    "Set a 25-minute focused study session (Pomodoro technique) together.",
    "Review their quiz results together and identify patterns in mistakes.",
  ],
};

function getGradeBand(gradeLevel: string | null): string {
  if (!gradeLevel) return "middle";
  const g = gradeLevel.toLowerCase();
  if (g === "pre-k" || g === "prek") return "Pre-K";
  if (g === "kindergarten" || g === "k") return "Kindergarten";
  if (g === "grade 1" || g === "1") return "Grade 1";
  if (g === "grade 2" || g === "2") return "Grade 2";
  const num = parseInt(g.replace(/[^0-9]/g, ""), 10);
  if (!isNaN(num)) {
    if (num <= 5) return "elementary";
    if (num <= 8) return "middle";
    return "high";
  }
  if (g.includes("ap") || g.includes("advanced")) return "high";
  return "middle";
}

// ─── Preference-based activity suggestions ──────────────────────────────────

const PREFERENCE_ACTIVITIES: Record<string, string[]> = {
  reading: [
    "Read together for 15 minutes — take turns reading paragraphs aloud.",
    "Visit the library and pick a book about a topic they're studying.",
    "Start a reading journal: write one sentence about what happened in today's chapter.",
    "Read a non-fiction article together and discuss 3 new facts.",
  ],
  math_games: [
    "Play a dice-rolling game: roll two dice and multiply the numbers.",
    "Try a math puzzle app together for 10 minutes.",
    "Play 'Grocery Store Math' — estimate totals before checking out.",
    "Create a treasure hunt with math clues (e.g., 'Take 3×4 steps north').",
  ],
  hands_on: [
    "Build something with blocks or LEGO and count the pieces used.",
    "Cook together and practice measuring fractions (½ cup, ¼ tsp).",
    "Create a paper airplane and measure how far it flies.",
    "Build a simple circuit or science experiment from household items.",
  ],
  outdoor: [
    "Go on a nature walk and count different types of plants or animals.",
    "Measure distances outside — how many steps to the mailbox?",
    "Play hopscotch with math problems in each square.",
    "Create an outdoor scavenger hunt with shape-finding challenges.",
  ],
  creative: [
    "Draw a picture using only geometric shapes — name each one.",
    "Create a comic strip that tells a math story problem.",
    "Design a dream bedroom on paper — calculate the area and perimeter.",
    "Make a pattern with coloured beads or buttons and describe the rule.",
  ],
};

function pickActivity(gradeLevel: string | null, childId: number, preference?: string): string {
  // If parent has a specific preference (not "general"), use preference-based activities
  if (preference && preference !== "general" && PREFERENCE_ACTIVITIES[preference]) {
    const list = PREFERENCE_ACTIVITIES[preference];
    return list[childId % list.length];
  }
  // Otherwise fall back to grade-band activities
  const band = getGradeBand(gradeLevel);
  const list = AT_HOME_ACTIVITIES[band] ?? AT_HOME_ACTIVITIES["middle"];
  return list[childId % list.length];
}

function gradeLabel(gradeLevel: string | null): string {
  if (!gradeLevel) return "Student";
  const g = gradeLevel.toLowerCase();
  if (g === "pre-k" || g === "prek") return "Pre-K";
  if (g === "kindergarten" || g === "k") return "Kindergarten";
  const num = parseInt(g.replace(/[^0-9]/g, ""), 10);
  if (!isNaN(num)) return `Grade ${num}`;
  return gradeLevel;
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

    const appUrl = "https://educhamp.co";

    // ── Fetch eligible parents (opted-in, has email) ───────────────────────────
    const parentUsers = await getWeeklyDigestEligibleParents();

    let emailsSent = 0;
    let parentsProcessed = 0;
    let parentsSkipped = 0;

    for (const parent of parentUsers) {
      if (!parent.email) { parentsSkipped++; continue; }

      // ── Get parent's activity preference ─────────────────────────────────
      const parentProfile = await getUserProfile(parent.id);
      const activityPref = (parentProfile?.activityPreference as string) ?? "general";

      // ── Get digest data for all children ───────────────────────────────────
      const childData = await getWeeklyDigestDataForParent(parent.id);

      if (childData.length === 0) { parentsSkipped++; continue; }

      // ── Fetch task/XP/badge data ──────────────────────────────────────────
      const taskDigestData = await getWeeklyTaskDigestForParent(parent.id);
      const taskMap = new Map(taskDigestData.map((t) => [t.childId, t]));

      // ── Build per-child digest for email template ──────────────────────────
      const digestChildren: WeeklyDigestChild[] = [];

      for (const child of childData) {
        const grade = gradeLabel(child.gradeLevel);

        // Mastery: count skills with score >= 75 updated this week
        const weekMastery = await db
          .select()
          .from(userMastery)
          .where(
            and(
              eq(userMastery.userId, child.childId),
              gte(userMastery.updatedAt, weekStart)
            )
          );
        const newSkillsMastered = weekMastery.filter((m) => (m.score ?? 0) >= 75).length;

        // Total mastery score (average across all skills)
        const allMastery = await db
          .select({ score: userMastery.score })
          .from(userMastery)
          .where(eq(userMastery.userId, child.childId));
        const totalMasteryScore = allMastery.length > 0
          ? Math.round(allMastery.reduce((s, m) => s + (m.score ?? 0), 0) / allMastery.length)
          : 0;

        // Recent unit names (from unitProgress)
        const recentUnitProgress = await db
          .select({ unitId: unitProgress.unitId })
          .from(unitProgress)
          .where(eq(unitProgress.userId, child.childId))
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

        // Improvement detection: compare this week vs previous week lesson count
        // (simplified: if they completed any lessons this week, consider it positive)
        const showedImprovement = child.lessonsCompleted > 0;

        // Diagnostic score for on-track indicator
        const latestDiag = await db
          .select({ overallScore: diagnosticAttempts.overallScore })
          .from(diagnosticAttempts)
          .where(eq(diagnosticAttempts.userId, child.childId))
          .orderBy(desc(diagnosticAttempts.completedAt))
          .limit(1)
          .then((r) => r[0] ?? null);
        const diagScore = latestDiag?.overallScore ?? null;
        const onTrackStatus: "on_track" | "needs_attention" | "check_in" | null =
          diagScore === null ? null :
          diagScore >= 75 ? "on_track" :
          diagScore >= 60 ? "needs_attention" : "check_in";

        const taskData = taskMap.get(child.childId);

        digestChildren.push({
          name: child.childName,
          grade,
          lessonsCompleted: child.lessonsCompleted,
          quizAttempts: child.quizzesTaken,
          bestQuizScore: child.bestQuizScore,
          newSkillsMastered,
          totalMasteryScore,
          recentUnits: recentUnitNames,
          showedImprovement,
          suggestedActivity: pickActivity(child.gradeLevel, child.childId, activityPref),
          progressUrl: `${appUrl}/parent`,
          nextLessonUrl: `${appUrl}/curriculum`,
          onTrackStatus,
          diagnosticScore: diagScore,
          // Task progress data
          tasksCompleted: taskData?.tasksCompleted ?? 0,
          tasksConfirmed: taskData?.tasksConfirmed ?? 0,
          tasksPending: taskData?.tasksPending ?? 0,
          xpEarnedThisWeek: taskData?.xpEarnedThisWeek ?? 0,
          totalXp: taskData?.totalXp ?? 0,
          currentLevel: taskData?.currentLevel ?? 1,
          currentLevelName: taskData?.currentLevelName ?? "Rookie Learner",
          badgesEarnedThisWeek: taskData?.badgesEarnedThisWeek ?? [],
          currentStreak: taskData?.currentStreak ?? 0,
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

    console.log(`[Audit] Weekly Parent Digest Sent: processed ${parentsProcessed} parents, sent ${emailsSent}, skipped ${parentsSkipped}`);

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
