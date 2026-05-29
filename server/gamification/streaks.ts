/**
 * gamification/streaks.ts
 * Daily streak tracking with freeze support and streak-based XP bonuses.
 */

import { getDb } from "../db";
import { streaks } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { awardXp } from "./xp";
import { checkAndAwardBadges } from "./badges";

// ─── Record daily activity ────────────────────────────────────────────────────

export interface StreakUpdateResult {
  currentStreak: number;
  longestStreak: number;
  streakIncreased: boolean;
  streakBroken: boolean;
  xpAwarded: number;
  newBadges: string[];
}

export async function recordActivity(userId: number): Promise<StreakUpdateResult> {
  const db = await getDb();
  if (!db) {
    return { currentStreak: 0, longestStreak: 0, streakIncreased: false, streakBroken: false, xpAwarded: 0, newBadges: [] };
  }

  const today = getTodayString();
  const yesterday = getYesterdayString();

  const [existing] = await db.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);

  if (!existing) {
    // First ever activity
    await db.insert(streaks).values({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: today,
      streakFreezeCount: 0,
    });
    const xpResult = await awardXp(userId, "streak_bonus", 10, `streak_${today}`, "Day 1 streak bonus");
    const newBadges = await checkAndAwardBadges(userId, { type: "streak_update", currentStreak: 1 });
    return {
      currentStreak: 1,
      longestStreak: 1,
      streakIncreased: true,
      streakBroken: false,
      xpAwarded: xpResult.awarded ? xpResult.amount : 0,
      newBadges: newBadges.map((b) => b.key),
    };
  }

  // Already recorded today
  if (existing.lastActivityDate === today) {
    return {
      currentStreak: existing.currentStreak,
      longestStreak: existing.longestStreak,
      streakIncreased: false,
      streakBroken: false,
      xpAwarded: 0,
      newBadges: [],
    };
  }

  let newStreak: number;
  let streakBroken = false;

  if (existing.lastActivityDate === yesterday) {
    // Consecutive day
    newStreak = existing.currentStreak + 1;
  } else {
    // Streak broken — check for freeze
    if (existing.streakFreezeCount > 0) {
      newStreak = existing.currentStreak + 1;
      await db
        .update(streaks)
        .set({ streakFreezeCount: existing.streakFreezeCount - 1 })
        .where(eq(streaks.userId, userId));
    } else {
      newStreak = 1;
      streakBroken = existing.currentStreak > 1;
    }
  }

  const newLongest = Math.max(existing.longestStreak, newStreak);

  await db
    .update(streaks)
    .set({ currentStreak: newStreak, longestStreak: newLongest, lastActivityDate: today })
    .where(eq(streaks.userId, userId));

  // Award streak XP (10 XP × min(streak, 10), capped at 100)
  const streakXp = Math.min(newStreak, 10) * 10;
  const xpResult = await awardXp(userId, "streak_bonus", streakXp, `streak_${today}`, `${newStreak}-day streak bonus`);

  // Check streak badges
  const newBadges = await checkAndAwardBadges(userId, { type: "streak_update", currentStreak: newStreak });

  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    streakIncreased: true,
    streakBroken,
    xpAwarded: xpResult.awarded ? xpResult.amount : 0,
    newBadges: newBadges.map((b) => b.key),
  };
}

// ─── Get streak for user ──────────────────────────────────────────────────────

export async function getStreak(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const [row] = await db.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);
  if (!row) return { currentStreak: 0, longestStreak: 0, streakFreezeCount: 0, lastActivityDate: null, isActiveToday: false };

  const today = getTodayString();
  return { ...row, isActiveToday: row.lastActivityDate === today };
}

// ─── Use streak freeze ────────────────────────────────────────────────────────

export async function addStreakFreeze(userId: number, count = 1): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const [existing] = await db.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);
  if (existing) {
    await db
      .update(streaks)
      .set({ streakFreezeCount: existing.streakFreezeCount + count })
      .where(eq(streaks.userId, userId));
  } else {
    await db.insert(streaks).values({ userId, currentStreak: 0, longestStreak: 0, streakFreezeCount: count });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
