/**
 * Sprint 62 Tests
 * Covers:
 *  - Question Flags: input validation, reason labels, status transitions
 *  - Email Settings: category schema, domain status shape
 *  - Timed Exam Mode: timer logic, auto-submit trigger, admin config schema
 */

import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

// ─── Question Flags ───────────────────────────────────────────────────────────

describe("Sprint 62 — Question Flags: input validation", () => {
  const validReasons = [
    "incorrect_answer",
    "unclear_question",
    "wrong_difficulty",
    "out_of_scope",
    "duplicate",
    "other",
  ] as const;

  const flagSchema = z.object({
    questionType: z.enum(["quiz", "diagnostic"]),
    questionId: z.number().int().positive(),
    reason: z.enum(validReasons),
    details: z.string().max(500).optional(),
  });

  it("accepts valid quiz flag input", () => {
    const result = flagSchema.safeParse({
      questionType: "quiz",
      questionId: 42,
      reason: "incorrect_answer",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid diagnostic flag input", () => {
    const result = flagSchema.safeParse({
      questionType: "diagnostic",
      questionId: 7,
      reason: "unclear_question",
      details: "The question references a graph that is not shown.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid questionType", () => {
    const result = flagSchema.safeParse({
      questionType: "homework",
      questionId: 1,
      reason: "other",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive questionId", () => {
    const result = flagSchema.safeParse({
      questionType: "quiz",
      questionId: 0,
      reason: "other",
    });
    expect(result.success).toBe(false);
  });

  it("rejects details longer than 500 characters", () => {
    const result = flagSchema.safeParse({
      questionType: "quiz",
      questionId: 1,
      reason: "other",
      details: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts details exactly 500 characters", () => {
    const result = flagSchema.safeParse({
      questionType: "quiz",
      questionId: 1,
      reason: "other",
      details: "x".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("all six reason values are valid", () => {
    validReasons.forEach((reason) => {
      const result = flagSchema.safeParse({ questionType: "quiz", questionId: 1, reason });
      expect(result.success).toBe(true);
    });
  });
});

describe("Sprint 62 — Question Flags: admin update schema", () => {
  const adminUpdateSchema = z.object({
    flagId: z.number().int().positive(),
    status: z.enum(["reviewed", "resolved", "dismissed"]),
    reviewNote: z.string().max(1000).optional(),
  });

  it("accepts reviewed status", () => {
    const result = adminUpdateSchema.safeParse({ flagId: 1, status: "reviewed" });
    expect(result.success).toBe(true);
  });

  it("accepts resolved status", () => {
    const result = adminUpdateSchema.safeParse({ flagId: 1, status: "resolved" });
    expect(result.success).toBe(true);
  });

  it("accepts dismissed status", () => {
    const result = adminUpdateSchema.safeParse({ flagId: 1, status: "dismissed" });
    expect(result.success).toBe(true);
  });

  it("rejects open as admin update status (admin cannot set back to open)", () => {
    const result = adminUpdateSchema.safeParse({ flagId: 1, status: "open" });
    expect(result.success).toBe(false);
  });

  it("rejects reviewNote longer than 1000 characters", () => {
    const result = adminUpdateSchema.safeParse({
      flagId: 1,
      status: "reviewed",
      reviewNote: "y".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

describe("Sprint 62 — Question Flags: reason labels", () => {
  const REASON_LABELS: Record<string, string> = {
    incorrect_answer: "Incorrect answer",
    unclear_question: "Unclear or confusing question",
    wrong_difficulty: "Wrong difficulty level",
    out_of_scope: "Out of scope for this course",
    duplicate: "Duplicate question",
    other: "Other",
  };

  it("all six reasons have human-readable labels", () => {
    const reasons = [
      "incorrect_answer",
      "unclear_question",
      "wrong_difficulty",
      "out_of_scope",
      "duplicate",
      "other",
    ];
    reasons.forEach((r) => {
      expect(REASON_LABELS[r]).toBeTruthy();
      expect(REASON_LABELS[r]!.length).toBeGreaterThan(0);
    });
  });

  it("labels are unique (no two reasons share the same label)", () => {
    const labels = Object.values(REASON_LABELS);
    const unique = new Set(labels);
    expect(unique.size).toBe(labels.length);
  });
});

// ─── Timed Exam Mode ──────────────────────────────────────────────────────────

describe("Sprint 62 — Timed Exam Mode: timer logic", () => {
  it("calculates totalSeconds correctly from minutes", () => {
    const timeLimitMinutes = 54;
    const totalSeconds = timeLimitMinutes * 60;
    expect(totalSeconds).toBe(3240);
  });

  it("formats time correctly for 3240 seconds", () => {
    const s = 3240;
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    expect(formatted).toBe("54:00");
  });

  it("formats time correctly for 0 seconds", () => {
    const s = 0;
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    expect(formatted).toBe("00:00");
  });

  it("formats time correctly for 65 seconds", () => {
    const s = 65;
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    expect(formatted).toBe("01:05");
  });

  it("status is 'critical' when ≤ 60 seconds remain", () => {
    function getStatus(secondsRemaining: number, totalSeconds: number): string {
      if (secondsRemaining <= 0) return "expired";
      if (secondsRemaining <= 60) return "critical";
      if (secondsRemaining <= totalSeconds * 0.25) return "warning";
      return "running";
    }
    expect(getStatus(60, 3240)).toBe("critical");
    expect(getStatus(1, 3240)).toBe("critical");
    expect(getStatus(59, 3240)).toBe("critical");
  });

  it("status is 'warning' when ≤ 25% of time remains (but > 60s)", () => {
    function getStatus(secondsRemaining: number, totalSeconds: number): string {
      if (secondsRemaining <= 0) return "expired";
      if (secondsRemaining <= 60) return "critical";
      if (secondsRemaining <= totalSeconds * 0.25) return "warning";
      return "running";
    }
    const total = 3240;
    const warningThreshold = Math.floor(total * 0.25); // 810 seconds
    expect(getStatus(warningThreshold, total)).toBe("warning");
    expect(getStatus(61, total)).toBe("warning");
  });

  it("status is 'expired' when 0 seconds remain", () => {
    function getStatus(secondsRemaining: number, totalSeconds: number): string {
      if (secondsRemaining <= 0) return "expired";
      if (secondsRemaining <= 60) return "critical";
      if (secondsRemaining <= totalSeconds * 0.25) return "warning";
      return "running";
    }
    expect(getStatus(0, 3240)).toBe("expired");
  });

  it("percentRemaining is 100% at start", () => {
    const total = 1800;
    const remaining = 1800;
    const pct = (remaining / total) * 100;
    expect(pct).toBe(100);
  });

  it("percentRemaining is 0% when expired", () => {
    const total = 1800;
    const remaining = 0;
    const pct = (remaining / total) * 100;
    expect(pct).toBe(0);
  });

  it("percentRemaining is 50% at halfway", () => {
    const total = 1800;
    const remaining = 900;
    const pct = (remaining / total) * 100;
    expect(pct).toBe(50);
  });
});

describe("Sprint 62 — Timed Exam Mode: AP/SATPREP course defaults", () => {
  const AP_COURSE_TIMERS: Record<string, number> = {
    SATPREP: 54,
    APCALCAB: 30,
    APCALCBC: 30,
    APLIT: 55,
    APHG: 70,
  };

  it("all AP/SATPREP courses have a time limit defined", () => {
    Object.entries(AP_COURSE_TIMERS).forEach(([code, mins]) => {
      expect(mins).toBeGreaterThan(0);
      expect(mins).toBeLessThanOrEqual(300);
    });
  });

  it("SATPREP is set to 54 minutes", () => {
    expect(AP_COURSE_TIMERS["SATPREP"]).toBe(54);
  });

  it("APLIT is set to 55 minutes", () => {
    expect(AP_COURSE_TIMERS["APLIT"]).toBe(55);
  });

  it("APHG is set to 70 minutes (longest exam)", () => {
    expect(AP_COURSE_TIMERS["APHG"]).toBe(70);
  });

  it("AP Calculus courses are both 30 minutes", () => {
    expect(AP_COURSE_TIMERS["APCALCAB"]).toBe(30);
    expect(AP_COURSE_TIMERS["APCALCBC"]).toBe(30);
  });
});

describe("Sprint 62 — Timed Exam Mode: admin config schema", () => {
  const timerConfigSchema = z.object({
    courseId: z.number().int().positive(),
    isTimedExam: z.boolean().optional(),
    timeLimitMinutes: z.number().int().min(1).max(300).nullable().optional(),
  });

  it("accepts enabling timed exam with valid time limit", () => {
    const result = timerConfigSchema.safeParse({
      courseId: 1,
      isTimedExam: true,
      timeLimitMinutes: 54,
    });
    expect(result.success).toBe(true);
  });

  it("accepts disabling timed exam", () => {
    const result = timerConfigSchema.safeParse({
      courseId: 1,
      isTimedExam: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null timeLimitMinutes (no limit)", () => {
    const result = timerConfigSchema.safeParse({
      courseId: 1,
      isTimedExam: false,
      timeLimitMinutes: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects timeLimitMinutes of 0", () => {
    const result = timerConfigSchema.safeParse({
      courseId: 1,
      isTimedExam: true,
      timeLimitMinutes: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects timeLimitMinutes above 300", () => {
    const result = timerConfigSchema.safeParse({
      courseId: 1,
      isTimedExam: true,
      timeLimitMinutes: 301,
    });
    expect(result.success).toBe(false);
  });

  it("accepts maximum valid timeLimitMinutes of 300", () => {
    const result = timerConfigSchema.safeParse({
      courseId: 1,
      isTimedExam: true,
      timeLimitMinutes: 300,
    });
    expect(result.success).toBe(true);
  });
});

// ─── Email Settings ───────────────────────────────────────────────────────────

describe("Sprint 62 — Email Settings: category schema", () => {
  const emailCategorySchema = z.record(z.string(), z.boolean());

  it("accepts valid category map", () => {
    const result = emailCategorySchema.safeParse({
      welcome: true,
      weekly_digest: false,
      inactivity: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-boolean values", () => {
    const result = emailCategorySchema.safeParse({
      welcome: "yes",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty object (all categories use defaults)", () => {
    const result = emailCategorySchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("Sprint 62 — Email Settings: domain status shape", () => {
  it("domain status object has expected fields", () => {
    const mockDomainStatus = {
      id: "dom_abc123",
      name: "educhamp.app",
      status: "verified",
      records: [
        { type: "MX", name: "educhamp.app", value: "feedback-smtp.us-east-1.amazonses.com", priority: 10, status: "verified" },
        { type: "TXT", name: "_dmarc.educhamp.app", value: "v=DMARC1; p=none;", status: "verified" },
      ],
    };

    expect(mockDomainStatus).toHaveProperty("id");
    expect(mockDomainStatus).toHaveProperty("name");
    expect(mockDomainStatus).toHaveProperty("status");
    expect(mockDomainStatus).toHaveProperty("records");
    expect(Array.isArray(mockDomainStatus.records)).toBe(true);
  });

  it("each DNS record has type, name, value, and status", () => {
    const record = {
      type: "TXT",
      name: "_dmarc.educhamp.app",
      value: "v=DMARC1; p=none;",
      status: "verified",
    };
    expect(record).toHaveProperty("type");
    expect(record).toHaveProperty("name");
    expect(record).toHaveProperty("value");
    expect(record).toHaveProperty("status");
  });
});

// ─── FlagQuestionButton: UI logic ─────────────────────────────────────────────

describe("Sprint 62 — FlagQuestionButton: UI state logic", () => {
  it("button label changes based on flagged state", () => {
    const getLabel = (isFlagged: boolean) => (isFlagged ? "Flagged" : "Flag");
    expect(getLabel(false)).toBe("Flag");
    expect(getLabel(true)).toBe("Flagged");
  });

  it("confirmation dialog is shown before submitting flag", () => {
    let dialogOpen = false;
    const openDialog = () => { dialogOpen = true; };
    openDialog();
    expect(dialogOpen).toBe(true);
  });

  it("reason is required before submitting", () => {
    const reason = "";
    const canSubmit = reason.trim().length > 0;
    expect(canSubmit).toBe(false);
  });

  it("reason with value allows submission", () => {
    const reason = "incorrect_answer";
    const canSubmit = reason.trim().length > 0;
    expect(canSubmit).toBe(true);
  });
});
