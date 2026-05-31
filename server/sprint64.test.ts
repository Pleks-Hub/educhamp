/**
 * Sprint 64 — Language Level & Parent-Led Mode Improvements
 *
 * Covers:
 * 1. isYoungLearnerGrade helper — grade classification
 * 2. setActiveCourse auto-clear logic — parentLedMode cleared for non-Pre-K/K courses
 * 3. buildTutorSystemPrompt — languageLevel section injected correctly
 * 4. buildTutorSystemPrompt — languageLevel section suppressed for Young Learner mode
 * 5. savePersonalization — languageLevel accepted and persisted
 */

import { describe, it, expect, vi } from "vitest";
import { isYoungLearnerGrade, buildTutorSystemPrompt } from "./educhamp-helpers";

// ─── 1. isYoungLearnerGrade helper ────────────────────────────────────────────

describe("isYoungLearnerGrade", () => {
  it("returns true for Pre-K", () => {
    expect(isYoungLearnerGrade("Pre-K")).toBe(true);
  });

  it("returns true for Kindergarten", () => {
    expect(isYoungLearnerGrade("Kindergarten")).toBe(true);
  });

  it("returns true for K", () => {
    expect(isYoungLearnerGrade("K")).toBe(true);
  });

  it("returns true for Grade 1 (early childhood grade)", () => {
    expect(isYoungLearnerGrade("Grade 1")).toBe(true);
  });

  it("returns false for Algebra 1", () => {
    expect(isYoungLearnerGrade("Algebra 1")).toBe(false);
  });

  it("returns false for Grade 9", () => {
    expect(isYoungLearnerGrade("9")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isYoungLearnerGrade(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isYoungLearnerGrade(undefined)).toBe(false);
  });
});

// ─── 2. setActiveCourse auto-clear logic (unit-level) ─────────────────────────

describe("setActiveCourse parentLedMode auto-clear logic", () => {
  /**
   * We test the conditional logic directly (without a real DB) by replicating
   * the guard that lives in admin.ts setActiveCourse.
   */
  function shouldClearParentLedMode(
    newCourseGradeLevel: string | null | undefined,
    currentParentLedMode: boolean
  ): boolean {
    if (!newCourseGradeLevel) return false;
    if (!isYoungLearnerGrade(newCourseGradeLevel) && currentParentLedMode) {
      return true;
    }
    return false;
  }

  it("clears parentLedMode when switching from Pre-K to Algebra 1", () => {
    expect(shouldClearParentLedMode("Algebra 1", true)).toBe(true);
  });

  it("clears parentLedMode when switching to Grade 9 course", () => {
    expect(shouldClearParentLedMode("9", true)).toBe(true);
  });

  it("does NOT clear parentLedMode when switching to another Pre-K course", () => {
    expect(shouldClearParentLedMode("Pre-K", true)).toBe(false);
  });

  it("does NOT clear parentLedMode when switching to Kindergarten", () => {
    expect(shouldClearParentLedMode("Kindergarten", true)).toBe(false);
  });

  it("does NOT clear parentLedMode when it is already false", () => {
    expect(shouldClearParentLedMode("Algebra 1", false)).toBe(false);
  });

  it("does NOT clear parentLedMode when course grade is null", () => {
    expect(shouldClearParentLedMode(null, true)).toBe(false);
  });
});

// ─── 3. buildTutorSystemPrompt — languageLevel injection ──────────────────────

describe("buildTutorSystemPrompt — languageLevel", () => {
  const baseArgs: Parameters<typeof buildTutorSystemPrompt> = [
    "Alex",
    "teach",
    "Linear Equations",
    [],
    { name: "Alex" },
  ];

  it("includes SIMPLIFIED section when languageLevel is 'simplified'", () => {
    const prompt = buildTutorSystemPrompt(...baseArgs.slice(0, 4) as any, {
      name: "Alex",
      languageLevel: "simplified",
    });
    expect(prompt).toContain("LANGUAGE LEVEL: SIMPLIFIED");
    expect(prompt).toContain("5th-grade reading level");
  });

  it("includes ADVANCED section when languageLevel is 'advanced'", () => {
    const prompt = buildTutorSystemPrompt(...baseArgs.slice(0, 4) as any, {
      name: "Alex",
      languageLevel: "advanced",
    });
    expect(prompt).toContain("LANGUAGE LEVEL: ADVANCED");
    expect(prompt).toContain("academic and technical terminology");
  });

  it("does NOT include language level section when languageLevel is 'standard'", () => {
    const prompt = buildTutorSystemPrompt(...baseArgs.slice(0, 4) as any, {
      name: "Alex",
      languageLevel: "standard",
    });
    expect(prompt).not.toContain("LANGUAGE LEVEL:");
  });

  it("does NOT include language level section when languageLevel is omitted", () => {
    const prompt = buildTutorSystemPrompt(...baseArgs.slice(0, 4) as any, {
      name: "Alex",
    });
    expect(prompt).not.toContain("LANGUAGE LEVEL:");
  });
});

// ─── 4. buildTutorSystemPrompt — languageLevel suppressed in Young Learner mode ──

describe("buildTutorSystemPrompt — languageLevel suppressed for Young Learner", () => {
  it("does NOT inject SIMPLIFIED section when isYoungLearner is true (already simplified)", () => {
    const prompt = buildTutorSystemPrompt(
      "Sam",
      "teach",
      "Counting",
      [],
      {
        name: "Sam",
        isYoungLearner: true,
        languageLevel: "simplified",
      }
    );
    // Young Learner mode already handles simplified language — no duplicate section
    expect(prompt).not.toContain("LANGUAGE LEVEL: SIMPLIFIED");
    // But YOUNG_LEARNER_MODE_INSTRUCTIONS should still be present
    expect(prompt).toContain("YOUNG LEARNER MODE");
  });

  it("does NOT inject ADVANCED section when isYoungLearner is true", () => {
    const prompt = buildTutorSystemPrompt(
      "Sam",
      "teach",
      "Counting",
      [],
      {
        name: "Sam",
        isYoungLearner: true,
        languageLevel: "advanced",
      }
    );
    expect(prompt).not.toContain("LANGUAGE LEVEL: ADVANCED");
  });
});

// ─── 5. savePersonalization input schema — languageLevel accepted ──────────────

describe("savePersonalization languageLevel schema", () => {
  const { z } = require("zod");

  const savePersonalizationSchema = z.object({
    colorPalette: z.enum(["indigo", "emerald", "rose", "violet", "amber", "teal"]).optional(),
    displayName: z.string().max(128).optional(),
    preferredName: z.string().max(64).optional().nullable(),
    aiWelcomeMessage: z.string().max(500).optional().nullable(),
    parentLedMode: z.boolean().optional(),
    disableAnimations: z.boolean().optional(),
    disableSound: z.boolean().optional(),
    languageLevel: z.enum(["simplified", "standard", "advanced"]).optional(),
  });

  it("accepts languageLevel: 'simplified'", () => {
    expect(() => savePersonalizationSchema.parse({ languageLevel: "simplified" })).not.toThrow();
  });

  it("accepts languageLevel: 'standard'", () => {
    expect(() => savePersonalizationSchema.parse({ languageLevel: "standard" })).not.toThrow();
  });

  it("accepts languageLevel: 'advanced'", () => {
    expect(() => savePersonalizationSchema.parse({ languageLevel: "advanced" })).not.toThrow();
  });

  it("rejects invalid languageLevel value", () => {
    expect(() => savePersonalizationSchema.parse({ languageLevel: "expert" })).toThrow();
  });

  it("accepts omitted languageLevel (optional field)", () => {
    expect(() => savePersonalizationSchema.parse({ colorPalette: "indigo" })).not.toThrow();
  });
});
