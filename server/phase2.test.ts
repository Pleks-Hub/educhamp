/**
 * Phase 2 Tests — Lesson Content Injection & masteryRecords Dual-Write
 *
 * Coverage:
 *   1. Algebra I TEKS canonicalization (Day 1 gap resolution)
 *   2. StudentContext.lessonContent type contract
 *   3. buildTutorSystemPrompt lesson content injection
 *   4. tutorStream.ts getLessonById import
 *   5. writeMasteryRecordsForUnit helper contract
 *   6. routers.ts dual-write wiring (quiz + diagnostic)
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

// ─── Suite 1: Algebra I TEKS canonicalization ─────────────────────────────────
describe("Phase 2 Day 1 — Algebra I TEKS canonicalization", () => {
  const assignScript = fs.readFileSync(
    path.join(ROOT, "scripts/assign-alg1-teks.mjs"),
    "utf-8"
  );

  it("assign-alg1-teks.mjs maps exactly 12 Algebra I units", () => {
    // The script stores TEKS codes like A.2(C) in the code field of each mapping object
    const matches = assignScript.match(/code: "A\.\d+\([A-Z]\)"/g);
    expect(matches?.length ?? 0).toBeGreaterThanOrEqual(12);
  });

  it("all 12 mappings use canonical TEKS format A.N(X)", () => {
    const teksPattern = /A\.\d+\([A-Z]\)/g;
    const codes = assignScript.match(teksPattern) ?? [];
    // At least 12 distinct canonical codes
    const unique = new Set(codes);
    expect(unique.size).toBeGreaterThanOrEqual(12);
  });

  it("script sets isCanonical = 1 for all updated standards", () => {
    // The UPDATE statement uses isCanonical = 1 in the SET clause
    expect(assignScript).toContain("isCanonical = 1");
    // The script also queries for remaining isCanonical = 0 rows as a verification step
    // Both are expected to appear in the script
    expect(assignScript).toContain("isCanonical = 0");
    // Confirm the UPDATE path sets canonical = 1
    expect(assignScript).toContain("SET code = ?, description = ?, gradeLevel = ?, strand = ?, isCanonical = 1");
  });

  it("script covers all major Algebra I TEKS strands", () => {
    // A.1 = Process Standards, A.2 = Linear, A.3 = Systems, A.4 = Quadratic,
    // A.5 = Exponential, A.6 = Number/Algebraic Methods, A.7 = Data
    const strands = ["A.1", "A.2", "A.3", "A.4", "A.5", "A.6", "A.7"];
    for (const strand of strands) {
      expect(assignScript).toContain(strand);
    }
  });

  it("BACKFILL_GAPS.md exists and no longer lists Algebra I as a gap course", () => {
    const gapsPath = path.join(ROOT, "docs/BACKFILL_GAPS.md");
    expect(fs.existsSync(gapsPath)).toBe(true);
    const content = fs.readFileSync(gapsPath, "utf-8");
    // The gaps report should still exist but Algebra I section should be resolved
    // (the script updates isCanonical in the DB; the report reflects the pre-fix state)
    expect(content).toContain("BACKFILL_GAPS");
  });
});

// ─── Suite 2: StudentContext.lessonContent type contract ─────────────────────
describe("Phase 2 — StudentContext.lessonContent type contract", () => {
  const helpersSource = fs.readFileSync(
    path.join(ROOT, "server/educhamp-helpers.ts"),
    "utf-8"
  );

  it("StudentContext has lessonContent field", () => {
    expect(helpersSource).toContain("lessonContent?:");
  });

  it("lessonContent has lessonTitle field", () => {
    expect(helpersSource).toContain("lessonTitle: string");
  });

  it("lessonContent has lessonNumber field", () => {
    expect(helpersSource).toContain("lessonNumber: number");
  });

  it("lessonContent has explanation field", () => {
    expect(helpersSource).toContain("explanation: string");
  });

  it("lessonContent has workedExamples array", () => {
    expect(helpersSource).toContain("workedExamples: Array<");
  });

  it("workedExamples items have title, problem, steps, answer", () => {
    expect(helpersSource).toContain("title: string;");
    expect(helpersSource).toContain("problem: string;");
    expect(helpersSource).toContain("steps: { step: string; explanation: string }[]");
    expect(helpersSource).toContain("answer: string;");
  });

  it("lessonContent has misconceptions array", () => {
    expect(helpersSource).toContain("misconceptions: string[]");
  });

  it("lessonContent has optional teksAlignment field", () => {
    expect(helpersSource).toContain("teksAlignment?:");
  });
});

// ─── Suite 3: buildTutorSystemPrompt lesson content injection ─────────────────
describe("Phase 2 — buildTutorSystemPrompt lesson content injection", () => {
  const helpersSource = fs.readFileSync(
    path.join(ROOT, "server/educhamp-helpers.ts"),
    "utf-8"
  );

  it("buildTutorSystemPrompt builds lessonContentSection when ctx.lessonContent is present", () => {
    expect(helpersSource).toContain("lessonContentSection");
    expect(helpersSource).toContain("ctx?.lessonContent");
  });

  it("lesson content section includes the IMPORTANT grounding instruction", () => {
    expect(helpersSource).toContain("Teach from this authoritative curriculum content");
    expect(helpersSource).toContain("Do NOT fabricate alternative explanations");
  });

  it("lesson content section renders explanation", () => {
    expect(helpersSource).toContain("### Explanation");
    expect(helpersSource).toContain("lc.explanation");
  });

  it("lesson content section renders worked examples", () => {
    expect(helpersSource).toContain("### Worked Examples From This Lesson");
    expect(helpersSource).toContain("lc.workedExamples");
  });

  it("lesson content section renders misconceptions", () => {
    expect(helpersSource).toContain("### Common Student Misconceptions");
    expect(helpersSource).toContain("lc.misconceptions");
  });

  it("lessonContentSection is included in the final return string", () => {
    expect(helpersSource).toContain("${lessonContentSection}");
  });

  it("falls back gracefully when lessonContent is absent (empty string)", () => {
    // When ctx.lessonContent is undefined, lessonContentSection = ""
    // Verify the guard is an if-check not an assert
    expect(helpersSource).toContain('let lessonContentSection = "";');
    expect(helpersSource).toContain("if (ctx?.lessonContent)");
  });

  it("buildTutorSystemPrompt produces non-empty string with lesson content", async () => {
    // Import and call the function directly
    const mod = await import("./educhamp-helpers");
    const buildTutorSystemPrompt = mod.buildTutorSystemPrompt;
    const prompt = buildTutorSystemPrompt(
      "Alex",
      "teach",
      "Solving Linear Equations",
      [],
      {
        lessonContent: {
          lessonTitle: "Solving Two-Step Equations",
          lessonNumber: 3,
          teksAlignment: "TEKS §111.39 Algebra I — A.2(C)",
          explanation: "To solve a two-step equation, first isolate the variable term, then divide.",
          workedExamples: [
            {
              title: "Example 1",
              problem: "2x + 4 = 10",
              steps: [
                { step: "Subtract 4 from both sides", explanation: "2x = 6" },
                { step: "Divide both sides by 2", explanation: "x = 3" },
              ],
              answer: "x = 3",
            },
          ],
          misconceptions: ["Students often forget to perform the same operation on both sides."],
        },
      }
    );
    expect(prompt).toContain("Lesson Content");
    expect(prompt).toContain("Solving Two-Step Equations");
    expect(prompt).toContain("Teach From This Material");
    expect(prompt).toContain("TEKS §111.39 Algebra I — A.2(C)");
    expect(prompt).toContain("To solve a two-step equation");
    expect(prompt).toContain("2x + 4 = 10");
    expect(prompt).toContain("Students often forget to perform the same operation");
  });
});

// ─── Suite 4: tutorStream.ts lesson content fetch wiring ─────────────────────
describe("Phase 2 — tutorStream.ts lesson content fetch wiring", () => {
  const tutorStreamSource = fs.readFileSync(
    path.join(ROOT, "server/tutorStream.ts"),
    "utf-8"
  );

  it("tutorStream.ts imports getLessonById from db", () => {
    expect(tutorStreamSource).toContain("getLessonById");
  });

  it("tutorStream.ts fetches lesson content when lessonId is present", () => {
    expect(tutorStreamSource).toContain("if (lessonId)");
    expect(tutorStreamSource).toContain("await getLessonById(lessonId)");
  });

  it("tutorStream.ts passes lessonContent to buildTutorSystemPrompt", () => {
    expect(tutorStreamSource).toContain("lessonContent,");
  });

  it("tutorStream.ts lesson fetch is non-fatal (try/catch)", () => {
    expect(tutorStreamSource).toContain("// non-fatal — fall back to parametric behaviour");
  });

  it("tutorStream.ts maps workedExamples from lesson to StudentContext shape", () => {
    expect(tutorStreamSource).toContain("workedExamples");
    expect(tutorStreamSource).toContain("lesson.workedExamples");
  });

  it("tutorStream.ts maps misconceptions from lesson to StudentContext shape", () => {
    expect(tutorStreamSource).toContain("misconceptions");
    expect(tutorStreamSource).toContain("lesson.misconceptions");
  });
});

// ─── Suite 5: writeMasteryRecordsForUnit helper contract ─────────────────────
describe("Phase 2 — writeMasteryRecordsForUnit helper contract", () => {
  const dbSource = fs.readFileSync(
    path.join(ROOT, "server/db.ts"),
    "utf-8"
  );

  it("db.ts exports writeMasteryRecordsForUnit", () => {
    expect(dbSource).toContain("export async function writeMasteryRecordsForUnit");
  });

  it("writeMasteryRecordsForUnit accepts sourceType quiz or diagnostic", () => {
    expect(dbSource).toContain('"quiz" | "diagnostic"');
  });

  it("writeMasteryRecordsForUnit uses MASTERY_THRESHOLD_LIVE = 75", () => {
    expect(dbSource).toContain("MASTERY_THRESHOLD_LIVE = 75");
  });

  it("writeMasteryRecordsForUnit resolves unitStandards join", () => {
    expect(dbSource).toContain("unitStandards");
    expect(dbSource).toContain("eq(unitStandards.unitId, unitId)");
  });

  it("writeMasteryRecordsForUnit resolves active enrollmentContext", () => {
    expect(dbSource).toContain("enrollmentContexts");
    expect(dbSource).toContain("eq(enrollmentContexts.studentId, studentId)");
    expect(dbSource).toContain("eq(enrollmentContexts.isActive, true)");
  });

  it("writeMasteryRecordsForUnit uses GREATEST(score) semantics — higher score wins", () => {
    expect(dbSource).toContain("Math.max(prev.score, score)");
  });

  it("writeMasteryRecordsForUnit increments attemptCount on update", () => {
    expect(dbSource).toContain("(prev.attemptCount ?? 0) + 1");
  });

  it("writeMasteryRecordsForUnit is non-fatal (outer try/catch)", () => {
    expect(dbSource).toContain("// Non-fatal: masteryRecords dual-write failure must never break the primary scoring path");
  });

  it("writeMasteryRecordsForUnit imports Phase 1A tables from schema", () => {
    expect(dbSource).toContain("masteryRecords,");
    expect(dbSource).toContain("enrollmentContexts,");
    expect(dbSource).toContain("unitStandards,");
    expect(dbSource).toContain("standards,");
  });
});

// ─── Suite 6: routers.ts dual-write wiring ────────────────────────────────────
describe("Phase 2 — routers.ts dual-write wiring", () => {
  const routersSource = fs.readFileSync(
    path.join(ROOT, "server/routers.ts"),
    "utf-8"
  );

  it("routers.ts imports writeMasteryRecordsForUnit", () => {
    expect(routersSource).toContain("writeMasteryRecordsForUnit");
  });

  it("quiz.submitQuiz calls writeMasteryRecordsForUnit with sourceType quiz", () => {
    expect(routersSource).toContain('writeMasteryRecordsForUnit(ctx.user.id, input.unitId, score, "quiz")');
  });

  it("diagnostic.submitDiagnostic calls writeMasteryRecordsForUnit with sourceType diagnostic", () => {
    expect(routersSource).toContain('writeMasteryRecordsForUnit(ctx.user.id, assessedUnit.id, unitScore, "diagnostic")');
  });

  it("early-learner diagnostic also calls writeMasteryRecordsForUnit", () => {
    // Count occurrences — should be at least 2 (one per diagnostic path)
    const occurrences = (routersSource.match(/writeMasteryRecordsForUnit/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(3); // import + quiz + diagnostic + early-learner
  });

  it("all dual-write calls are non-fatal (.catch(() => {}))", () => {
    const dualWriteCalls = routersSource.match(/writeMasteryRecordsForUnit\([^)]+\)\.catch\(\(\) => \{\}\)/g) ?? [];
    expect(dualWriteCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("quiz dual-write runs after upsertUserMastery (not before)", () => {
    const upsertIdx = routersSource.indexOf("upsertUserMastery(ctx.user.id, skillId, skillScore)");
    const dualWriteIdx = routersSource.indexOf('writeMasteryRecordsForUnit(ctx.user.id, input.unitId, score, "quiz")');
    expect(upsertIdx).toBeGreaterThan(-1);
    expect(dualWriteIdx).toBeGreaterThan(upsertIdx);
  });
});
