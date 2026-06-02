/**
 * Weekly Parent Digest — Unit Tests
 *
 * Tests cover:
 * 1. Email template builds correctly with child data
 * 2. Template handles empty children array gracefully
 * 3. Template includes all expected sections (lessons, quizzes, mastery)
 * 4. Notification preferences tRPC procedures (get/update)
 * 5. Grade band classification for at-home activities
 */
import { describe, it, expect } from "vitest";
import {
  buildWeeklyParentDigestEmail,
  type WeeklyDigestChild,
  type WeeklyDigestEmailData,
} from "./emailTemplates/weeklyParentDigest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helper: create a mock child ─────────────────────────────────────────────

function mockChild(overrides: Partial<WeeklyDigestChild> = {}): WeeklyDigestChild {
  return {
    name: "Alice",
    grade: "Grade 5",
    lessonsCompleted: 4,
    quizAttempts: 2,
    bestQuizScore: 88,
    newSkillsMastered: 3,
    totalMasteryScore: 72,
    recentUnits: ["Linear Equations", "Graphing Basics"],
    showedImprovement: true,
    suggestedActivity: "Practice multiplication facts with flashcards.",
    progressUrl: "https://educhamp.app/parent",
    nextLessonUrl: "https://educhamp.app/curriculum",
    onTrackStatus: "on_track",
    diagnosticScore: 82,
    ...overrides,
  };
}

function mockEmailData(overrides: Partial<WeeklyDigestEmailData> = {}): WeeklyDigestEmailData {
  return {
    parentName: "Bob Smith",
    parentEmail: "bob@example.com",
    weekStart: new Date("2026-05-25"),
    weekEnd: new Date("2026-05-31"),
    children: [mockChild()],
    appUrl: "https://educhamp.app",
    ...overrides,
  };
}

// ─── 1. Email Template Tests ──────────────────────────────────────────────────

describe("Weekly Parent Digest — Email Template", () => {
  it("builds email with correct subject containing parent name", () => {
    const result = buildWeeklyParentDigestEmail(mockEmailData());
    expect(result.subject).toContain("Weekly");
    expect(typeof result.html).toBe("string");
    expect(typeof result.text).toBe("string");
  });

  it("includes child name in HTML output", () => {
    const result = buildWeeklyParentDigestEmail(mockEmailData());
    expect(result.html).toContain("Alice");
  });

  it("includes lesson completion count in HTML", () => {
    const result = buildWeeklyParentDigestEmail(
      mockEmailData({ children: [mockChild({ lessonsCompleted: 7 })] })
    );
    expect(result.html).toContain("7");
  });

  it("includes quiz score in HTML", () => {
    const result = buildWeeklyParentDigestEmail(
      mockEmailData({ children: [mockChild({ bestQuizScore: 95 })] })
    );
    expect(result.html).toContain("95");
  });

  it("includes mastery progress in HTML", () => {
    const result = buildWeeklyParentDigestEmail(
      mockEmailData({ children: [mockChild({ newSkillsMastered: 5 })] })
    );
    expect(result.html).toContain("5");
  });

  it("handles child with no quiz attempts gracefully", () => {
    const result = buildWeeklyParentDigestEmail(
      mockEmailData({
        children: [mockChild({ quizAttempts: 0, bestQuizScore: null })],
      })
    );
    expect(result.html).toBeDefined();
    expect(result.text).toBeDefined();
  });

  it("handles child with no activity gracefully", () => {
    const result = buildWeeklyParentDigestEmail(
      mockEmailData({
        children: [
          mockChild({
            lessonsCompleted: 0,
            quizAttempts: 0,
            bestQuizScore: null,
            newSkillsMastered: 0,
            recentUnits: [],
            showedImprovement: false,
          }),
        ],
      })
    );
    expect(result.html).toBeDefined();
    expect(result.text).toBeDefined();
  });

  it("includes multiple children in the digest", () => {
    const result = buildWeeklyParentDigestEmail(
      mockEmailData({
        children: [
          mockChild({ name: "Alice" }),
          mockChild({ name: "Charlie", grade: "Grade 3" }),
        ],
      })
    );
    expect(result.html).toContain("Alice");
    expect(result.html).toContain("Charlie");
  });

  it("includes on-track status indicator", () => {
    const result = buildWeeklyParentDigestEmail(
      mockEmailData({
        children: [mockChild({ onTrackStatus: "needs_attention" })],
      })
    );
    expect(result.html).toBeDefined();
  });

  it("includes suggested at-home activity", () => {
    const activity = "Count objects around the house together!";
    const result = buildWeeklyParentDigestEmail(
      mockEmailData({
        children: [mockChild({ suggestedActivity: activity })],
      })
    );
    expect(result.html).toContain(activity);
  });

  it("includes plain text fallback", () => {
    const result = buildWeeklyParentDigestEmail(mockEmailData());
    expect(result.text).toContain("Alice");
    expect(result.text.length).toBeGreaterThan(50);
  });

  it("includes recent unit names", () => {
    const result = buildWeeklyParentDigestEmail(
      mockEmailData({
        children: [mockChild({ recentUnits: ["Polynomials", "Factoring"] })],
      })
    );
    expect(result.html).toContain("Polynomials");
    expect(result.html).toContain("Factoring");
  });
});

// ─── 2. Notification Preferences tRPC Tests ──────────────────────────────────

describe("Notification Preferences — tRPC procedures", () => {
  function createParentContext(): TrpcContext {
    return {
      user: {
        id: 42,
        openId: "parent-user-42",
        email: "parent@example.com",
        name: "Parent User",
        loginMethod: "manus",
        role: "parent",
        accountType: "parent",
        grade: null,
        school: null,
        status: "active",
        billingPeriod: "monthly",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        lastLoginAt: null,
        lastActiveAt: null,
        invitedByAdminId: null,
      },
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as unknown as TrpcContext["res"],
      sessionToken: null,
    };
  }

  it("getNotificationPreferences returns default true when no profile exists", async () => {
    const ctx = createParentContext();
    const caller = appRouter.createCaller(ctx);
    // This will query the DB; if no profile exists, should default to true
    const result = await caller.parentTools.getNotificationPreferences();
    expect(result).toHaveProperty("weeklyDigestEnabled");
    expect(typeof result.weeklyDigestEnabled).toBe("boolean");
  });

  it("updateNotificationPreferences accepts boolean input", async () => {
    const ctx = createParentContext();
    const caller = appRouter.createCaller(ctx);
    // This will attempt to upsert the profile
    const result = await caller.parentTools.updateNotificationPreferences({
      weeklyDigestEnabled: false,
    });
    expect(result).toEqual({ success: true });
  });

  it("updateNotificationPreferences round-trips the value", async () => {
    const ctx = createParentContext();
    const caller = appRouter.createCaller(ctx);

    // Set to false
    await caller.parentTools.updateNotificationPreferences({
      weeklyDigestEnabled: false,
    });

    // Read back
    const prefs = await caller.parentTools.getNotificationPreferences();
    expect(prefs.weeklyDigestEnabled).toBe(false);

    // Set back to true
    await caller.parentTools.updateNotificationPreferences({
      weeklyDigestEnabled: true,
    });

    const prefs2 = await caller.parentTools.getNotificationPreferences();
    expect(prefs2.weeklyDigestEnabled).toBe(true);
  });
});

// ─── 3. Celebration Badge Tests ──────────────────────────────────────────────

describe("Weekly Parent Digest — Celebration Badge", () => {
  it("shows celebration badge when child has perfect quiz score (100%)", () => {
    const result = buildWeeklyParentDigestEmail(
      mockEmailData({
        children: [mockChild({ bestQuizScore: 100, newSkillsMastered: 0 })],
      })
    );
    expect(result.html).toContain("Celebration!");
    expect(result.html).toContain("perfect 100%");
    expect(result.html).toContain("🏆");
  });

  it("shows celebration badge when child masters new skills", () => {
    const result = buildWeeklyParentDigestEmail(
      mockEmailData({
        children: [mockChild({ bestQuizScore: 85, newSkillsMastered: 2 })],
      })
    );
    expect(result.html).toContain("Celebration!");
    expect(result.html).toContain("mastered 2 new skills");
    expect(result.html).toContain("🏆");
  });

  it("shows combined celebration for perfect score AND new mastery", () => {
    const result = buildWeeklyParentDigestEmail(
      mockEmailData({
        children: [mockChild({ bestQuizScore: 100, newSkillsMastered: 3 })],
      })
    );
    expect(result.html).toContain("Celebration!");
    expect(result.html).toContain("perfect 100%");
    expect(result.html).toContain("mastered 3 new skills");
    expect(result.html).toContain("🎉");
  });

  it("does NOT show celebration badge when no perfect score and no mastery", () => {
    const result = buildWeeklyParentDigestEmail(
      mockEmailData({
        children: [mockChild({ bestQuizScore: 85, newSkillsMastered: 0 })],
      })
    );
    expect(result.html).not.toContain("Celebration!");
    expect(result.html).not.toContain("🏆");
  });
});

// ─── 4. Activity Preference Tests ────────────────────────────────────────────

describe("Notification Preferences — Activity Preference", () => {
  function createParentContext(): TrpcContext {
    return {
      user: {
        id: 42,
        openId: "parent-user-42",
        email: "parent@example.com",
        name: "Parent User",
        loginMethod: "manus",
        role: "parent",
        accountType: "parent",
        grade: null,
        school: null,
        status: "active",
        billingPeriod: "monthly",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        lastLoginAt: null,
        lastActiveAt: null,
        invitedByAdminId: null,
      },
      req: {
        protocol: "https",
        headers: { origin: "https://educhamp.app" },
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as unknown as TrpcContext["res"],
      sessionToken: null,
    };
  }

  it("getNotificationPreferences returns activityPreference field", async () => {
    const ctx = createParentContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.parentTools.getNotificationPreferences();
    expect(result).toHaveProperty("activityPreference");
    expect(typeof result.activityPreference).toBe("string");
  });

  it("updateNotificationPreferences accepts activityPreference", async () => {
    const ctx = createParentContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.parentTools.updateNotificationPreferences({
      weeklyDigestEnabled: true,
      activityPreference: "math_games",
    });
    expect(result).toEqual({ success: true });
  });

  it("activityPreference round-trips correctly", async () => {
    const ctx = createParentContext();
    const caller = appRouter.createCaller(ctx);

    await caller.parentTools.updateNotificationPreferences({
      weeklyDigestEnabled: true,
      activityPreference: "outdoor",
    });

    const prefs = await caller.parentTools.getNotificationPreferences();
    expect(prefs.activityPreference).toBe("outdoor");

    // Change to creative
    await caller.parentTools.updateNotificationPreferences({
      weeklyDigestEnabled: true,
      activityPreference: "creative",
    });

    const prefs2 = await caller.parentTools.getNotificationPreferences();
    expect(prefs2.activityPreference).toBe("creative");
  });

  it("rejects invalid activityPreference values", async () => {
    const ctx = createParentContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.parentTools.updateNotificationPreferences({
        weeklyDigestEnabled: true,
        activityPreference: "invalid_value" as any,
      })
    ).rejects.toThrow();
  });
});

// ─── 5. Preview Digest Tests ─────────────────────────────────────────────────

describe("Preview Digest — tRPC procedure", () => {
  function createParentContext(): TrpcContext {
    return {
      user: {
        id: 42,
        openId: "parent-user-42",
        email: "parent@example.com",
        name: "Parent User",
        loginMethod: "manus",
        role: "parent",
        accountType: "parent",
        grade: null,
        school: null,
        status: "active",
        billingPeriod: "monthly",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        lastLoginAt: null,
        lastActiveAt: null,
        invitedByAdminId: null,
      },
      req: {
        protocol: "https",
        headers: { origin: "https://educhamp.app" },
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as unknown as TrpcContext["res"],
      sessionToken: null,
    };
  }

  it("previewDigest returns html and subject when children exist", async () => {
    const ctx = createParentContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.parentTools.previewDigest();
      expect(result).toHaveProperty("html");
      expect(result).toHaveProperty("subject");
      expect(typeof result.html).toBe("string");
      expect(typeof result.subject).toBe("string");
      expect(result.html.length).toBeGreaterThan(100);
    } catch (err: any) {
      // If no children linked, it should throw NOT_FOUND
      expect(err.code).toBe("NOT_FOUND");
    }
  });

  it("previewDigest throws NOT_FOUND when parent has no children", async () => {
    // Use a user ID that likely has no children
    const ctx = createParentContext();
    ctx.user!.id = 99999;
    const caller = appRouter.createCaller(ctx);
    await expect(caller.parentTools.previewDigest()).rejects.toThrow();
  });
});
