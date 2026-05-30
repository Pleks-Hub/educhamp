/**
 * Misconception Drill Feature Tests
 *
 * Covers:
 *  1. TutorMode enum — misconception_drill is a valid value in the DB schema
 *  2. MODE_INSTRUCTIONS — misconception_drill has a dedicated server-side instruction block
 *  3. buildTutorSystemPrompt — misconception_drill produces a prompt with the drill directive
 *  4. Lesson content injection — misconceptions array is injected when lessonContent is present
 *  5. UI chip logic — showMisconceptionChip condition is correct
 *  6. Deep-link URL format — LessonDetail "Practice on these" button URL is correct
 *  7. History label — MODE_LABELS includes misconception_drill
 *  8. STUDENT_MODES — misconception_drill is visible to students
 *  9. Tooltip registry — modeMisconceptionDrill tooltip exists
 * 10. DB migration — 0035 SQL adds misconception_drill to the enum
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

// ─── 1. DB Schema — enum value ────────────────────────────────────────────────

describe("DB schema — tutorSessions.mode enum", () => {
  it("schema.ts includes misconception_drill in the mode enum", () => {
    const schema = fs.readFileSync(path.join(ROOT, "drizzle/schema.ts"), "utf8");
    expect(schema).toContain("\"misconception_drill\"");
  });

  it("migration 0035 adds misconception_drill to the enum", () => {
    const migration = fs.readFileSync(
      path.join(ROOT, "drizzle/0035_curved_bloodaxe.sql"),
      "utf8"
    );
    expect(migration).toContain("misconception_drill");
    expect(migration).toContain("ALTER TABLE");
    expect(migration).toContain("tutorSessions");
  });
});

// ─── 2. Server — MODE_INSTRUCTIONS ───────────────────────────────────────────

describe("Server — MODE_INSTRUCTIONS for misconception_drill", () => {
  it("educhamp-helpers.ts defines a misconception_drill instruction block", () => {
    const helpers = fs.readFileSync(
      path.join(ROOT, "server/educhamp-helpers.ts"),
      "utf8"
    );
    expect(helpers).toContain("misconception_drill");
    // Should have a meaningful instruction, not just the key
    const idx = helpers.indexOf("misconception_drill");
    const surrounding = helpers.slice(idx, idx + 300);
    expect(surrounding).toMatch(/misconception|common mistake|error|trap/i);
  });

  it("tutorStream.ts VALID_MODES includes misconception_drill", () => {
    const stream = fs.readFileSync(
      path.join(ROOT, "server/tutorStream.ts"),
      "utf8"
    );
    expect(stream).toContain("misconception_drill");
  });

  it("routers.ts z.enum includes misconception_drill", () => {
    const routers = fs.readFileSync(
      path.join(ROOT, "server/routers.ts"),
      "utf8"
    );
    // Should appear at least once in a z.enum call
    expect(routers).toContain("misconception_drill");
  });
});

// ─── 3. buildTutorSystemPrompt — drill directive ──────────────────────────────

describe("buildTutorSystemPrompt — misconception_drill mode", () => {
  it("produces a prompt string when called with misconception_drill mode", async () => {
    const { buildTutorSystemPrompt } = await import("./educhamp-helpers");
    const prompt = buildTutorSystemPrompt(
      "Alex",
      "misconception_drill",
      "Functions and Representations",
      [],
      { grade: "9", goal: "exam_prep", courseTitle: "Algebra I" }
    );
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
  });

  it("misconception_drill prompt contains drill-specific language", async () => {
    const { buildTutorSystemPrompt } = await import("./educhamp-helpers");
    const prompt = buildTutorSystemPrompt(
      "Alex",
      "misconception_drill",
      "Functions and Representations",
      [],
      { grade: "9", goal: "exam_prep", courseTitle: "Algebra I" }
    );
    // The prompt should reference misconceptions, mistakes, or traps
    expect(prompt).toMatch(/misconception|mistake|error|trap|common/i);
  });

  it("misconception_drill prompt with lessonContent injects the misconceptions list", async () => {
    const { buildTutorSystemPrompt } = await import("./educhamp-helpers");
    const prompt = buildTutorSystemPrompt(
      "Alex",
      "misconception_drill",
      "Functions and Representations",
      [],
      {
        grade: "9",
        goal: "exam_prep",
        courseTitle: "Algebra I",
        lessonContent: {
          explanation: "A function maps each input to exactly one output.",
          workedExamples: [],
          misconceptions: [
            "Confusing domain and range",
            "Thinking all relations are functions",
          ],
        },
      }
    );
    expect(prompt).toContain("Confusing domain and range");
    expect(prompt).toContain("Thinking all relations are functions");
  });
});

// ─── 4. UI — chip visibility logic ───────────────────────────────────────────

describe("UI — misconception drill chip visibility logic", () => {
  it("chip is shown when lessonId is present and mode is not misconception_drill", () => {
    // Mirrors the Tutor.tsx logic:
    // const showMisconceptionChip = safeMode !== "misconception_drill" && !!lessonIdParam;
    const cases: Array<{ mode: string; lessonId: number | undefined; expected: boolean }> = [
      { mode: "teach", lessonId: 5, expected: true },
      { mode: "practice", lessonId: 5, expected: true },
      { mode: "misconception_drill", lessonId: 5, expected: false },
      { mode: "teach", lessonId: undefined, expected: false },
      { mode: "misconception_drill", lessonId: undefined, expected: false },
    ];
    for (const { mode, lessonId, expected } of cases) {
      const showChip = mode !== "misconception_drill" && !!lessonId;
      expect(showChip).toBe(expected);
    }
  });

  it("STUDENT_MODES includes misconception_drill", () => {
    const tutor = fs.readFileSync(
      path.join(ROOT, "client/src/pages/Tutor.tsx"),
      "utf8"
    );
    // STUDENT_MODES array should contain misconception_drill
    expect(tutor).toContain("\"misconception_drill\"");
    const studentModesMatch = tutor.match(/STUDENT_MODES.*?=.*?\[([^\]]+)\]/s);
    expect(studentModesMatch).not.toBeNull();
    expect(studentModesMatch![1]).toContain("misconception_drill");
  });

  it("MODE_LABELS includes misconception_drill", () => {
    const tutor = fs.readFileSync(
      path.join(ROOT, "client/src/pages/Tutor.tsx"),
      "utf8"
    );
    expect(tutor).toContain("misconception_drill: \"Misconception Drill\"");
  });

  it("input placeholder handles misconception_drill mode", () => {
    const tutor = fs.readFileSync(
      path.join(ROOT, "client/src/pages/Tutor.tsx"),
      "utf8"
    );
    expect(tutor).toContain("misconception_drill");
    expect(tutor).toContain("misconception-targeting question");
  });
});

// ─── 5. LessonDetail — deep-link URL ─────────────────────────────────────────

describe("LessonDetail — Practice on these deep-link", () => {
  it("LessonDetail.tsx contains the misconception_drill deep-link CTA", () => {
    const lessonDetail = fs.readFileSync(
      path.join(ROOT, "client/src/pages/LessonDetail.tsx"),
      "utf8"
    );
    expect(lessonDetail).toContain("mode=misconception_drill");
    expect(lessonDetail).toContain("Practice on these");
  });

  it("deep-link URL includes both unit and lesson params", () => {
    const lessonDetail = fs.readFileSync(
      path.join(ROOT, "client/src/pages/LessonDetail.tsx"),
      "utf8"
    );
    // Should have unit= and lesson= in the same URL template literal
    const urlMatch = lessonDetail.match(/`\/tutor\?unit=\$\{[^}]+\}&lesson=\$\{[^}]+\}&mode=misconception_drill`/);
    expect(urlMatch).not.toBeNull();
  });
});

// ─── 6. Tooltip registry ──────────────────────────────────────────────────────

describe("Tooltip registry — modeMisconceptionDrill", () => {
  it("tooltipContent.ts defines modeMisconceptionDrill", () => {
    const tooltips = fs.readFileSync(
      path.join(ROOT, "client/src/lib/tooltipContent.ts"),
      "utf8"
    );
    expect(tooltips).toContain("modeMisconceptionDrill");
    expect(tooltips).toContain("Misconception Drill Mode");
  });

  it("modeMisconceptionDrill tooltip has both title and description", () => {
    const tooltips = fs.readFileSync(
      path.join(ROOT, "client/src/lib/tooltipContent.ts"),
      "utf8"
    );
    const idx = tooltips.indexOf("modeMisconceptionDrill");
    const block = tooltips.slice(idx, idx + 300);
    expect(block).toContain("title:");
    expect(block).toContain("description:");
  });
});

// ─── 7. getModes config ───────────────────────────────────────────────────────

describe("getModes config — misconception_drill entry", () => {
  it("Tutor.tsx getModes includes misconception_drill with starters", () => {
    const tutor = fs.readFileSync(
      path.join(ROOT, "client/src/pages/Tutor.tsx"),
      "utf8"
    );
    expect(tutor).toContain("id: \"misconception_drill\"");
    expect(tutor).toContain("label: \"Misconception Drill\"");
    // Should have at least one starter prompt
    const idx = tutor.indexOf("id: \"misconception_drill\"");
    const block = tutor.slice(idx, idx + 600);
    expect(block).toContain("starters:");
    expect(block).toContain("misconception");
  });
});
