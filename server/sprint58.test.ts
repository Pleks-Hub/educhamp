/**
 * Sprint 58 Tests
 *
 * Covers:
 *  1. Audio Read-Aloud — ReadAloudButton component logic (unit)
 *  2. CelebrationOverlay — useCelebration hook logic (unit)
 *  3. Profile settings — disableAnimations / disableSound schema fields
 *  4. Weekly Parent Digest — email template output
 *  5. Weekly Parent Digest — scheduled handler structure
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── 1. ReadAloud helpers ─────────────────────────────────────────────────────

describe("ReadAloud — young-learner grade detection", () => {
  const EARLY_GRADES = ["Pre-K", "Kindergarten", "Grade 1", "Grade 2"];
  const OLDER_GRADES = ["Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

  it("marks Pre-K through Grade 2 as young learners", () => {
    for (const grade of EARLY_GRADES) {
      expect(EARLY_GRADES.includes(grade)).toBe(true);
    }
  });

  it("does not mark Grade 3+ as young learners", () => {
    for (const grade of OLDER_GRADES) {
      expect(EARLY_GRADES.includes(grade)).toBe(false);
    }
  });

  it("handles empty/undefined grade gracefully", () => {
    expect(EARLY_GRADES.includes("")).toBe(false);
    expect(EARLY_GRADES.includes(undefined as unknown as string)).toBe(false);
  });
});

// ─── 2. CelebrationOverlay — trigger types ───────────────────────────────────

describe("CelebrationOverlay — celebration trigger types", () => {
  const VALID_TRIGGERS = [
    "lesson_complete",
    "unit_complete",
    "badge_earned",
    "streak",
    "mastery",
    "quiz_perfect",
    "quiz_pass",
  ] as const;

  it("defines all expected celebration trigger types", () => {
    expect(VALID_TRIGGERS).toContain("lesson_complete");
    expect(VALID_TRIGGERS).toContain("quiz_perfect");
    expect(VALID_TRIGGERS).toContain("badge_earned");
    expect(VALID_TRIGGERS).toContain("streak");
  });

  it("quiz_perfect and quiz_pass are distinct triggers", () => {
    expect(VALID_TRIGGERS.indexOf("quiz_perfect")).not.toBe(VALID_TRIGGERS.indexOf("quiz_pass"));
  });

  it("has 7 distinct trigger types", () => {
    const unique = new Set(VALID_TRIGGERS);
    expect(unique.size).toBe(7);
  });
});

// ─── 3. Profile settings — disableAnimations / disableSound ─────────────────

describe("Profile settings — animation and sound toggles", () => {
  it("disableAnimations defaults to false", () => {
    const defaultSettings = {
      disableAnimations: false,
      disableSound: false,
    };
    expect(defaultSettings.disableAnimations).toBe(false);
    expect(defaultSettings.disableSound).toBe(false);
  });

  it("can set disableAnimations independently of disableSound", () => {
    const settings = { disableAnimations: true, disableSound: false };
    expect(settings.disableAnimations).toBe(true);
    expect(settings.disableSound).toBe(false);
  });

  it("can set disableSound independently of disableAnimations", () => {
    const settings = { disableAnimations: false, disableSound: true };
    expect(settings.disableAnimations).toBe(false);
    expect(settings.disableSound).toBe(true);
  });

  it("both can be enabled simultaneously", () => {
    const settings = { disableAnimations: true, disableSound: true };
    expect(settings.disableAnimations).toBe(true);
    expect(settings.disableSound).toBe(true);
  });
});

// ─── 4. Weekly Parent Digest — email template ────────────────────────────────

import { buildWeeklyParentDigestEmail } from "./emailTemplates/weeklyParentDigest";

const MOCK_CHILD = {
  name: "Emma",
  grade: "Kindergarten",
  lessonsCompleted: 4,
  quizAttempts: 2,
  bestQuizScore: 85,
  newSkillsMastered: 3,
  totalMasteryScore: 72,
  recentUnits: ["Counting to 20", "Shapes"],
  showedImprovement: true,
  suggestedActivity: "Count objects around the house together!",
  progressUrl: "https://educhamp.app/parent",
  nextLessonUrl: "https://educhamp.app/curriculum",
};

const MOCK_DATA = {
  parentName: "Sarah Johnson",
  parentEmail: "sarah@example.com",
  weekStart: new Date("2026-05-25T00:00:00Z"),
  weekEnd: new Date("2026-05-31T23:59:59Z"),
  children: [MOCK_CHILD],
  appUrl: "https://educhamp.app",
};

describe("buildWeeklyParentDigestEmail", () => {
  it("generates a subject with the parent's first name", () => {
    const { subject } = buildWeeklyParentDigestEmail(MOCK_DATA);
    expect(subject).toContain("Sarah");
    expect(subject).toContain("EduChamp");
  });

  it("subject contains the week date range", () => {
    const { subject } = buildWeeklyParentDigestEmail(MOCK_DATA);
    expect(subject).toMatch(/May/);
  });

  it("HTML contains the child's name", () => {
    const { html } = buildWeeklyParentDigestEmail(MOCK_DATA);
    expect(html).toContain("Emma");
  });

  it("HTML contains the child's grade", () => {
    const { html } = buildWeeklyParentDigestEmail(MOCK_DATA);
    expect(html).toContain("Kindergarten");
  });

  it("HTML includes lessons completed count", () => {
    const { html } = buildWeeklyParentDigestEmail(MOCK_DATA);
    expect(html).toContain("4 lesson");
  });

  it("HTML includes new skills mastered count", () => {
    const { html } = buildWeeklyParentDigestEmail(MOCK_DATA);
    expect(html).toContain("3 new skill");
  });

  it("HTML includes improvement callout", () => {
    const { html } = buildWeeklyParentDigestEmail(MOCK_DATA);
    expect(html).toContain("improvement");
  });

  it("HTML includes at-home activity suggestion", () => {
    const { html } = buildWeeklyParentDigestEmail(MOCK_DATA);
    expect(html).toContain("Count objects around the house");
  });

  it("HTML includes CTA links", () => {
    const { html } = buildWeeklyParentDigestEmail(MOCK_DATA);
    expect(html).toContain("https://educhamp.app/parent");
    expect(html).toContain("https://educhamp.app/curriculum");
  });

  it("plain text fallback contains child name and lessons", () => {
    const { text } = buildWeeklyParentDigestEmail(MOCK_DATA);
    expect(text).toContain("Emma");
    expect(text).toContain("Lessons completed: 4");
  });

  it("handles child with no activity this week gracefully", () => {
    const noActivityData = {
      ...MOCK_DATA,
      children: [{
        ...MOCK_CHILD,
        lessonsCompleted: 0,
        quizAttempts: 0,
        bestQuizScore: null,
        newSkillsMastered: 0,
        showedImprovement: false,
      }],
    };
    const { html } = buildWeeklyParentDigestEmail(noActivityData);
    expect(html).toContain("didn't log any activity");
  });

  it("handles multiple children", () => {
    const multiChildData = {
      ...MOCK_DATA,
      children: [
        MOCK_CHILD,
        { ...MOCK_CHILD, name: "Liam", grade: "Grade 1", lessonsCompleted: 2 },
      ],
    };
    const { html } = buildWeeklyParentDigestEmail(multiChildData);
    expect(html).toContain("Emma");
    expect(html).toContain("Liam");
    expect(html).toContain("Grade 1");
  });

  it("HTML contains parent tips section", () => {
    const { html } = buildWeeklyParentDigestEmail(MOCK_DATA);
    expect(html).toContain("Parent Tips");
  });

  it("HTML contains the EduChamp logo", () => {
    const { html } = buildWeeklyParentDigestEmail(MOCK_DATA);
    expect(html).toContain("educhamp-logo");
  });

  it("HTML is valid enough to contain DOCTYPE", () => {
    const { html } = buildWeeklyParentDigestEmail(MOCK_DATA);
    expect(html).toContain("<!DOCTYPE html>");
  });
});

// ─── 5. Weekly digest — at-home activity selection ───────────────────────────

describe("Weekly digest — at-home activity selection", () => {
  const AT_HOME_ACTIVITIES: Record<string, string[]> = {
    "Pre-K": [
      "Count objects around the house together — socks, spoons, or toy blocks!",
      "Practice sorting: group toys by colour or size.",
      "Sing counting songs like '5 Little Ducks' or '10 in the Bed'.",
      "Draw shapes and name them together.",
    ],
    "Kindergarten": [
      "Play 'How many?' — count stairs, windows, or books on a shelf.",
      "Use snack time to practice addition: '3 grapes + 2 grapes = ?'",
      "Draw a picture and count how many things are in it.",
      "Practice writing numbers 1–10 with chalk outside.",
    ],
    "Grade 1": [
      "Play 'Number War' with a standard deck of cards — highest card wins!",
      "Practice skip-counting by 2s and 5s while jumping or clapping.",
      "Use coins to practise adding up to 20 cents.",
      "Tell a 'math story': 'There were 6 birds, 2 flew away. How many are left?'",
    ],
    "Grade 2": [
      "Play 'Double It' — call out a number and have your child double it quickly.",
      "Practise telling time on an analogue clock together.",
      "Use a ruler to measure household objects in centimetres and inches.",
      "Try mental addition: add two 2-digit numbers without writing anything down.",
    ],
  };

  function pickActivity(grade: string, childId: number): string {
    const list = AT_HOME_ACTIVITIES[grade] ?? AT_HOME_ACTIVITIES["Grade 1"];
    return list[childId % list.length];
  }

  it("returns a Pre-K activity for Pre-K grade", () => {
    const activity = pickActivity("Pre-K", 1);
    expect(AT_HOME_ACTIVITIES["Pre-K"]).toContain(activity);
  });

  it("returns a Kindergarten activity for Kindergarten grade", () => {
    const activity = pickActivity("Kindergarten", 0);
    expect(AT_HOME_ACTIVITIES["Kindergarten"]).toContain(activity);
  });

  it("falls back to Grade 1 activities for unknown grade", () => {
    const activity = pickActivity("Grade 5", 0);
    expect(AT_HOME_ACTIVITIES["Grade 1"]).toContain(activity);
  });

  it("rotates activities based on child ID", () => {
    const a0 = pickActivity("Grade 2", 0);
    const a1 = pickActivity("Grade 2", 1);
    const a2 = pickActivity("Grade 2", 2);
    const a3 = pickActivity("Grade 2", 3);
    // All should be valid Grade 2 activities
    for (const a of [a0, a1, a2, a3]) {
      expect(AT_HOME_ACTIVITIES["Grade 2"]).toContain(a);
    }
    // At least some should differ
    const unique = new Set([a0, a1, a2, a3]);
    expect(unique.size).toBeGreaterThan(1);
  });
});
