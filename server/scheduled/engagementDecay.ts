/**
 * engagementDecay.ts — Scheduled heartbeat handler
 *
 * Runs daily at 07:00 UTC (2:00am Houston time) to apply graduated decay to:
 *  1. Mastery scores — skills not practiced in 7+ days lose points gradually
 *  2. Streaks — reset currentStreak to 0 if lastActivityDate > 1 day and no freeze available
 *
 * Decay rules:
 *  - Mastery: 7–13 days inactive → -2 pts/day, 14–29 days → -3 pts/day, 30+ days → -5 pts/day
 *  - Floor: mastery never drops below 10 (preserves "attempted" status)
 *  - Streaks: if lastActivityDate is more than 1 day ago and streakFreezes = 0, reset to 0
 *  - Streaks: if freeze available, consume one freeze instead of resetting
 *  - Only active students are affected (skip suspended/archived/deactivated)
 *  - Decay events logged to xpLedger with source "mastery_decay" (negative amount)
 *
 * Endpoint: POST /api/scheduled/engagement-decay
 * Auth:     sdk.authenticateRequest → user.isCron === true
 */
import type { Request, Response } from "express";
import { getDb } from "../db";
import { sdk } from "../_core/sdk";
import {
  userMastery,
  users,
  streakStats,
  xpLedger,
} from "../../drizzle/schema";
import { eq, and, lt, sql, isNotNull } from "drizzle-orm";

/** Calculate mastery decay points based on days since last attempt */
export function calculateMasteryDecay(daysSinceLastAttempt: number): number {
  if (daysSinceLastAttempt < 7) return 0;
  if (daysSinceLastAttempt <= 13) return 2; // -2 pts/day for 7-13 days
  if (daysSinceLastAttempt <= 29) return 3; // -3 pts/day for 14-29 days
  return 5; // -5 pts/day for 30+ days
}

/** Minimum mastery score floor — never decay below this */
export const MASTERY_FLOOR = 10;

export async function engagementDecayHandler(req: Request, res: Response) {
  try {
    // ── Auth: cron-only ────────────────────────────────────────────────────────
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "DB unavailable" });

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const yesterdayStr = new Date(now.getTime() - 86_400_000).toISOString().split("T")[0];

    let masteryDecayed = 0;
    let streaksReset = 0;
    let streaksFrozen = 0;
    let xpDeducted = 0;

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. MASTERY DECAY
    // ═══════════════════════════════════════════════════════════════════════════
    // Find all mastery records where lastAttemptAt is 7+ days ago
    // and the student is active, and score is above the floor
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

    const decayCandidates = await db
      .select({
        id: userMastery.id,
        userId: userMastery.userId,
        skillId: userMastery.skillId,
        score: userMastery.score,
        lastAttemptAt: userMastery.lastAttemptAt,
      })
      .from(userMastery)
      .innerJoin(users, eq(users.id, userMastery.userId))
      .where(
        and(
          lt(userMastery.lastAttemptAt, sevenDaysAgo),
          sql`${userMastery.score} > ${MASTERY_FLOOR}`,
          eq(users.status, "active"),
          eq(users.accountType, "student")
        )
      );

    // Process mastery decay in batches
    for (const candidate of decayCandidates) {
      if (!candidate.lastAttemptAt) continue;

      const daysSince = Math.floor(
        (now.getTime() - new Date(candidate.lastAttemptAt).getTime()) / 86_400_000
      );
      const decayPoints = calculateMasteryDecay(daysSince);

      if (decayPoints === 0) continue;

      const newScore = Math.max(MASTERY_FLOOR, candidate.score - decayPoints);
      const actualDecay = candidate.score - newScore;

      if (actualDecay <= 0) continue;

      // Update mastery score
      await db
        .update(userMastery)
        .set({ score: newScore })
        .where(eq(userMastery.id, candidate.id));

      // Log decay to xpLedger as negative XP event
      await db.insert(xpLedger).values({
        userId: candidate.userId,
        amount: -actualDecay,
        source: "mastery_decay",
        description: `Mastery decay: ${candidate.skillId} (-${actualDecay} pts, ${daysSince}d inactive)`,
        createdAt: now,
      });

      masteryDecayed++;
      xpDeducted += actualDecay;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. STREAK DECAY
    // ═══════════════════════════════════════════════════════════════════════════
    // Find students whose lastActivityDate is more than 1 day ago
    // (they missed yesterday entirely)
    const staleStreaks = await db
      .select({
        id: streakStats.id,
        userId: streakStats.userId,
        currentStreak: streakStats.currentStreak,
        lastActivityDate: streakStats.lastActivityDate,
        streakFreezes: streakStats.streakFreezes,
      })
      .from(streakStats)
      .innerJoin(users, eq(users.id, streakStats.userId))
      .where(
        and(
          sql`${streakStats.currentStreak} > 0`,
          isNotNull(streakStats.lastActivityDate),
          // lastActivityDate is before yesterday (they missed a full day)
          sql`${streakStats.lastActivityDate} < ${yesterdayStr}`,
          eq(users.status, "active"),
          eq(users.accountType, "student")
        )
      );

    for (const streak of staleStreaks) {
      if (!streak.lastActivityDate) continue;

      if (streak.streakFreezes > 0) {
        // Consume a freeze instead of resetting
        await db
          .update(streakStats)
          .set({
            streakFreezes: streak.streakFreezes - 1,
            lastActivityDate: yesterdayStr, // Extend the streak through yesterday
          })
          .where(eq(streakStats.id, streak.id));
        streaksFrozen++;
      } else {
        // No freezes available — reset streak to 0
        await db
          .update(streakStats)
          .set({ currentStreak: 0 })
          .where(eq(streakStats.id, streak.id));
        streaksReset++;
      }
    }

    console.log(
      `[EngagementDecay] Mastery decayed: ${masteryDecayed} skills, ` +
      `XP deducted: ${xpDeducted}, Streaks reset: ${streaksReset}, ` +
      `Streaks frozen: ${streaksFrozen}`
    );

    return res.json({
      ok: true,
      masteryDecayed,
      xpDeducted,
      streaksReset,
      streaksFrozen,
      totalCandidates: decayCandidates.length,
      staleStreaksProcessed: staleStreaks.length,
      processedAt: now.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[EngagementDecay] Handler error:", message);
    return res.status(500).json({
      error: message,
      stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
