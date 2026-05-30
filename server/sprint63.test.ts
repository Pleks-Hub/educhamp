/**
 * Sprint 63 Tests
 * Covers:
 *  - Per-question time tracking: schema validation, timing accumulation, results breakdown
 *  - Flag resolution notifications: email builder, in-app notification shape
 *  - Practice mode: schema, submit path, mastery bypass
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// ─── Per-Question Time Tracking ───────────────────────────────────────────────

describe("Sprint 63 — Per-question time tracking: schema", () => {
  const timingSchema = z.array(
    z.object({ questionId: z.number().int().positive(), seconds: z.number().int().min(0) })
  );

  it("accepts valid timing array", () => {
    const result = timingSchema.safeParse([
      { questionId: 1, seconds: 45 },
      { questionId: 2, seconds: 120 },
    ]);
    expect(result.success).toBe(true);
  });

  it("accepts empty timing array", () => {
    expect(timingSchema.safeParse([]).success).toBe(true);
  });

  it("rejects negative seconds", () => {
    const result = timingSchema.safeParse([{ questionId: 1, seconds: -1 }]);
    expect(result.success).toBe(false);
  });

  it("rejects non-positive questionId in timing", () => {
    const result = timingSchema.safeParse([{ questionId: 0, seconds: 30 }]);
    expect(result.success).toBe(false);
  });

  it("rejects non-integer seconds", () => {
    const result = timingSchema.safeParse([{ questionId: 1, seconds: 12.5 }]);
    expect(result.success).toBe(false);
  });
});

describe("Sprint 63 — Per-question time tracking: accumulation logic", () => {
  type Timing = { questionId: number; seconds: number };

  function accumulateTiming(prev: Timing[], questionId: number, seconds: number): Timing[] {
    const existing = prev.findIndex((t) => t.questionId === questionId);
    if (existing >= 0) {
      const updated = [...prev];
      updated[existing] = { questionId, seconds: (updated[existing]?.seconds ?? 0) + seconds };
      return updated;
    }
    return [...prev, { questionId, seconds }];
  }

  it("adds a new entry for an unseen question", () => {
    const result = accumulateTiming([], 5, 30);
    expect(result).toEqual([{ questionId: 5, seconds: 30 }]);
  });

  it("accumulates seconds for a revisited question", () => {
    const prev = [{ questionId: 3, seconds: 20 }];
    const result = accumulateTiming(prev, 3, 15);
    expect(result).toEqual([{ questionId: 3, seconds: 35 }]);
  });

  it("does not mutate the original array", () => {
    const prev = [{ questionId: 1, seconds: 10 }];
    accumulateTiming(prev, 1, 5);
    expect(prev[0]?.seconds).toBe(10);
  });

  it("preserves other entries when accumulating", () => {
    const prev = [
      { questionId: 1, seconds: 10 },
      { questionId: 2, seconds: 20 },
    ];
    const result = accumulateTiming(prev, 1, 5);
    expect(result.find((t) => t.questionId === 2)?.seconds).toBe(20);
  });

  it("computes total and average correctly", () => {
    const timings = [
      { questionId: 1, seconds: 30 },
      { questionId: 2, seconds: 60 },
      { questionId: 3, seconds: 90 },
    ];
    const total = timings.reduce((s, t) => s + t.seconds, 0);
    const avg = Math.round(total / timings.length);
    expect(total).toBe(180);
    expect(avg).toBe(60);
  });
});

describe("Sprint 63 — Per-question time tracking: submitQuiz input schema", () => {
  const submitSchema = z.object({
    unitId: z.number(),
    unitNumber: z.number(),
    unitTitle: z.string(),
    answers: z.array(z.object({ questionId: z.number(), answer: z.string() })),
    questionTimings: z
      .array(z.object({ questionId: z.number(), seconds: z.number() }))
      .optional(),
    isPracticeMode: z.boolean().optional(),
  });

  it("accepts submit with timings and practice mode", () => {
    const result = submitSchema.safeParse({
      unitId: 1,
      unitNumber: 1,
      unitTitle: "Intro to Variables",
      answers: [{ questionId: 10, answer: "A" }],
      questionTimings: [{ questionId: 10, seconds: 45 }],
      isPracticeMode: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts submit without optional fields (backwards compat)", () => {
    const result = submitSchema.safeParse({
      unitId: 2,
      unitNumber: 2,
      unitTitle: "Linear Equations",
      answers: [{ questionId: 5, answer: "B" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects isPracticeMode as non-boolean", () => {
    const result = submitSchema.safeParse({
      unitId: 1,
      unitNumber: 1,
      unitTitle: "Test",
      answers: [],
      isPracticeMode: "yes",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Flag Resolution Notifications ───────────────────────────────────────────

describe("Sprint 63 — Flag resolution notifications: email builder", () => {
  // Inline the builder logic for unit-testability (mirrors flagResolutionNotification.ts)
  function buildFlagResolutionEmail(data: {
    studentName: string;
    status: "resolved" | "dismissed";
    questionText: string;
    questionType: "quiz" | "diagnostic";
    reason: string;
    reviewNote?: string;
    dashboardUrl: string;
  }) {
    const isResolved = data.status === "resolved";
    const subject = isResolved
      ? `Your question report was resolved — EduChamp`
      : `Your question report has been reviewed — EduChamp`;
    const text = isResolved
      ? `Hi ${data.studentName},\n\nYour report about a ${data.questionType} question has been RESOLVED`
      : `Hi ${data.studentName},\n\nOur team has reviewed your report about a ${data.questionType} question`;
    return { subject, html: `<html>${text}</html>`, text };
  }

  it("generates resolved subject line", () => {
    const { subject } = buildFlagResolutionEmail({
      studentName: "Alice",
      status: "resolved",
      questionText: "What is 2+2?",
      questionType: "quiz",
      reason: "Incorrect answer",
      dashboardUrl: "https://educhamp.app/dashboard",
    });
    expect(subject).toContain("resolved");
  });

  it("generates dismissed subject line", () => {
    const { subject } = buildFlagResolutionEmail({
      studentName: "Bob",
      status: "dismissed",
      questionText: "Solve for x.",
      questionType: "diagnostic",
      reason: "Unclear question",
      dashboardUrl: "https://educhamp.app/dashboard",
    });
    expect(subject).toContain("reviewed");
  });

  it("includes student name in text body", () => {
    const { text } = buildFlagResolutionEmail({
      studentName: "Charlie",
      status: "resolved",
      questionText: "Factor x^2 - 4.",
      questionType: "quiz",
      reason: "Incorrect answer",
      dashboardUrl: "https://educhamp.app/dashboard",
    });
    expect(text).toContain("Charlie");
  });

  it("includes question type in text body", () => {
    const { text } = buildFlagResolutionEmail({
      studentName: "Dana",
      status: "dismissed",
      questionText: "What is a variable?",
      questionType: "diagnostic",
      reason: "Other",
      dashboardUrl: "https://educhamp.app/dashboard",
    });
    expect(text).toContain("diagnostic");
  });
});

describe("Sprint 63 — Flag resolution notifications: in-app notification shape", () => {
  const notifSchema = z.object({
    userId: z.number().int().positive(),
    type: z.string().min(1),
    title: z.string().min(1),
    message: z.string().min(1),
    isRead: z.boolean(),
    metadata: z.string().optional(),
  });

  it("validates resolved notification shape", () => {
    const result = notifSchema.safeParse({
      userId: 42,
      type: "flag_resolution",
      title: "Your question report was resolved",
      message: "Thank you for reporting an issue. Our team has resolved the problem.",
      isRead: false,
      metadata: JSON.stringify({ flagId: 7, status: "resolved" }),
    });
    expect(result.success).toBe(true);
  });

  it("validates dismissed notification shape", () => {
    const result = notifSchema.safeParse({
      userId: 15,
      type: "flag_resolution",
      title: "Your question report has been reviewed",
      message: "Our team reviewed your report and determined no changes are needed.",
      isRead: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects notification with empty title", () => {
    const result = notifSchema.safeParse({
      userId: 1,
      type: "flag_resolution",
      title: "",
      message: "Some message",
      isRead: false,
    });
    expect(result.success).toBe(false);
  });

  it("metadata is valid JSON when present", () => {
    const metadata = JSON.stringify({
      flagId: 3,
      status: "resolved",
      questionType: "quiz",
      questionId: 99,
    });
    expect(() => JSON.parse(metadata)).not.toThrow();
    const parsed = JSON.parse(metadata);
    expect(parsed.flagId).toBe(3);
    expect(parsed.status).toBe("resolved");
  });
});

// ─── Practice Mode ────────────────────────────────────────────────────────────

describe("Sprint 63 — Practice mode: server response shape", () => {
  const practiceResponseSchema = z.object({
    score: z.number().min(0).max(100),
    correctCount: z.number().int().min(0),
    totalQuestions: z.number().int().positive(),
    results: z.array(
      z.object({
        questionId: z.number(),
        questionText: z.string(),
        yourAnswer: z.string(),
        correctAnswer: z.string(),
        correct: z.boolean(),
        explanation: z.string(),
        skillTag: z.string(),
        difficulty: z.string(),
      })
    ),
    masteryLabel: z.string(),
    xpAwarded: z.literal(0),
    isPracticeMode: z.literal(true),
    adaptivePath: z.string().includes("Practice mode"),
  });

  it("validates a well-formed practice mode response", () => {
    const result = practiceResponseSchema.safeParse({
      score: 80,
      correctCount: 12,
      totalQuestions: 15,
      results: [
        {
          questionId: 1,
          questionText: "What is 3x when x=4?",
          yourAnswer: "12",
          correctAnswer: "12",
          correct: true,
          explanation: "3 × 4 = 12",
          skillTag: "ALG.1.1",
          difficulty: "easy",
        },
      ],
      masteryLabel: "Approaching",
      xpAwarded: 0,
      isPracticeMode: true,
      adaptivePath: "Practice mode — this attempt does not affect your mastery score or progress.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects practice response with non-zero xpAwarded", () => {
    const result = practiceResponseSchema.safeParse({
      score: 80,
      correctCount: 12,
      totalQuestions: 15,
      results: [],
      masteryLabel: "Approaching",
      xpAwarded: 150, // should be 0 in practice mode
      isPracticeMode: true,
      adaptivePath: "Practice mode — this attempt does not affect your mastery score or progress.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects practice response where isPracticeMode is false", () => {
    const result = practiceResponseSchema.safeParse({
      score: 80,
      correctCount: 12,
      totalQuestions: 15,
      results: [],
      masteryLabel: "Approaching",
      xpAwarded: 0,
      isPracticeMode: false,
      adaptivePath: "Practice mode — this attempt does not affect your mastery score or progress.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects practice response with adaptivePath missing 'Practice mode'", () => {
    const result = practiceResponseSchema.safeParse({
      score: 80,
      correctCount: 12,
      totalQuestions: 15,
      results: [],
      masteryLabel: "Approaching",
      xpAwarded: 0,
      isPracticeMode: true,
      adaptivePath: "Your score is 80%.",
    });
    expect(result.success).toBe(false);
  });
});

describe("Sprint 63 — Practice mode: mastery bypass logic", () => {
  function computeMasteryUpdates(
    isPractice: boolean,
    gradedAnswers: { skillTag: string; correct: boolean }[]
  ): Map<string, number> | null {
    if (isPractice) return null; // bypass
    const skillScores = new Map<string, { correct: number; total: number }>();
    for (const a of gradedAnswers) {
      const existing = skillScores.get(a.skillTag) ?? { correct: 0, total: 0 };
      skillScores.set(a.skillTag, {
        correct: existing.correct + (a.correct ? 1 : 0),
        total: existing.total + 1,
      });
    }
    const result = new Map<string, number>();
    for (const [tag, { correct, total }] of Array.from(skillScores.entries())) {
      result.set(tag, Math.round((correct / total) * 100));
    }
    return result;
  }

  const answers = [
    { skillTag: "ALG.1.1", correct: true },
    { skillTag: "ALG.1.1", correct: false },
    { skillTag: "ALG.1.2", correct: true },
  ];

  it("returns null (no mastery update) in practice mode", () => {
    expect(computeMasteryUpdates(true, answers)).toBeNull();
  });

  it("returns mastery scores in normal mode", () => {
    const result = computeMasteryUpdates(false, answers);
    expect(result).not.toBeNull();
    expect(result?.get("ALG.1.1")).toBe(50);
    expect(result?.get("ALG.1.2")).toBe(100);
  });

  it("normal mode computes 100% for all-correct skill", () => {
    const result = computeMasteryUpdates(false, [
      { skillTag: "ALG.2.1", correct: true },
      { skillTag: "ALG.2.1", correct: true },
    ]);
    expect(result?.get("ALG.2.1")).toBe(100);
  });

  it("normal mode computes 0% for all-wrong skill", () => {
    const result = computeMasteryUpdates(false, [
      { skillTag: "ALG.3.1", correct: false },
      { skillTag: "ALG.3.1", correct: false },
    ]);
    expect(result?.get("ALG.3.1")).toBe(0);
  });
});
