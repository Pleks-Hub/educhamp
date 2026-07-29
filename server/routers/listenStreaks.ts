/**
 * Listen Mode Streak Tracking
 * Tracks consecutive weeks where students meet their listen-mode goal.
 * Supports streak-freeze mechanic (earn via consistent usage, spend to save streak).
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { listenStreaks, ttsUsageLogs } from "../../drizzle/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";

/** Get the Monday-based ISO week start date string (YYYY-MM-DD) for a given date */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

/** Get the previous week's start date */
function getPreviousWeekStart(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00Z");
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

export const listenStreaksRouter = router({
  /**
   * Get the current user's listen streak stats.
   * Returns current streak count, this week's progress, freezes available, and history.
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return {
        currentStreak: 0,
        thisWeekSeconds: 0,
        goalSeconds: 1800,
        goalMet: false,
        freezesAvailable: 0,
        freezeUsedThisWeek: false,
        weeklyHistory: [] as { weekStart: string; secondsListened: number; goalMet: boolean; freezeUsed: boolean }[],
      };
    }

    const currentWeekStart = getWeekStart(new Date());

    // Get or create this week's record
    let [thisWeek] = await db
      .select()
      .from(listenStreaks)
      .where(and(eq(listenStreaks.userId, ctx.user.id), eq(listenStreaks.weekStart, currentWeekStart)))
      .limit(1);

    if (!thisWeek) {
      // Calculate streak from previous weeks
      const prevWeekStart = getPreviousWeekStart(currentWeekStart);
      const [prevWeek] = await db
        .select()
        .from(listenStreaks)
        .where(and(eq(listenStreaks.userId, ctx.user.id), eq(listenStreaks.weekStart, prevWeekStart)))
        .limit(1);

      const prevStreak = prevWeek?.streakCount ?? 0;
      const prevGoalMet = prevWeek?.goalMet ?? false;
      const prevFreezes = prevWeek?.freezesAvailable ?? 0;

      // If previous week goal was met, carry streak forward; otherwise check freeze
      let carryStreak = 0;
      let carryFreezes = prevFreezes;
      if (prevGoalMet) {
        carryStreak = prevStreak;
        // Award a freeze every 4 consecutive weeks
        if (prevStreak > 0 && prevStreak % 4 === 0) {
          carryFreezes = Math.min(carryFreezes + 1, 3); // max 3 freezes
        }
      } else if (prevStreak > 0 && prevFreezes > 0) {
        // Missed goal but had a freeze — use it automatically
        carryStreak = prevStreak;
        carryFreezes = prevFreezes - 1;
        // Mark previous week as freeze-used
        if (prevWeek) {
          await db.update(listenStreaks)
            .set({ freezeUsed: true })
            .where(eq(listenStreaks.id, prevWeek.id));
        }
      }
      // else: streak resets to 0

      // Create this week's record
      await db.insert(listenStreaks).values({
        userId: ctx.user.id,
        weekStart: currentWeekStart,
        secondsListened: 0,
        goalSeconds: 1800, // 30 min default
        goalMet: false,
        streakCount: carryStreak,
        freezesAvailable: carryFreezes,
        freezeUsed: false,
      });

      [thisWeek] = await db
        .select()
        .from(listenStreaks)
        .where(and(eq(listenStreaks.userId, ctx.user.id), eq(listenStreaks.weekStart, currentWeekStart)))
        .limit(1);
    }

    // Get recent weekly history (last 8 weeks)
    const history = await db
      .select({
        weekStart: listenStreaks.weekStart,
        secondsListened: listenStreaks.secondsListened,
        goalMet: listenStreaks.goalMet,
        freezeUsed: listenStreaks.freezeUsed,
      })
      .from(listenStreaks)
      .where(eq(listenStreaks.userId, ctx.user.id))
      .orderBy(desc(listenStreaks.weekStart))
      .limit(8);

    return {
      currentStreak: thisWeek!.streakCount,
      thisWeekSeconds: thisWeek!.secondsListened,
      goalSeconds: thisWeek!.goalSeconds,
      goalMet: thisWeek!.goalMet,
      freezesAvailable: thisWeek!.freezesAvailable,
      freezeUsedThisWeek: thisWeek!.freezeUsed,
      weeklyHistory: history,
    };
  }),

  /**
   * Record listen time for the current week.
   * Called when a TTS session ends (from the frontend onComplete callback).
   */
  recordListenTime: protectedProcedure
    .input(z.object({
      durationSeconds: z.number().int().min(1).max(7200), // max 2 hours per call
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false, goalMet: false, streakCount: 0 };

      const currentWeekStart = getWeekStart(new Date());

      // Ensure this week's record exists
      let [thisWeek] = await db
        .select()
        .from(listenStreaks)
        .where(and(eq(listenStreaks.userId, ctx.user.id), eq(listenStreaks.weekStart, currentWeekStart)))
        .limit(1);

      if (!thisWeek) {
        // Create record (first listen of the week)
        const prevWeekStart = getPreviousWeekStart(currentWeekStart);
        const [prevWeek] = await db
          .select()
          .from(listenStreaks)
          .where(and(eq(listenStreaks.userId, ctx.user.id), eq(listenStreaks.weekStart, prevWeekStart)))
          .limit(1);

        const prevStreak = prevWeek?.streakCount ?? 0;
        const prevGoalMet = prevWeek?.goalMet ?? false;
        const prevFreezes = prevWeek?.freezesAvailable ?? 0;

        let carryStreak = 0;
        let carryFreezes = prevFreezes;
        if (prevGoalMet) {
          carryStreak = prevStreak;
          if (prevStreak > 0 && prevStreak % 4 === 0) {
            carryFreezes = Math.min(carryFreezes + 1, 3);
          }
        } else if (prevStreak > 0 && prevFreezes > 0) {
          carryStreak = prevStreak;
          carryFreezes = prevFreezes - 1;
          if (prevWeek) {
            await db.update(listenStreaks)
              .set({ freezeUsed: true })
              .where(eq(listenStreaks.id, prevWeek.id));
          }
        }

        await db.insert(listenStreaks).values({
          userId: ctx.user.id,
          weekStart: currentWeekStart,
          secondsListened: 0,
          goalSeconds: 1800,
          goalMet: false,
          streakCount: carryStreak,
          freezesAvailable: carryFreezes,
          freezeUsed: false,
        });

        [thisWeek] = await db
          .select()
          .from(listenStreaks)
          .where(and(eq(listenStreaks.userId, ctx.user.id), eq(listenStreaks.weekStart, currentWeekStart)))
          .limit(1);
      }

      if (!thisWeek) return { success: false, goalMet: false, streakCount: 0 };

      // Update seconds listened
      const newSeconds = thisWeek.secondsListened + input.durationSeconds;
      const goalNowMet = newSeconds >= thisWeek.goalSeconds;
      const streakIncreased = goalNowMet && !thisWeek.goalMet;
      const newStreak = streakIncreased ? thisWeek.streakCount + 1 : thisWeek.streakCount;

      await db.update(listenStreaks)
        .set({
          secondsListened: newSeconds,
          goalMet: goalNowMet,
          streakCount: newStreak,
        })
        .where(eq(listenStreaks.id, thisWeek.id));

      return {
        success: true,
        goalMet: goalNowMet,
        streakCount: newStreak,
        justCompletedGoal: streakIncreased,
      };
    }),

  /**
   * Update the weekly listen goal (in seconds).
   * Students can customize their own goal (min 10 min, max 120 min).
   */
  updateGoal: protectedProcedure
    .input(z.object({
      goalSeconds: z.number().int().min(600).max(7200), // 10 min to 2 hours
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      const currentWeekStart = getWeekStart(new Date());

      // Update this week's goal (and future weeks will inherit from the latest)
      await db.update(listenStreaks)
        .set({ goalSeconds: input.goalSeconds })
        .where(and(eq(listenStreaks.userId, ctx.user.id), eq(listenStreaks.weekStart, currentWeekStart)));

      return { success: true };
    }),
});
