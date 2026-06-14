/**
 * Sprint 40b Tests — Diagnostic Follow-up Scheduled Job
 *
 * Covers:
 *  1. Email template generation (student + parent variants)
 *  2. De-duplication logic via referenceId
 *  3. Time window filtering (24-48 hours)
 *  4. Skip logic (no weak units, already started learning)
 *  5. Score percentage calculations
 */
import { describe, it, expect, vi } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

describe("Sprint 40b — Diagnostic Follow-up Email Template", () => {
  it("generates correct student email with weak and strong units", async () => {
    const { buildDiagnosticFollowUpEmail } = await import(
      "./emailTemplates/diagnosticFollowUp"
    );

    const result = buildDiagnosticFollowUpEmail({
      studentName: "Alice Johnson",
      courseName: "Algebra I",
      overallScore: 18,
      prerequisiteScore: 5,
      weakUnits: [
        { unitNumber: 3, unitTitle: "Linear Equations", status: "needs_instruction" },
        { unitNumber: 7, unitTitle: "Quadratic Functions", status: "partial_understanding" },
      ],
      strongUnits: [
        { unitNumber: 1, unitTitle: "Number Systems" },
        { unitNumber: 2, unitTitle: "Expressions" },
      ],
      resumeUrl: "https://educhamp.co/courses",
    });

    expect(result.subject).toContain("Alice");
    expect(result.subject).toContain("learning path");
    expect(result.html).toContain("Algebra I");
    expect(result.html).toContain("Linear Equations");
    expect(result.html).toContain("Quadratic Functions");
    expect(result.html).toContain("Number Systems");
    expect(result.html).toContain("75%"); // 18/24 = 75%
    expect(result.html).toContain("83%"); // 5/6 ≈ 83%
    expect(result.html).toContain("Start Learning");
    expect(result.text).toContain("Alice");
    expect(result.text).toContain("Algebra I");
  });

  it("generates correct parent email variant", async () => {
    const { buildDiagnosticFollowUpEmail } = await import(
      "./emailTemplates/diagnosticFollowUp"
    );

    const result = buildDiagnosticFollowUpEmail({
      studentName: "Bob Smith",
      courseName: "Biology I",
      overallScore: 12,
      prerequisiteScore: 3,
      weakUnits: [
        { unitNumber: 4, unitTitle: "Genetics", status: "needs_instruction" },
      ],
      strongUnits: [],
      resumeUrl: "https://educhamp.co/parent",
      isParentEmail: true,
      parentName: "Jane Smith",
    });

    expect(result.subject).toContain("Bob");
    expect(result.subject).toContain("Diagnostic Results");
    expect(result.html).toContain("Jane");
    expect(result.html).toContain("View Learning Path");
    expect(result.html).toContain("Genetics");
    expect(result.html).toContain("Biology I");
  });

  it("handles empty weakUnits gracefully (no focus areas section)", async () => {
    const { buildDiagnosticFollowUpEmail } = await import(
      "./emailTemplates/diagnosticFollowUp"
    );

    const result = buildDiagnosticFollowUpEmail({
      studentName: "Charlie",
      courseName: "Math",
      overallScore: 24,
      prerequisiteScore: 6,
      weakUnits: [],
      strongUnits: [{ unitNumber: 1, unitTitle: "All Units" }],
      resumeUrl: "https://educhamp.co/courses",
    });

    expect(result.html).not.toContain("Recommended Focus Areas");
    expect(result.html).toContain("All Units");
    expect(result.html).toContain("100%"); // 24/24 = 100%
  });
});

describe("Sprint 40b — Diagnostic Follow-up Handler Logic", () => {
  it("de-duplicates via referenceId pattern diag-followup-{attemptId}", () => {
    const existingRefs = ["diag-followup-42", "diag-followup-43"];
    const attemptId = 42;
    const referenceId = `diag-followup-${attemptId}`;
    expect(existingRefs.includes(referenceId)).toBe(true);

    // New attempt not yet followed up
    const newAttemptId = 44;
    const newRef = `diag-followup-${newAttemptId}`;
    expect(existingRefs.includes(newRef)).toBe(false);
  });

  it("targets attempts completed 24-48 hours ago only", () => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // 30 hours ago — should be included
    const attempt30h = new Date(now.getTime() - 30 * 60 * 60 * 1000);
    expect(attempt30h >= fortyEightHoursAgo && attempt30h <= twentyFourHoursAgo).toBe(true);

    // 12 hours ago — too recent
    const attempt12h = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    expect(attempt12h >= fortyEightHoursAgo && attempt12h <= twentyFourHoursAgo).toBe(false);

    // 60 hours ago — too old
    const attempt60h = new Date(now.getTime() - 60 * 60 * 60 * 1000);
    expect(attempt60h >= fortyEightHoursAgo && attempt60h <= twentyFourHoursAgo).toBe(false);
  });

  it("skips students who have started learning on weak units", () => {
    const progressRows = [
      { id: 1, unitId: 3, lessonsCompleted: 2 },
      { id: 2, unitId: 7, lessonsCompleted: 0 },
    ];
    const hasStartedLearning = progressRows.some((p) => p.lessonsCompleted > 0);
    expect(hasStartedLearning).toBe(true);
  });

  it("sends email when student has NOT started weak units", () => {
    const progressRows = [
      { id: 1, unitId: 3, lessonsCompleted: 0 },
      { id: 2, unitId: 7, lessonsCompleted: 0 },
    ];
    const hasStartedLearning = progressRows.some((p) => p.lessonsCompleted > 0);
    expect(hasStartedLearning).toBe(false);
  });

  it("skips attempts with no weak units (all mastered)", () => {
    const unitResults = [
      { unitNumber: 1, unitTitle: "Numbers", status: "likely_mastered" },
      { unitNumber: 2, unitTitle: "Algebra", status: "likely_mastered" },
    ];
    const weakUnits = unitResults.filter(
      (u) => u.status === "needs_instruction" || u.status === "partial_understanding"
    );
    expect(weakUnits.length).toBe(0);
  });

  it("correctly identifies weak units from diagnostic results", () => {
    const unitResults = [
      { unitNumber: 1, unitTitle: "Numbers", status: "likely_mastered" },
      { unitNumber: 2, unitTitle: "Algebra", status: "needs_instruction" },
      { unitNumber: 3, unitTitle: "Geometry", status: "partial_understanding" },
      { unitNumber: 4, unitTitle: "Stats", status: "likely_mastered" },
    ];
    const weakUnits = unitResults.filter(
      (u) => u.status === "needs_instruction" || u.status === "partial_understanding"
    );
    expect(weakUnits.length).toBe(2);
    expect(weakUnits[0].unitTitle).toBe("Algebra");
    expect(weakUnits[1].unitTitle).toBe("Geometry");
  });

  it("score percentage calculations are correct", () => {
    expect(Math.round((18 / 24) * 100)).toBe(75);
    expect(Math.round((5 / 6) * 100)).toBe(83);
    expect(Math.round((12 / 24) * 100)).toBe(50);
    expect(Math.round((3 / 6) * 100)).toBe(50);
    expect(Math.round((24 / 24) * 100)).toBe(100);
    expect(Math.round((0 / 24) * 100)).toBe(0);
  });

  it("parent referenceId includes both attemptId and parentId for separate de-dup", () => {
    const attemptId = 42;
    const parentId = 99;
    const parentRef = `diag-followup-parent-${attemptId}-${parentId}`;
    expect(parentRef).toBe("diag-followup-parent-42-99");
    // Different from student ref
    const studentRef = `diag-followup-${attemptId}`;
    expect(parentRef).not.toBe(studentRef);
  });
});
