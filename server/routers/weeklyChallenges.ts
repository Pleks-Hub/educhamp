import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { weeklyChallenges, parentTaskCompletions, focusSessions, xpLedger } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import { awardXp } from "../gamification/xp";

// ─── Challenge Templates ────────────────────────────────────────────────────

interface ChallengeTemplate {
  type: "task_count" | "streak_days" | "focus_minutes" | "xp_earned";
  title: string;
  description: string;
  target: number;
  bonusXp: number;
}

const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  { type: "task_count", title: "Task Warrior", description: "Complete 5 tasks this week", target: 5, bonusXp: 75 },
  { type: "task_count", title: "Task Master", description: "Complete 10 tasks this week", target: 10, bonusXp: 150 },
  { type: "task_count", title: "Speed Runner", description: "Complete 3 tasks before Wednesday", target: 3, bonusXp: 60 },
  { type: "streak_days", title: "Consistency King", description: "Complete at least 1 task every day for 5 days", target: 5, bonusXp: 100 },
  { type: "streak_days", title: "Daily Grinder", description: "Complete tasks on 3 different days", target: 3, bonusXp: 50 },
  { type: "focus_minutes", title: "Deep Focus", description: "Accumulate 60 minutes of focus time", target: 60, bonusXp: 80 },
  { type: "focus_minutes", title: "Focus Marathon", description: "Accumulate 120 minutes of focus time", target: 120, bonusXp: 150 },
  { type: "xp_earned", title: "XP Hunter", description: "Earn 200 XP this week", target: 200, bonusXp: 100 },
  { type: "xp_earned", title: "XP Legend", description: "Earn 500 XP this week", target: 500, bonusXp: 200 },
];

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekEnd(): Date {
  const start = getWeekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function pickRandomChallenge(): ChallengeTemplate {
  return CHALLENGE_TEMPLATES[Math.floor(Math.random() * CHALLENGE_TEMPLATES.length)];
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const weeklyChallengesRouter = router({
  // Get or generate the current week's challenge for the student
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    // Check if a challenge already exists for this week
    const [existing] = await db.select()
      .from(weeklyChallenges)
      .where(and(
        eq(weeklyChallenges.studentId, ctx.user.id),
        gte(weeklyChallenges.weekStart, weekStart),
      ))
      .limit(1);

    if (existing) {
      // Recalculate progress live
      const progress = await calculateProgress(db, ctx.user.id, existing.challengeType, weekStart, weekEnd);
      
      // Update progress if changed
      if (progress !== existing.progress) {
        const newStatus = progress >= existing.target && existing.status === "active" ? "completed" : existing.status;
        await db.update(weeklyChallenges).set({
          progress,
          status: newStatus,
          completedAt: newStatus === "completed" ? new Date() : existing.completedAt,
        }).where(eq(weeklyChallenges.id, existing.id));
        
        return {
          ...existing,
          progress,
          status: newStatus,
          completedAt: newStatus === "completed" ? new Date() : existing.completedAt,
          daysLeft: Math.max(0, Math.ceil((weekEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
        };
      }

      return {
        ...existing,
        daysLeft: Math.max(0, Math.ceil((weekEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
      };
    }

    // Auto-generate a new challenge for this week
    const template = pickRandomChallenge();
    const [result] = await db.insert(weeklyChallenges).values({
      studentId: ctx.user.id,
      weekStart,
      challengeType: template.type,
      title: template.title,
      description: template.description,
      target: template.target,
      bonusXp: template.bonusXp,
      progress: 0,
      status: "active",
    }).$returningId();

    return {
      id: result.id,
      studentId: ctx.user.id,
      weekStart,
      challengeType: template.type,
      title: template.title,
      description: template.description,
      target: template.target,
      progress: 0,
      bonusXp: template.bonusXp,
      status: "active" as const,
      completedAt: null,
      claimedAt: null,
      daysLeft: Math.max(0, Math.ceil((weekEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
    };
  }),

  // Claim the bonus XP reward when challenge is completed
  claimReward: protectedProcedure
    .input(z.object({ challengeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [challenge] = await db.select()
        .from(weeklyChallenges)
        .where(and(
          eq(weeklyChallenges.id, input.challengeId),
          eq(weeklyChallenges.studentId, ctx.user.id),
        ))
        .limit(1);

      if (!challenge) throw new TRPCError({ code: "NOT_FOUND", message: "Challenge not found" });
      if (challenge.status === "claimed") throw new TRPCError({ code: "BAD_REQUEST", message: "Already claimed" });
      if (challenge.status !== "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "Challenge not yet completed" });

      // Award bonus XP
      await awardXp(ctx.user.id, "quest_complete", challenge.bonusXp, `weekly_challenge_${challenge.id}`, `Weekly Challenge: ${challenge.title}`);

      // Mark as claimed
      await db.update(weeklyChallenges).set({
        status: "claimed",
        claimedAt: new Date(),
      }).where(eq(weeklyChallenges.id, challenge.id));

      return { xpAwarded: challenge.bonusXp };
    }),

  // Get history of past challenges
  history: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const challenges = await db.select()
        .from(weeklyChallenges)
        .where(eq(weeklyChallenges.studentId, ctx.user.id))
        .orderBy(desc(weeklyChallenges.weekStart))
        .limit(input?.limit ?? 10);

      return challenges;
    }),
});

// ─── Progress Calculation Helpers ───────────────────────────────────────────

async function calculateProgress(
  db: any,
  studentId: number,
  challengeType: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<number> {
  switch (challengeType) {
    case "task_count": {
      const [result] = await db.select({ count: count() })
        .from(parentTaskCompletions)
        .where(and(
          eq(parentTaskCompletions.studentId, studentId),
          eq(parentTaskCompletions.parentConfirmed, true),
          gte(parentTaskCompletions.completedAt, weekStart),
          lte(parentTaskCompletions.completedAt, weekEnd),
        ));
      return result?.count ?? 0;
    }
    case "streak_days": {
      const dayRows = await db.select({
        day: sql<string>`DATE(${parentTaskCompletions.completedAt})`,
      })
        .from(parentTaskCompletions)
        .where(and(
          eq(parentTaskCompletions.studentId, studentId),
          eq(parentTaskCompletions.parentConfirmed, true),
          gte(parentTaskCompletions.completedAt, weekStart),
          lte(parentTaskCompletions.completedAt, weekEnd),
        ))
        .groupBy(sql`DATE(${parentTaskCompletions.completedAt})`);
      return dayRows.length;
    }
    case "focus_minutes": {
      const [result] = await db.select({
        total: sql<number>`COALESCE(SUM(${focusSessions.durationMinutes}), 0)`,
      })
        .from(focusSessions)
        .where(and(
          eq(focusSessions.userId, studentId),
          eq(focusSessions.interrupted, false),
          gte(focusSessions.completedAt, weekStart),
          lte(focusSessions.completedAt, weekEnd),
        ));
      return result?.total ?? 0;
    }
    case "xp_earned": {
      const [result] = await db.select({
        total: sql<number>`COALESCE(SUM(${xpLedger.amount}), 0)`,
      })
        .from(xpLedger)
        .where(and(
          eq(xpLedger.userId, studentId),
          gte(xpLedger.createdAt, weekStart),
          lte(xpLedger.createdAt, weekEnd),
        ));
      return result?.total ?? 0;
    }
    default:
      return 0;
  }
}
