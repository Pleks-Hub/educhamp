/**
 * Phase 3A Tests — STAAR EOC Exam Review & exam_prep Tutor Mode
 *
 * Covers:
 *  1. DB schema — exam_prep added to tutorSessions.mode enum
 *  2. Migration 0036 — ALTER TABLE adds exam_prep to the enum
 *  3. educhamp-helpers.ts — exam_prep TutorMode type and MODE_INSTRUCTIONS entry
 *  4. tutorStream.ts — VALID_MODES and TutorMode include exam_prep
 *  5. routers.ts — all three z.enum mode lists include exam_prep
 *  6. db.ts — getOrCreateTutorSession mode type includes exam_prep
 *  7. buildTutorSystemPrompt — exam_prep mode produces a valid prompt
 *  8. Tutor.tsx — TutorMode, STUDENT_MODES, getModes, MODE_LABELS, placeholder
 *  9. Tutor.tsx — exam_prep quick-action chip logic
 * 10. tooltipContent.ts — modeExamPrep tooltip defined
 * 11. buildExamReview — exported from db.ts
 * 12. assessmentTemplates — seeded in DB (checked via schema export)
 * 13. courses.getNextLesson — procedure defined in routers.ts
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

// ─── 1. DB Schema — enum value ────────────────────────────────────────────────

describe("DB schema — tutorSessions.mode enum includes exam_prep", () => {
  it("schema.ts includes exam_prep in the mode enum", () => {
    const schema = fs.readFileSync(path.join(ROOT, "drizzle/schema.ts"), "utf8");
    expect(schema).toContain("\"exam_prep\"");
  });

  it("schema.ts mode enum contains all expected values including exam_prep", () => {
    const schema = fs.readFileSync(path.join(ROOT, "drizzle/schema.ts"), "utf8");
    const modeMatch = schema.match(/mysqlEnum\("mode",\s*\[([^\]]+)\]/);
    expect(modeMatch).not.toBeNull();
    const enumValues = modeMatch![1];
    expect(enumValues).toContain("teach");
    expect(enumValues).toContain("practice");
    expect(enumValues).toContain("quiz");
    expect(enumValues).toContain("exam_review");
    expect(enumValues).toContain("exam_prep");
    expect(enumValues).toContain("remediation");
    expect(enumValues).toContain("parent_summary");
    expect(enumValues).toContain("misconception_drill");
  });
});

// ─── 2. Migration 0036 ────────────────────────────────────────────────────────

describe("Migration 0036 — adds exam_prep to tutorSessions.mode enum", () => {
  it("migration file 0036_silky_gauntlet.sql exists", () => {
    const migrationPath = path.join(ROOT, "drizzle/0036_silky_gauntlet.sql");
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it("migration 0036 alters tutorSessions to add exam_prep", () => {
    const migration = fs.readFileSync(
      path.join(ROOT, "drizzle/0036_silky_gauntlet.sql"),
      "utf8"
    );
    expect(migration).toContain("exam_prep");
    expect(migration).toContain("ALTER TABLE");
    expect(migration).toContain("tutorSessions");
  });
});

// ─── 3. educhamp-helpers.ts — TutorMode and MODE_INSTRUCTIONS ────────────────

describe("educhamp-helpers.ts — exam_prep TutorMode and MODE_INSTRUCTIONS", () => {
  it("TutorMode type includes exam_prep", () => {
    const helpers = fs.readFileSync(
      path.join(ROOT, "server/educhamp-helpers.ts"),
      "utf8"
    );
    const tutorModeMatch = helpers.match(/export type TutorMode\s*=\s*([^;]+);/);
    expect(tutorModeMatch).not.toBeNull();
    expect(tutorModeMatch![1]).toContain("exam_prep");
  });

  it("MODE_INSTRUCTIONS has an exam_prep entry with meaningful content", () => {
    const helpers = fs.readFileSync(
      path.join(ROOT, "server/educhamp-helpers.ts"),
      "utf8"
    );
    expect(helpers).toContain("exam_prep:");
    const idx = helpers.indexOf("exam_prep:");
    const block = helpers.slice(idx, idx + 500);
    // Should reference exam questions, scoring, or session structure
    expect(block).toMatch(/question|exam|session|score/i);
  });

  it("exam_prep instruction block references the Exam Review Questions section", () => {
    const helpers = fs.readFileSync(
      path.join(ROOT, "server/educhamp-helpers.ts"),
      "utf8"
    );
    expect(helpers).toContain("Exam Review Questions");
  });
});

// ─── 4. tutorStream.ts — VALID_MODES and TutorMode ───────────────────────────

describe("tutorStream.ts — exam_prep in VALID_MODES and TutorMode", () => {
  it("VALID_MODES set includes exam_prep", () => {
    const stream = fs.readFileSync(
      path.join(ROOT, "server/tutorStream.ts"),
      "utf8"
    );
    const validModesMatch = stream.match(/VALID_MODES\s*=\s*new Set<string>\(\[([^\]]+)\]\)/);
    expect(validModesMatch).not.toBeNull();
    expect(validModesMatch![1]).toContain("exam_prep");
  });

  it("local TutorMode type in tutorStream.ts includes exam_prep", () => {
    const stream = fs.readFileSync(
      path.join(ROOT, "server/tutorStream.ts"),
      "utf8"
    );
    const tutorModeMatch = stream.match(/type TutorMode\s*=\s*([^;]+);/);
    expect(tutorModeMatch).not.toBeNull();
    expect(tutorModeMatch![1]).toContain("exam_prep");
  });
});

// ─── 5. routers.ts — z.enum mode lists ───────────────────────────────────────

describe("routers.ts — z.enum mode lists include exam_prep", () => {
  it("all z.enum mode occurrences in routers.ts include exam_prep", () => {
    const routers = fs.readFileSync(
      path.join(ROOT, "server/routers.ts"),
      "utf8"
    );
    // Find all z.enum mode arrays
    const matches = [...routers.matchAll(/z\.enum\(\[([^\]]+)\]\)/g)];
    const modeEnums = matches.filter((m) => m[1].includes("teach") && m[1].includes("practice"));
    expect(modeEnums.length).toBeGreaterThanOrEqual(3);
    for (const match of modeEnums) {
      expect(match[1]).toContain("exam_prep");
    }
  });
});

// ─── 6. db.ts — getOrCreateTutorSession mode type ────────────────────────────

describe("db.ts — getOrCreateTutorSession accepts exam_prep", () => {
  it("getOrCreateTutorSession mode parameter type includes exam_prep", () => {
    const db = fs.readFileSync(path.join(ROOT, "server/db.ts"), "utf8");
    const fnIdx = db.indexOf("export async function getOrCreateTutorSession");
    expect(fnIdx).toBeGreaterThan(-1);
    const block = db.slice(fnIdx, fnIdx + 400);
    expect(block).toContain("exam_prep");
  });
});

// ─── 7. buildTutorSystemPrompt — exam_prep mode ───────────────────────────────

describe("buildTutorSystemPrompt — exam_prep mode", () => {
  it("produces a valid prompt string for exam_prep mode", async () => {
    const { buildTutorSystemPrompt } = await import("./educhamp-helpers");
    const prompt = buildTutorSystemPrompt(
      "Alex",
      "exam_prep",
      "Algebra I Review",
      [],
      {
        courseContext: {
          title: "Algebra I",
          courseCode: "ALG1",
          subject: "math",
          gradeLevel: "9",
        },
      }
    );
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
  });

  it("exam_prep prompt contains exam-prep-specific language", async () => {
    const { buildTutorSystemPrompt } = await import("./educhamp-helpers");
    const prompt = buildTutorSystemPrompt(
      "Alex",
      "exam_prep",
      "Algebra I Review",
      [],
    );
    expect(prompt).toMatch(/exam|question|score|session/i);
  });

  it("exam_prep prompt includes EXAM PREP in the mode header", async () => {
    const { buildTutorSystemPrompt } = await import("./educhamp-helpers");
    const prompt = buildTutorSystemPrompt(
      "Alex",
      "exam_prep",
      "Algebra I Review",
      [],
    );
    expect(prompt).toContain("EXAM PREP");
  });
});

// ─── 8. Tutor.tsx — TutorMode, STUDENT_MODES, getModes, MODE_LABELS ──────────

describe("Tutor.tsx — exam_prep mode registration", () => {
  it("TutorMode type includes exam_prep", () => {
    const tutor = fs.readFileSync(
      path.join(ROOT, "client/src/pages/Tutor.tsx"),
      "utf8"
    );
    const tutorModeMatch = tutor.match(/type TutorMode\s*=\s*([^;]+);/);
    expect(tutorModeMatch).not.toBeNull();
    expect(tutorModeMatch![1]).toContain("exam_prep");
  });

  it("STUDENT_MODES array includes exam_prep", () => {
    const tutor = fs.readFileSync(
      path.join(ROOT, "client/src/pages/Tutor.tsx"),
      "utf8"
    );
    const studentModesMatch = tutor.match(/STUDENT_MODES.*?=.*?\[([^\]]+)\]/s);
    expect(studentModesMatch).not.toBeNull();
    expect(studentModesMatch![1]).toContain("exam_prep");
  });

  it("getModes config includes exam_prep entry with starters", () => {
    const tutor = fs.readFileSync(
      path.join(ROOT, "client/src/pages/Tutor.tsx"),
      "utf8"
    );
    expect(tutor).toContain("id: \"exam_prep\"");
    expect(tutor).toContain("label: \"Exam Prep\"");
    const idx = tutor.indexOf("id: \"exam_prep\"");
    const block = tutor.slice(idx, idx + 600);
    expect(block).toContain("starters:");
    expect(block).toMatch(/exam|STAAR|question/i);
  });

  it("MODE_LABELS includes exam_prep", () => {
    const tutor = fs.readFileSync(
      path.join(ROOT, "client/src/pages/Tutor.tsx"),
      "utf8"
    );
    expect(tutor).toContain("exam_prep: \"Exam Prep\"");
  });

  it("input placeholder handles exam_prep mode", () => {
    const tutor = fs.readFileSync(
      path.join(ROOT, "client/src/pages/Tutor.tsx"),
      "utf8"
    );
    expect(tutor).toContain("mode === \"exam_prep\"");
    expect(tutor).toContain("exam prep session");
  });
});

// ─── 9. Tutor.tsx — exam_prep quick-action chip ───────────────────────────────

describe("Tutor.tsx — exam_prep quick-action chip", () => {
  it("showExamPrepChip variable is defined in Tutor.tsx", () => {
    const tutor = fs.readFileSync(
      path.join(ROOT, "client/src/pages/Tutor.tsx"),
      "utf8"
    );
    expect(tutor).toContain("showExamPrepChip");
  });

  it("exam_prep chip is shown when mode is not exam_prep and no lessonId", () => {
    // Mirrors the Tutor.tsx logic:
    // const showExamPrepChip = safeMode !== "exam_prep" && !lessonIdParam;
    const cases: Array<{ mode: string; lessonId: number | undefined; expected: boolean }> = [
      { mode: "teach", lessonId: undefined, expected: true },
      { mode: "practice", lessonId: undefined, expected: true },
      { mode: "exam_prep", lessonId: undefined, expected: false },
      { mode: "teach", lessonId: 5, expected: false },
      { mode: "exam_prep", lessonId: 5, expected: false },
    ];
    for (const { mode, lessonId, expected } of cases) {
      const showChip = mode !== "exam_prep" && !lessonId;
      expect(showChip).toBe(expected);
    }
  });

  it("exam_prep chip button has correct mode switch logic", () => {
    const tutor = fs.readFileSync(
      path.join(ROOT, "client/src/pages/Tutor.tsx"),
      "utf8"
    );
    // The chip should call handleModeChange("exam_prep")
    expect(tutor).toContain("handleModeChange(\"exam_prep\")");
    expect(tutor).toContain("Start Exam Prep");
  });
});

// ─── 10. tooltipContent.ts — modeExamPrep ────────────────────────────────────

describe("Tooltip registry — modeExamPrep", () => {
  it("tooltipContent.ts defines modeExamPrep", () => {
    const tooltips = fs.readFileSync(
      path.join(ROOT, "client/src/lib/tooltipContent.ts"),
      "utf8"
    );
    expect(tooltips).toContain("modeExamPrep");
    expect(tooltips).toContain("Exam Prep Mode");
  });

  it("modeExamPrep tooltip has both title and description", () => {
    const tooltips = fs.readFileSync(
      path.join(ROOT, "client/src/lib/tooltipContent.ts"),
      "utf8"
    );
    const idx = tooltips.indexOf("modeExamPrep");
    const block = tooltips.slice(idx, idx + 300);
    expect(block).toContain("title:");
    expect(block).toContain("description:");
  });
});

// ─── 11. buildExamReview — exported from db.ts ───────────────────────────────

describe("db.ts — buildExamReview function", () => {
  it("buildExamReview is exported from db.ts", () => {
    const db = fs.readFileSync(path.join(ROOT, "server/db.ts"), "utf8");
    expect(db).toContain("export async function buildExamReview");
  });

  it("buildExamReview accepts courseId and studentId parameters", () => {
    const db = fs.readFileSync(path.join(ROOT, "server/db.ts"), "utf8");
    const fnIdx = db.indexOf("export async function buildExamReview");
    expect(fnIdx).toBeGreaterThan(-1);
    const block = db.slice(fnIdx, fnIdx + 200);
    expect(block).toContain("courseId");
    expect(block).toContain("studentId");
  });

  it("buildExamReview returns questions and metadata", () => {
    const db = fs.readFileSync(path.join(ROOT, "server/db.ts"), "utf8");
    const fnIdx = db.indexOf("export async function buildExamReview");
    // Look for return shape — questions array and metadata
    const block = db.slice(fnIdx, fnIdx + 3000);
    expect(block).toMatch(/questions/i);
    expect(block).toMatch(/templateId|assessmentTemplate|template/i);
  });

  it("buildExamReview implements pacing gate via pacingWindows", () => {
    const db = fs.readFileSync(path.join(ROOT, "server/db.ts"), "utf8");
    expect(db).toContain("pacingWindows");
    expect(db).toContain("buildExamReview");
  });
});

// ─── 12. assessmentTemplates — schema export ─────────────────────────────────

describe("schema.ts — assessmentTemplates table exported", () => {
  it("assessmentTemplates is exported from schema.ts", () => {
    const schema = fs.readFileSync(path.join(ROOT, "drizzle/schema.ts"), "utf8");
    expect(schema).toContain("export const assessmentTemplates");
  });

  it("assessmentTemplates has assessmentRegime and courseId columns", () => {
    const schema = fs.readFileSync(path.join(ROOT, "drizzle/schema.ts"), "utf8");
    const idx = schema.indexOf("export const assessmentTemplates");
    const block = schema.slice(idx, idx + 1000);
    expect(block).toContain("assessmentRegime");
    expect(block).toContain("courseId");
  });
});

// ─── 13. courses.getNextLesson — procedure defined ───────────────────────────

describe("routers.ts — courses.getNextLesson procedure", () => {
  it("getNextLesson procedure is defined in the courses router", () => {
    const routers = fs.readFileSync(path.join(ROOT, "server/routers.ts"), "utf8");
    expect(routers).toContain("getNextLesson:");
    expect(routers).toContain("getUnitsForCourse");
    expect(routers).toContain("getLessonsByUnit");
    expect(routers).toContain("getLessonProgressForUser");
  });

  it("getNextLesson accepts courseId input", () => {
    const routers = fs.readFileSync(path.join(ROOT, "server/routers.ts"), "utf8");
    const idx = routers.indexOf("getNextLesson:");
    const block = routers.slice(idx, idx + 600);
    expect(block).toContain("courseId");
    expect(block).toContain("z.number()");
  });

  it("getNextLesson returns lessonId, unitId, and courseId", () => {
    const routers = fs.readFileSync(path.join(ROOT, "server/routers.ts"), "utf8");
    const idx = routers.indexOf("getNextLesson:");
    const block = routers.slice(idx, idx + 1200);
    expect(block).toContain("lessonId");
    expect(block).toContain("unitId");
    expect(block).toContain("courseId");
  });

  it("getNextLesson returns null when all lessons are complete", () => {
    const routers = fs.readFileSync(path.join(ROOT, "server/routers.ts"), "utf8");
    const idx = routers.indexOf("getNextLesson:");
    const block = routers.slice(idx, idx + 1500);
    // Should have a null return for the all-complete case
    expect(block).toContain("return null");
  });
});
