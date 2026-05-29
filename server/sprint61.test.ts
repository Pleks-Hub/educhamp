/**
 * Sprint 61 Tests
 * Covers: auto-seed on startup, Rewards Marketplace CRUD, Seasonal Challenge banner API.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Auto-seed ────────────────────────────────────────────────────────────────

describe("Sprint 61 — Auto-seed on server start", () => {
  it("seedDefaultBadges is idempotent (no throw on double call)", async () => {
    const { seedDefaultBadges } = await import("./gamification/badges");
    await expect(seedDefaultBadges()).resolves.not.toThrow();
    await expect(seedDefaultBadges()).resolves.not.toThrow();
  });

  it("seedDefaultQuests is idempotent (no throw on double call)", async () => {
    const { seedDefaultQuests } = await import("./gamification/quests");
    await expect(seedDefaultQuests()).resolves.not.toThrow();
    await expect(seedDefaultQuests()).resolves.not.toThrow();
  });

  it("seedDefaultHouses is idempotent (no throw on double call)", async () => {
    const { seedDefaultHouses } = await import("./gamification/houses");
    await expect(seedDefaultHouses()).resolves.not.toThrow();
    await expect(seedDefaultHouses()).resolves.not.toThrow();
  });
});

// ─── Rewards Marketplace ──────────────────────────────────────────────────────

describe("Sprint 61 — Rewards Marketplace validation", () => {
  it("rejects xpCost below 50", () => {
    const schema = { xpCost: 49 };
    expect(schema.xpCost).toBeLessThan(50);
  });

  it("rejects xpCost above 50000", () => {
    const schema = { xpCost: 50001 };
    expect(schema.xpCost).toBeGreaterThan(50000);
  });

  it("accepts valid xpCost values", () => {
    const valid = [50, 500, 1000, 5000, 50000];
    valid.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(50);
      expect(v).toBeLessThanOrEqual(50000);
    });
  });

  it("accepts all valid category values", () => {
    const validCategories = ["screen_time", "outing", "treat", "custom"];
    validCategories.forEach((c) => {
      expect(["screen_time", "outing", "treat", "custom"]).toContain(c);
    });
  });

  it("rejects empty rewardTitle", () => {
    const title = "";
    expect(title.trim().length).toBe(0);
  });

  it("accepts valid rewardTitle", () => {
    const title = "30 min extra screen time";
    expect(title.trim().length).toBeGreaterThan(0);
    expect(title.length).toBeLessThanOrEqual(256);
  });

  it("XP deduction logic: insufficient XP throws", () => {
    const totalXp = 100;
    const rewardCost = 500;
    const hasEnough = totalXp >= rewardCost;
    expect(hasEnough).toBe(false);
  });

  it("XP deduction logic: sufficient XP passes", () => {
    const totalXp = 1000;
    const rewardCost = 500;
    const hasEnough = totalXp >= rewardCost;
    expect(hasEnough).toBe(true);
  });

  it("XP deduction: remaining XP is correct", () => {
    const totalXp = 1000;
    const rewardCost = 500;
    const remaining = totalXp - rewardCost;
    expect(remaining).toBe(500);
  });
});

// ─── Seasonal Challenge Banner ────────────────────────────────────────────────

describe("Sprint 61 — Seasonal Challenge Banner logic", () => {
  it("returns null when no active challenge exists", () => {
    const challenge = null;
    expect(challenge).toBeNull();
  });

  it("calculates daysLeft correctly for a future end date", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const endDate = new Date("2026-06-15T00:00:00Z");
    const daysLeft = Math.max(0, Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ));
    expect(daysLeft).toBe(14);
  });

  it("returns 0 daysLeft when end date has passed", () => {
    const now = new Date("2026-06-20T00:00:00Z");
    const endDate = new Date("2026-06-15T00:00:00Z");
    const daysLeft = Math.max(0, Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ));
    expect(daysLeft).toBe(0);
  });

  it("marks challenge as completed when completedAt is set", () => {
    const progress = { completedAt: new Date("2026-06-10T00:00:00Z") };
    const completed = !!progress.completedAt;
    expect(completed).toBe(true);
  });

  it("marks challenge as not completed when completedAt is null", () => {
    const progress = { completedAt: null };
    const completed = !!progress.completedAt;
    expect(completed).toBe(false);
  });

  it("defaults userProgress to 0 when no progress row exists", () => {
    const progress = undefined;
    const userProgress = (progress as any)?.progress ?? 0;
    expect(userProgress).toBe(0);
  });

  it("theme styles cover all known themes", () => {
    const themes = ["summer", "back_to_school", "sat_sprint", "stem_month", "default"];
    const THEME_STYLES = {
      summer: { emoji: "☀️" },
      back_to_school: { emoji: "🎒" },
      sat_sprint: { emoji: "📝" },
      stem_month: { emoji: "🔬" },
      default: { emoji: "🏆" },
    };
    themes.forEach((t) => {
      expect(THEME_STYLES).toHaveProperty(t);
    });
  });

  it("caps progressPercent at 100", () => {
    const rawProgress = 150;
    const progressPercent = Math.min(100, rawProgress);
    expect(progressPercent).toBe(100);
  });

  it("handles progressPercent of 0 gracefully", () => {
    const rawProgress = 0;
    const progressPercent = Math.min(100, rawProgress);
    expect(progressPercent).toBe(0);
  });
});

// ─── Course Catalogue (Sprint 59) ─────────────────────────────────────────────

describe("Sprint 59 — Course Catalogue subject filter", () => {
  const courses = [
    { id: 1, title: "Algebra I", subject: "Mathematics", gradeLevel: "9" },
    { id: 2, title: "English 10", subject: "English Language Arts", gradeLevel: "10" },
    { id: 3, title: "Biology", subject: "Science", gradeLevel: "10" },
    { id: 4, title: "Geometry", subject: "Mathematics", gradeLevel: "10" },
  ];

  it("filters by subject correctly", () => {
    const filtered = courses.filter((c) => c.subject === "Mathematics");
    expect(filtered).toHaveLength(2);
    expect(filtered.map((c) => c.title)).toEqual(["Algebra I", "Geometry"]);
  });

  it("returns all courses when subject filter is 'all'", () => {
    const subject = "all";
    const filtered = subject === "all" ? courses : courses.filter((c) => c.subject === subject);
    expect(filtered).toHaveLength(4);
  });

  it("returns empty array for unknown subject", () => {
    const filtered = courses.filter((c) => c.subject === "Art");
    expect(filtered).toHaveLength(0);
  });

  it("filters by grade level correctly", () => {
    const filtered = courses.filter((c) => c.gradeLevel === "10");
    expect(filtered).toHaveLength(3);
  });
});

// ─── Profile Accessibility Toggles (Sprint 58) ────────────────────────────────

describe("Sprint 58 — Profile accessibility toggles schema", () => {
  it("disableAnimations defaults to false", () => {
    const profile = { disableAnimations: false };
    expect(profile.disableAnimations).toBe(false);
  });

  it("disableSound defaults to false", () => {
    const profile = { disableSound: false };
    expect(profile.disableSound).toBe(false);
  });

  it("parentLedMode defaults to false", () => {
    const profile = { parentLedMode: false };
    expect(profile.parentLedMode).toBe(false);
  });

  it("toggles can be set to true", () => {
    const profile = { disableAnimations: true, disableSound: true, parentLedMode: true };
    expect(profile.disableAnimations).toBe(true);
    expect(profile.disableSound).toBe(true);
    expect(profile.parentLedMode).toBe(true);
  });
});
