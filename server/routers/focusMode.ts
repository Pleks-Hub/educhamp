import { z } from "zod/v4";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { focusSessions } from "../../drizzle/schema";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";
import { awardXp } from "../gamification/xp";

// XP rewards by duration (minutes → XP)
const DURATION_XP: Record<number, number> = {
  15: 25,
  25: 50,
  45: 100,
  60: 150,
};

function getXpForDuration(minutes: number): number {
  // Find the closest matching preset, or interpolate
  if (DURATION_XP[minutes]) return DURATION_XP[minutes];
  // Linear interpolation: ~1.67 XP per minute after 15 min
  if (minutes < 15) return Math.round(minutes * 1.5);
  return Math.min(Math.round(minutes * 2.5), 200);
}

export const focusModeRouter = router({
  // Complete a focus session and award XP
  complete: protectedProcedure
    .input(z.object({
      durationMinutes: z.number().min(1).max(120),
      interrupted: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Calculate XP (no XP if interrupted before minimum threshold)
      let xpAmount = 0;
      if (!input.interrupted && input.durationMinutes >= 5) {
        xpAmount = getXpForDuration(input.durationMinutes);
      } else if (input.interrupted && input.durationMinutes >= 10) {
        // Partial credit for interrupted sessions > 10 min
        xpAmount = Math.round(getXpForDuration(input.durationMinutes) * 0.5);
      }

      // Focus streak bonus: check consecutive days
      let streakDays = 0;
      if (!input.interrupted && xpAmount > 0) {
        // Count distinct days with completed sessions in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dayRows = await db.select({
          day: sql<string>`DATE(${focusSessions.completedAt})`,
        })
          .from(focusSessions)
          .where(and(
            eq(focusSessions.userId, ctx.user.id),
            eq(focusSessions.interrupted, false),
            gte(focusSessions.completedAt, thirtyDaysAgo),
          ))
          .groupBy(sql`DATE(${focusSessions.completedAt})`)
          .orderBy(desc(sql`DATE(${focusSessions.completedAt})`));

        // Count consecutive days ending today
        const today = new Date().toISOString().slice(0, 10);
        const dayStrings = dayRows.map(r => r.day);
        // Include today (current session counts)
        if (!dayStrings.includes(today)) dayStrings.unshift(today);
        
        let checkDate = new Date();
        for (let i = 0; i < dayStrings.length; i++) {
          const expected = checkDate.toISOString().slice(0, 10);
          if (dayStrings.includes(expected)) {
            streakDays++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }

        // Apply streak multiplier: +10% per consecutive day, max +50%
        if (streakDays > 1) {
          const multiplier = 1 + Math.min(streakDays - 1, 5) * 0.1;
          xpAmount = Math.round(xpAmount * multiplier);
        }
      }

      // Insert session record
      const [result] = await db.insert(focusSessions).values({
        userId: ctx.user.id,
        durationMinutes: input.durationMinutes,
        xpAwarded: xpAmount,
        interrupted: input.interrupted,
      }).$returningId();

      // Award XP
      let xpResult = null;
      if (xpAmount > 0) {
        xpResult = await awardXp(
          ctx.user.id,
          "focus_session",
          xpAmount,
          `focus_${result.id}`,
          `Focus session: ${input.durationMinutes} min${input.interrupted ? " (interrupted)" : ""}`,
        );
      }

      return {
        sessionId: result.id,
        xpAwarded: xpResult?.awarded ? xpAmount : 0,
        dailyCapReached: xpResult?.reason === "daily_cap_reached",
        streakDays,
      };
    }),

  // Get session history for the current user
  history: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const limit = input?.limit ?? 20;
      const sessions = await db.select()
        .from(focusSessions)
        .where(eq(focusSessions.userId, ctx.user.id))
        .orderBy(desc(focusSessions.completedAt))
        .limit(limit);

      return sessions;
    }),

  // Get today's stats
  todayStats: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [stats] = await db.select({
        totalSessions: count(),
        totalMinutes: sql<number>`COALESCE(SUM(${focusSessions.durationMinutes}), 0)`,
        totalXp: sql<number>`COALESCE(SUM(${focusSessions.xpAwarded}), 0)`,
      })
        .from(focusSessions)
        .where(and(
          eq(focusSessions.userId, ctx.user.id),
          gte(focusSessions.completedAt, todayStart),
          eq(focusSessions.interrupted, false),
        ));

      return {
        sessionsToday: stats?.totalSessions ?? 0,
        minutesToday: stats?.totalMinutes ?? 0,
        xpToday: stats?.totalXp ?? 0,
        dailySessionCap: 4,
      };
    }),
});
