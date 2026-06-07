/**
 * gamification/xp.ts
 * XP award engine with anti-farming guards, level progression, and streak bonuses.
 *
 * XP Economy (mastery-weighted):
 *   lesson_complete      25 XP  (max 5/day per user)
 *   quiz_pass            75 XP  (max 3/day per user, requires score ≥ 75)
 *   quiz_perfect        150 XP  (score = 100, once per quiz per day)
 *   mastery_achieved    200 XP  (skill score crosses mastery threshold, once per skill)
 *   grand_master        500 XP  (skill score ≥ 90, once per skill)
 *   diagnostic_complete  50 XP  (once per diagnostic session)
 *   diagnostic_improved 100 XP  (score improves vs prior attempt, once per day)
 *   streak_bonus         10 XP  (per day of streak, capped at 100 XP/day)
 *   quest_complete      varies  (defined per quest)
 *   badge_earned        varies  (defined per badge)
 */

import { getDb } from "../db";
import { xpLedger, studentLevels } from "../../drizzle/schema";
import { and, eq, gte, sql, count } from "drizzle-orm";
import { LEVEL_THRESHOLDS, getLevelName } from "./levels";

// ─── Daily caps per source (anti-farming) ────────────────────────────────────
const DAILY_CAPS: Record<string, number> = {
  lesson_complete: 5,
  quiz_pass: 3,
  quiz_perfect: 1,
  mastery_achieved: 20,   // effectively unlimited (one per skill)
  grand_master: 20,
  diagnostic_complete: 1,
  diagnostic_improved: 1,
  streak_bonus: 1,
  quest_complete: 10,
  badge_earned: 20,
  focus_session: 4,       // max 4 focus sessions per day
};

// ─── XP amounts per source ────────────────────────────────────────────────────
export const XP_AMOUNTS: Record<string, number> = {
  lesson_complete: 25,
  quiz_pass: 75,
  quiz_perfect: 150,
  mastery_achieved: 200,
  grand_master: 500,
  diagnostic_complete: 50,
  diagnostic_improved: 100,
  streak_bonus: 10,       // multiplied by Math.min(streak, 10) up to 100 XP
  quest_complete: 0,      // amount comes from quest definition
  badge_earned: 0,        // amount comes from badge definition
  focus_session: 0,       // amount varies by duration (25-150 XP)
};

// ─── Core award function ──────────────────────────────────────────────────────

export interface AwardXpResult {
  awarded: boolean;
  amount: number;
  reason?: string;
  newTotalXp?: number;
  newLevel?: number;
  newLevelName?: string;
  leveledUp?: boolean;
}

export async function awardXp(
  userId: number,
  source: string,
  amount: number,
  sourceId?: string,
  description?: string,
): Promise<AwardXpResult> {
  const db = await getDb();
  if (!db) return { awarded: false, amount: 0, reason: "db_unavailable" };

  // ── Anti-farming: check daily cap ────────────────────────────────────────
  const cap = DAILY_CAPS[source];
  if (cap !== undefined) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [countRow] = await db
      .select({ n: count() })
      .from(xpLedger)
      .where(
        and(
          eq(xpLedger.userId, userId),
          eq(xpLedger.source, source),
          gte(xpLedger.createdAt, todayStart),
        ),
      );

    if ((countRow?.n ?? 0) >= cap) {
      return { awarded: false, amount: 0, reason: "daily_cap_reached" };
    }
  }

  // ── Duplicate guard for once-per-sourceId events ─────────────────────────
  if (
    sourceId &&
    ["mastery_achieved", "grand_master", "quiz_perfect"].includes(source)
  ) {
    const [existing] = await db
      .select({ n: count() })
      .from(xpLedger)
      .where(
        and(
          eq(xpLedger.userId, userId),
          eq(xpLedger.source, source),
          eq(xpLedger.sourceId, sourceId),
        ),
      );
    if ((existing?.n ?? 0) > 0) {
      return { awarded: false, amount: 0, reason: "already_awarded" };
    }
  }

  // ── Insert ledger entry ───────────────────────────────────────────────────
  await db.insert(xpLedger).values({
    userId,
    amount,
    source,
    sourceId: sourceId ?? null,
    description: description ?? null,
  });

  // ── Update studentLevels (upsert) ─────────────────────────────────────────
  const prevLevel = await db
    .select({ totalXp: studentLevels.totalXp, currentLevel: studentLevels.currentLevel })
    .from(studentLevels)
    .where(eq(studentLevels.userId, userId))
    .limit(1);

  const prevXp = prevLevel[0]?.totalXp ?? 0;
  const prevLvl = prevLevel[0]?.currentLevel ?? 1;
  const newTotalXp = prevXp + amount;
  const newLevel = computeLevel(newTotalXp);
  const newLevelName = getLevelName(newLevel);
  const leveledUp = newLevel > prevLvl;

  await db
    .insert(studentLevels)
    .values({ userId, totalXp: newTotalXp, currentLevel: newLevel, currentLevelName: newLevelName })
    .onDuplicateKeyUpdate({
      set: {
        totalXp: sql`totalXp + ${amount}`,
        currentLevel: newLevel,
        currentLevelName: newLevelName,
      },
    });

  return { awarded: true, amount, newTotalXp, newLevel, newLevelName, leveledUp };
}

// ─── Level computation ────────────────────────────────────────────────────────

function computeLevel(totalXp: number): number {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return level;
}

// ─── Get student XP summary ───────────────────────────────────────────────────

export async function getStudentXpSummary(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(studentLevels)
    .where(eq(studentLevels.userId, userId))
    .limit(1);

  if (!row) {
    return { totalXp: 0, currentLevel: 1, currentLevelName: "Rookie Learner", xpToNextLevel: LEVEL_THRESHOLDS[1] ?? 0 };
  }

  const nextThreshold = LEVEL_THRESHOLDS[row.currentLevel] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const prevThreshold = LEVEL_THRESHOLDS[row.currentLevel - 1] ?? 0;

  // Weekly XP: sum of xpLedger entries in the past 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const [weekRow] = await db
    .select({ weeklyXp: sql<number>`COALESCE(SUM(${xpLedger.amount}), 0)` })
    .from(xpLedger)
    .where(and(eq(xpLedger.userId, userId), gte(xpLedger.createdAt, weekAgo)));

  return {
    ...row,
    xpToNextLevel: Math.max(0, nextThreshold - row.totalXp),
    xpInCurrentLevel: row.totalXp - prevThreshold,
    xpNeededForCurrentLevel: nextThreshold - prevThreshold,
    weeklyXp: weekRow?.weeklyXp ?? 0,
  };
}
