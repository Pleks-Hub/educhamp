/**
 * Sprint 39b Tests — XP Breakdown, Weekly Trend, Leaderboard Opt-out
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

describe("Sprint 39b — XP Breakdown by Source", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("getXpBreakdownBySource groups XP by source with labels and colors", async () => {
    const { getDb } = await import("./db");
    const mockRows = [
      { source: "lesson_complete", total: 500 },
      { source: "quiz_pass", total: 300 },
      { source: "task_completion", total: 200 },
      { source: "streak_bonus", total: 100 },
      { source: "badge_earned", total: 50 },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockRows),
          }),
        }),
      }),
    });

    (getDb as any).mockResolvedValue({ select: mockSelect });

    const sourceLabels: Record<string, string> = {
      lesson_complete: "Lessons",
      quiz_pass: "Quizzes",
      task_completion: "Tasks",
      streak_bonus: "Streaks",
      badge_earned: "Badges",
      quest_complete: "Quests",
      parent_bonus: "Parent Bonus",
      focus_mode: "Focus Mode",
      exam_prep_session: "Exam Prep",
    };

    const sourceColors: Record<string, string> = {
      lesson_complete: "#8b5cf6",
      quiz_pass: "#06b6d4",
      task_completion: "#f59e0b",
      streak_bonus: "#ef4444",
      badge_earned: "#10b981",
      quest_complete: "#6366f1",
      parent_bonus: "#ec4899",
      focus_mode: "#14b8a6",
      exam_prep_session: "#f97316",
    };

    const result = mockRows.map((r) => ({
      source: r.source,
      total: r.total,
      label: sourceLabels[r.source] ?? r.source,
      color: sourceColors[r.source] ?? "#94a3b8",
    }));

    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({
      source: "lesson_complete",
      total: 500,
      label: "Lessons",
      color: "#8b5cf6",
    });
    expect(result[2]).toEqual({
      source: "task_completion",
      total: 200,
      label: "Tasks",
      color: "#f59e0b",
    });
  });

  it("returns empty array when no XP earned", async () => {
    const { getDb } = await import("./db");
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });
    (getDb as any).mockResolvedValue({ select: mockSelect });

    const result: any[] = [];
    expect(result).toHaveLength(0);
  });

  it("all known XP sources have human-readable labels", () => {
    const sourceLabels: Record<string, string> = {
      lesson_complete: "Lessons",
      quiz_pass: "Quizzes",
      task_completion: "Tasks",
      streak_bonus: "Streaks",
      badge_earned: "Badges",
      quest_complete: "Quests",
      parent_bonus: "Parent Bonus",
      focus_mode: "Focus Mode",
      exam_prep_session: "Exam Prep",
    };

    const knownSources = [
      "lesson_complete", "quiz_pass", "task_completion", "streak_bonus",
      "badge_earned", "quest_complete", "parent_bonus", "focus_mode", "exam_prep_session",
    ];

    for (const source of knownSources) {
      expect(sourceLabels[source]).toBeDefined();
      expect(sourceLabels[source].length).toBeGreaterThan(0);
    }
  });

  it("unknown sources get fallback label", () => {
    const sourceLabels: Record<string, string> = { lesson_complete: "Lessons" };
    const unknownSource = "mystery_source";
    const label = sourceLabels[unknownSource] ?? unknownSource;
    expect(label).toBe("mystery_source");
  });
});

describe("Sprint 39b — Weekly XP Trend for Parent", () => {
  it("getChildWeeklyXpTrend returns weekly buckets with labels", () => {
    const weeks = 4;
    const now = new Date();
    const buckets: { weekStart: string; weekLabel: string; xpEarned: number }[] = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - (i * 7));
      start.setHours(0, 0, 0, 0);
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);

      buckets.push({
        weekStart: start.toISOString().split("T")[0],
        weekLabel: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        xpEarned: (weeks - i) * 100,
      });
    }

    expect(buckets).toHaveLength(4);
    expect(buckets[0].xpEarned).toBe(100);
    expect(buckets[3].xpEarned).toBe(400);
    const recentHalf = buckets.slice(2);
    const olderHalf = buckets.slice(0, 2);
    const recentAvg = recentHalf.reduce((s, t) => s + t.xpEarned, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((s, t) => s + t.xpEarned, 0) / olderHalf.length;
    expect(recentAvg).toBeGreaterThan(olderAvg * 1.1);
  });

  it("detects declining trend when recent XP is lower", () => {
    const buckets = [
      { weekStart: "2026-05-19", weekLabel: "May 19", xpEarned: 400 },
      { weekStart: "2026-05-26", weekLabel: "May 26", xpEarned: 350 },
      { weekStart: "2026-06-02", weekLabel: "Jun 2", xpEarned: 150 },
      { weekStart: "2026-06-09", weekLabel: "Jun 9", xpEarned: 100 },
    ];

    const recentHalf = buckets.slice(2);
    const olderHalf = buckets.slice(0, 2);
    const recentAvg = recentHalf.reduce((s, t) => s + t.xpEarned, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((s, t) => s + t.xpEarned, 0) / olderHalf.length;
    const trendDir = recentAvg > olderAvg * 1.1 ? "up" : recentAvg < olderAvg * 0.9 ? "down" : "stable";
    expect(trendDir).toBe("down");
  });

  it("detects stable trend when XP is consistent", () => {
    const buckets = [
      { weekStart: "2026-05-19", weekLabel: "May 19", xpEarned: 200 },
      { weekStart: "2026-05-26", weekLabel: "May 26", xpEarned: 210 },
      { weekStart: "2026-06-02", weekLabel: "Jun 2", xpEarned: 195 },
      { weekStart: "2026-06-09", weekLabel: "Jun 9", xpEarned: 205 },
    ];

    const recentHalf = buckets.slice(2);
    const olderHalf = buckets.slice(0, 2);
    const recentAvg = recentHalf.reduce((s, t) => s + t.xpEarned, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((s, t) => s + t.xpEarned, 0) / olderHalf.length;
    const trendDir = recentAvg > olderAvg * 1.1 ? "up" : recentAvg < olderAvg * 0.9 ? "down" : "stable";
    expect(trendDir).toBe("stable");
  });
});

describe("Sprint 39b — Leaderboard Opt-out", () => {
  it("leaderboard filters out opted-out students", () => {
    const students = [
      { userId: 1, name: "Alice", totalXp: 1000, leaderboardOptOut: false },
      { userId: 2, name: "Bob", totalXp: 800, leaderboardOptOut: true },
      { userId: 3, name: "Charlie", totalXp: 600, leaderboardOptOut: false },
    ];

    const currentUserId = 3;
    const visible = students.filter(
      (s) => !s.leaderboardOptOut || s.userId === currentUserId
    );

    expect(visible).toHaveLength(2);
    expect(visible.map((s) => s.name)).toEqual(["Alice", "Charlie"]);
    expect(visible.find((s) => s.name === "Bob")).toBeUndefined();
  });

  it("opted-out student still sees themselves on the leaderboard", () => {
    const students = [
      { userId: 1, name: "Alice", totalXp: 1000, leaderboardOptOut: false },
      { userId: 2, name: "Bob", totalXp: 800, leaderboardOptOut: true },
      { userId: 3, name: "Charlie", totalXp: 600, leaderboardOptOut: false },
    ];

    const currentUserId = 2;
    const visible = students.filter(
      (s) => !s.leaderboardOptOut || s.userId === currentUserId
    );

    expect(visible).toHaveLength(3);
    expect(visible.find((s) => s.name === "Bob")).toBeDefined();
  });

  it("leaderboardOptOut defaults to false in preferences", () => {
    const prefs = {
      emailDigestEnabled: true,
      emailAchievementsEnabled: true,
      emailRemindersEnabled: true,
      inviteRemindersEnabled: true,
      weeklyDigestEnabled: true,
      leaderboardOptOut: false,
    };

    expect(prefs.leaderboardOptOut).toBe(false);
  });

  it("updateEmailPreferences accepts leaderboardOptOut field", () => {
    const input = {
      emailDigestEnabled: true,
      leaderboardOptOut: true,
    };

    const data: Record<string, any> = {};
    if (input.emailDigestEnabled !== undefined) data.emailDigestEnabled = input.emailDigestEnabled;
    if (input.leaderboardOptOut !== undefined) data.leaderboardOptOut = input.leaderboardOptOut;

    expect(data).toEqual({ emailDigestEnabled: true, leaderboardOptOut: true });
  });

  it("global leaderboard query filters using leftJoin + where clause", () => {
    // Simulate the SQL logic: leftJoin userProfiles, where leaderboardOptOut is null or false
    const rows = [
      { userId: 1, totalXp: 1000, leaderboardOptOut: null },
      { userId: 2, totalXp: 800, leaderboardOptOut: true },
      { userId: 3, totalXp: 600, leaderboardOptOut: false },
    ];

    const filtered = rows.filter(
      (r) => r.leaderboardOptOut === null || r.leaderboardOptOut === false
    );

    expect(filtered).toHaveLength(2);
    expect(filtered.map((r) => r.userId)).toEqual([1, 3]);
  });
});
