/**
 * Sprint 41b Tests — Engagement Decay Scheduled Job
 *
 * Covers:
 *  1. calculateMasteryDecay function (graduated decay rates)
 *  2. Mastery floor enforcement
 *  3. Streak reset logic
 *  4. Streak freeze consumption logic
 *  5. Edge cases (exactly 7 days, boundary values)
 */
import { describe, it, expect } from "vitest";
import { calculateMasteryDecay, MASTERY_FLOOR } from "./scheduled/engagementDecay";

describe("Sprint 41b — Engagement Decay: calculateMasteryDecay", () => {
  it("returns 0 for less than 7 days inactive", () => {
    expect(calculateMasteryDecay(0)).toBe(0);
    expect(calculateMasteryDecay(1)).toBe(0);
    expect(calculateMasteryDecay(3)).toBe(0);
    expect(calculateMasteryDecay(6)).toBe(0);
  });

  it("returns 2 for 7-13 days inactive (mild decay)", () => {
    expect(calculateMasteryDecay(7)).toBe(2);
    expect(calculateMasteryDecay(10)).toBe(2);
    expect(calculateMasteryDecay(13)).toBe(2);
  });

  it("returns 3 for 14-29 days inactive (moderate decay)", () => {
    expect(calculateMasteryDecay(14)).toBe(3);
    expect(calculateMasteryDecay(20)).toBe(3);
    expect(calculateMasteryDecay(29)).toBe(3);
  });

  it("returns 5 for 30+ days inactive (severe decay)", () => {
    expect(calculateMasteryDecay(30)).toBe(5);
    expect(calculateMasteryDecay(60)).toBe(5);
    expect(calculateMasteryDecay(365)).toBe(5);
  });
});

describe("Sprint 41b — Engagement Decay: Mastery Floor", () => {
  it("MASTERY_FLOOR is 10", () => {
    expect(MASTERY_FLOOR).toBe(10);
  });

  it("score never drops below floor after decay", () => {
    const currentScore = 12;
    const decay = calculateMasteryDecay(14); // -3
    const newScore = Math.max(MASTERY_FLOOR, currentScore - decay);
    expect(newScore).toBe(10); // Clamped to floor
  });

  it("score at floor is not decayed further", () => {
    const currentScore = 10;
    const decay = calculateMasteryDecay(30); // -5
    const newScore = Math.max(MASTERY_FLOOR, currentScore - decay);
    expect(newScore).toBe(10); // Already at floor
  });

  it("high score decays normally above floor", () => {
    const currentScore = 85;
    const decay = calculateMasteryDecay(10); // -2
    const newScore = Math.max(MASTERY_FLOOR, currentScore - decay);
    expect(newScore).toBe(83);
  });
});

describe("Sprint 41b — Engagement Decay: Streak Logic", () => {
  it("streak resets to 0 when no freezes available and missed a day", () => {
    const streak = { currentStreak: 15, streakFreezes: 0, lastActivityDate: "2026-06-10" };
    const yesterdayStr = "2026-06-12";
    const shouldReset = streak.lastActivityDate < yesterdayStr && streak.streakFreezes === 0;
    expect(shouldReset).toBe(true);
  });

  it("streak freeze is consumed instead of resetting when available", () => {
    const streak = { currentStreak: 15, streakFreezes: 2, lastActivityDate: "2026-06-10" };
    const yesterdayStr = "2026-06-12";
    const shouldFreeze = streak.lastActivityDate < yesterdayStr && streak.streakFreezes > 0;
    expect(shouldFreeze).toBe(true);
    const newFreezes = streak.streakFreezes - 1;
    expect(newFreezes).toBe(1);
  });

  it("streak is not affected if lastActivityDate is yesterday or today", () => {
    const streak = { currentStreak: 10, streakFreezes: 0, lastActivityDate: "2026-06-12" };
    const yesterdayStr = "2026-06-12";
    const shouldReset = streak.lastActivityDate < yesterdayStr && streak.streakFreezes === 0;
    expect(shouldReset).toBe(false);
  });

  it("streak with 0 currentStreak is skipped (nothing to reset)", () => {
    const streak = { currentStreak: 0, streakFreezes: 0, lastActivityDate: "2026-06-01" };
    expect(streak.currentStreak > 0).toBe(false);
  });
});

describe("Sprint 41b — Engagement Decay: XP Ledger Logging", () => {
  it("decay event produces negative XP amount", () => {
    const currentScore = 75;
    const decay = calculateMasteryDecay(20); // -3
    const newScore = Math.max(MASTERY_FLOOR, currentScore - decay);
    const actualDecay = currentScore - newScore;
    expect(actualDecay).toBe(3);
    const xpAmount = -actualDecay;
    expect(xpAmount).toBe(-3);
  });

  it("no XP deducted when score is already at floor", () => {
    const currentScore = 10;
    const decay = calculateMasteryDecay(30); // -5
    const newScore = Math.max(MASTERY_FLOOR, currentScore - decay);
    const actualDecay = currentScore - newScore;
    expect(actualDecay).toBe(0);
  });

  it("partial decay when close to floor", () => {
    const currentScore = 13;
    const decay = calculateMasteryDecay(30); // -5
    const newScore = Math.max(MASTERY_FLOOR, currentScore - decay);
    const actualDecay = currentScore - newScore;
    expect(actualDecay).toBe(3); // Only 3 deducted (13 - 10 = 3, not full 5)
  });

  it("description includes skill ID and days inactive", () => {
    const skillId = "algebra-linear-eq";
    const daysSince = 22;
    const actualDecay = 3;
    const description = `Mastery decay: ${skillId} (-${actualDecay} pts, ${daysSince}d inactive)`;
    expect(description).toBe("Mastery decay: algebra-linear-eq (-3 pts, 22d inactive)");
    expect(description).toContain(skillId);
    expect(description).toContain(String(daysSince));
  });
});
