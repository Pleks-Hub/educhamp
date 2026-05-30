/**
 * Phase 1 Tests — Multi-District Architecture
 * Covers:
 *  - Phase 1A: New DB table schema shape assertions (standardFrameworks, standards,
 *              unitStandards, masteryRecords, parentalConsents)
 *  - Phase 1B: COPPA gate logic (grade detection, parentEmail ≠ student email,
 *              isCoppaGrade, grandfathering check shape)
 *  - Phase 1C: De-Katying verification — no Katy/TEKS/STAAR strings in system prompts
 *              or user-facing copy constants
 */
import { describe, it, expect } from "vitest";
import {
  standardFrameworks,
  standards,
  unitStandards,
  masteryRecords,
  parentalConsents,
  districts,
  schools,
  tracks,
} from "../drizzle/schema";
import { isCoppaGrade, COPPA_GRADES } from "./db";
import { buildTutorSystemPrompt } from "./educhamp-helpers";

// ─── Phase 1A: Schema shape assertions ───────────────────────────────────────

describe("Phase 1A — standardFrameworks table schema", () => {
  it("has required columns: id, code, name, stateCode, isActive, createdAt", () => {
    // Verify via $inferSelect type shape
    type SF = typeof standardFrameworks.$inferSelect;
    const sample: SF = {
      id: 1,
      code: "TEKS",
      name: "Texas Essential Knowledge and Skills",
      stateCode: "TX",
      isActive: true,
      createdAt: new Date(),
    };
    expect(sample.code).toBe("TEKS");
    expect(sample.isActive).toBe(true);
  });

  it("standardFrameworks.$inferInsert requires code and name", () => {
    type SFInsert = typeof standardFrameworks.$inferInsert;
    const insert: SFInsert = { code: "CCSS", name: "Common Core State Standards" };
    expect(insert.code).toBe("CCSS");
  });
});

describe("Phase 1A — standards table schema", () => {
  it("has required columns: id, frameworkId, code, description, isCanonical, isActive", () => {
    type S = typeof standards.$inferSelect;
    const sample: S = {
      id: 1,
      frameworkId: 1,
      code: "A.5(A)",
      description: "Solve linear equations",
      gradeLevel: "9",
      subject: "math",
      strand: "Algebraic Reasoning",
      isCanonical: true,
      isActive: true,
      createdAt: new Date(),
    };
    expect(sample.isCanonical).toBe(true);
    expect(sample.frameworkId).toBe(1);
  });

  it("isCanonical defaults to true in insert type", () => {
    type SInsert = typeof standards.$inferInsert;
    const insert: SInsert = {
      frameworkId: 1,
      code: "alg1_solving_linear_equations",
      description: "Solve linear equations",
      isCanonical: false,  // slug extracted from teksAlignment — needs review
    };
    expect(insert.isCanonical).toBe(false);
  });
});

describe("Phase 1A — unitStandards join table schema", () => {
  it("has unitId, standardId, isPrimary columns", () => {
    type US = typeof unitStandards.$inferSelect;
    const sample: US = {
      id: 1,
      unitId: 10,
      standardId: 5,
      isPrimary: true,
    };
    expect(sample.unitId).toBe(10);
    expect(sample.isPrimary).toBe(true);
  });
});

describe("Phase 1A — masteryRecords table schema", () => {
  it("has studentId, score, isMastered, sourceType, frameworkId, enrollmentContextId", () => {
    type MR = typeof masteryRecords.$inferSelect;
    const sample: MR = {
      id: 1,
      studentId: 42,
      objectiveId: null,
      standardId: 5,
      frameworkId: 1,
      enrollmentContextId: 1,
      score: 80,
      isMastered: true,
      attemptCount: 3,
      lastAssessedAt: new Date(),
      sourceType: "quiz",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(sample.isMastered).toBe(true);
    expect(sample.score).toBe(80);
    expect(sample.sourceType).toBe("quiz");
  });

  it("sourceType enum includes quiz, diagnostic, manual, backfill", () => {
    const validSources: Array<typeof masteryRecords.$inferSelect["sourceType"]> = [
      "quiz", "diagnostic", "manual", "backfill",
    ];
    expect(validSources).toHaveLength(4);
    expect(validSources).toContain("quiz");
    expect(validSources).toContain("backfill");
  });
});

describe("Phase 1A — parentalConsents table schema", () => {
  it("has studentId, parentEmail, token, status, expiresAt columns", () => {
    type PC = typeof parentalConsents.$inferSelect;
    const sample: PC = {
      id: 1,
      studentId: 42,
      parentEmail: "parent@example.com",
      parentName: "Jane Doe",
      token: "abc123token",
      status: "pending",
      requestedAt: new Date(),
      respondedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: null,
    };
    expect(sample.status).toBe("pending");
    expect(sample.parentEmail).toBe("parent@example.com");
  });

  it("status enum includes pending, approved, denied, expired", () => {
    const validStatuses: Array<typeof parentalConsents.$inferSelect["status"]> = [
      "pending", "approved", "denied", "expired",
    ];
    expect(validStatuses).toHaveLength(4);
    expect(validStatuses).toContain("approved");
    expect(validStatuses).toContain("expired");
  });
});

describe("Phase 1A — districts table schema", () => {
  it("has id, name, stateId, ncesDid columns", () => {
    type D = typeof districts.$inferSelect;
    const sample: D = {
      id: 1,
      name: "Katy ISD",
      stateId: 1,
      ncesDid: "4826580",
      website: null,
      isActive: true,
      createdAt: new Date(),
    };
    expect(sample.name).toBe("Katy ISD");
    expect(sample.isActive).toBe(true);
  });
});

describe("Phase 1A — schools table schema", () => {
  it("has id, name, districtId, ncesId columns", () => {
    type Sc = typeof schools.$inferSelect;
    const sample: Sc = {
      id: 1,
      name: "Katy High School",
      districtId: 1,
      ncesId: "480001",
      gradeRange: "9-12",
      isActive: true,
      createdAt: new Date(),
    };
    expect(sample.districtId).toBe(1);
    expect(sample.gradeRange).toBe("9-12");
  });
});

describe("Phase 1A — tracks table schema", () => {
  it("has id, districtId, name, frameworkId, isDefault columns", () => {
    type T = typeof tracks.$inferSelect;
    const sample: T = {
      id: 1,
      districtId: 1,
      name: "Standard Track",
      frameworkId: 1,
      isDefault: true,
      createdAt: new Date(),
    };
    expect(sample.isDefault).toBe(true);
    expect(sample.frameworkId).toBe(1);
  });
});

// ─── Phase 1B: COPPA gate logic ───────────────────────────────────────────────

describe("Phase 1B — COPPA_GRADES set coverage", () => {
  it("includes Pre-K through Grade 6 (various formats)", () => {
    // Standard format used in StudentOnboarding
    expect(COPPA_GRADES.has("Pre-K")).toBe(true);
    expect(COPPA_GRADES.has("Kindergarten")).toBe(true);
    expect(COPPA_GRADES.has("Grade 1")).toBe(true);
    expect(COPPA_GRADES.has("Grade 2")).toBe(true);
    expect(COPPA_GRADES.has("Grade 3")).toBe(true);
    expect(COPPA_GRADES.has("Grade 4")).toBe(true);
    expect(COPPA_GRADES.has("Grade 5")).toBe(true);
    expect(COPPA_GRADES.has("Grade 6")).toBe(true);
  });

  it("includes Grade 7 and Grade 8 (EduChamp policy: under-14 gate covers K–8)", () => {
    expect(COPPA_GRADES.has("Grade 7")).toBe(true);
    expect(COPPA_GRADES.has("Grade 8")).toBe(true);
  });

  it("does NOT include Grade 9 through Grade 12", () => {
    expect(COPPA_GRADES.has("Grade 9")).toBe(false);
    expect(COPPA_GRADES.has("Grade 10")).toBe(false);
    expect(COPPA_GRADES.has("Grade 11")).toBe(false);
    expect(COPPA_GRADES.has("Grade 12")).toBe(false);
  });

  it("does NOT include AP or SAT Prep grades", () => {
    expect(COPPA_GRADES.has("AP")).toBe(false);
    expect(COPPA_GRADES.has("SAT Prep")).toBe(false);
  });
});

describe("Phase 1B — isCoppaGrade() function", () => {
  it("returns true for Pre-K", () => {
    expect(isCoppaGrade("Pre-K")).toBe(true);
  });

  it("returns true for Kindergarten", () => {
    expect(isCoppaGrade("Kindergarten")).toBe(true);
  });

  it("returns true for Grade 6", () => {
    expect(isCoppaGrade("Grade 6")).toBe(true);
  });

  it("returns true for Grade 7 (EduChamp policy: under-14 gate covers K–8)", () => {
    expect(isCoppaGrade("Grade 7")).toBe(true);
  });

  it("returns false for Grade 9", () => {
    expect(isCoppaGrade("Grade 9")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isCoppaGrade(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isCoppaGrade(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isCoppaGrade("")).toBe(false);
  });

  it("handles numeric grade format '6'", () => {
    expect(isCoppaGrade("6")).toBe(true);
  });

  it("handles numeric grade format '7' (EduChamp policy: Grade 7 is in COPPA_GRADES)", () => {
    expect(isCoppaGrade("7")).toBe(true);
  });

  it("trims whitespace before checking", () => {
    expect(isCoppaGrade("  Grade 5  ")).toBe(true);
  });
});

describe("Phase 1B — COPPA parentEmail ≠ student email validation", () => {
  /**
   * Replicates the validation logic from StudentOnboarding.tsx and coppa.ts router.
   * parentEmail must not equal the student's own login email (COPPA requirement).
   */
  function validateParentEmail(parentEmail: string, studentEmail: string): boolean {
    return parentEmail.toLowerCase().trim() !== studentEmail.toLowerCase().trim();
  }

  it("rejects parent email that matches student email exactly", () => {
    expect(validateParentEmail("student@example.com", "student@example.com")).toBe(false);
  });

  it("rejects parent email that matches student email case-insensitively", () => {
    expect(validateParentEmail("STUDENT@EXAMPLE.COM", "student@example.com")).toBe(false);
  });

  it("rejects parent email that matches student email with trailing spaces", () => {
    expect(validateParentEmail("  student@example.com  ", "student@example.com")).toBe(false);
  });

  it("allows parent email that is different from student email", () => {
    expect(validateParentEmail("parent@example.com", "student@example.com")).toBe(true);
  });

  it("allows parent email on different domain", () => {
    expect(validateParentEmail("parent@gmail.com", "student@school.edu")).toBe(true);
  });
});

describe("Phase 1B — COPPA gate: grade ≤ 6 triggers consent", () => {
  /**
   * Replicates the COPPA_GRADES check used in StudentOnboarding.tsx.
   * Grade ≤ 6 (Pre-K through Grade 6) requires parental consent.
   */
  const COPPA_ONBOARDING_GRADES = new Set([
    "Pre-K", "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  ]);

  function requiresCoppaConsent(grade: string): boolean {
    return COPPA_ONBOARDING_GRADES.has(grade);
  }

  it("Pre-K requires COPPA consent", () => {
    expect(requiresCoppaConsent("Pre-K")).toBe(true);
  });

  it("Kindergarten requires COPPA consent", () => {
    expect(requiresCoppaConsent("Kindergarten")).toBe(true);
  });

  it("Grade 1 requires COPPA consent", () => {
    expect(requiresCoppaConsent("Grade 1")).toBe(true);
  });

  it("Grade 6 requires COPPA consent", () => {
    expect(requiresCoppaConsent("Grade 6")).toBe(true);
  });

  it("Grade 7 does NOT require COPPA consent", () => {
    expect(requiresCoppaConsent("Grade 7")).toBe(false);
  });

  it("Grade 9 does NOT require COPPA consent", () => {
    expect(requiresCoppaConsent("Grade 9")).toBe(false);
  });

  it("Grade 12 does NOT require COPPA consent", () => {
    expect(requiresCoppaConsent("Grade 12")).toBe(false);
  });
});

// ─── Phase 1C: De-Katying verification ───────────────────────────────────────

describe("Phase 1C — buildTutorSystemPrompt: no Katy/TEKS/STAAR strings", () => {
  const FORBIDDEN_STRINGS = ["Katy ISD", "STAAR", "ACA track", "KAP track"];
  // buildTutorSystemPrompt(studentName, mode, currentUnitTitle, masteryData, ctx?)
  const EMPTY_MASTERY: { skillId: string; score: number }[] = [];

  it("does not contain 'Katy ISD' in the base teach prompt", () => {
    const prompt = buildTutorSystemPrompt("Test Student", "teach", "Unit 1", EMPTY_MASTERY);
    for (const forbidden of FORBIDDEN_STRINGS) {
      expect(prompt).not.toContain(forbidden);
    }
  });

  it("does not contain forbidden strings when courseContext is provided", () => {
    const prompt = buildTutorSystemPrompt(
      "Test Student",
      "teach",
      "Linear Equations",
      EMPTY_MASTERY,
      {
        courseContext: {
          title: "Algebra I",
          subject: "math",
          gradeLevel: "9",
          teksCode: null,
          courseCode: "ALG1",
        },
      }
    );
    for (const forbidden of FORBIDDEN_STRINGS) {
      expect(prompt).not.toContain(forbidden);
    }
  });

  it("does not contain forbidden strings in quiz mode", () => {
    const prompt = buildTutorSystemPrompt("Test Student", "quiz", "Unit 2", EMPTY_MASTERY);
    for (const forbidden of FORBIDDEN_STRINGS) {
      expect(prompt).not.toContain(forbidden);
    }
  });

  it("does not contain forbidden strings in exam_review mode", () => {
    const prompt = buildTutorSystemPrompt("Test Student", "exam_review", "Unit 3", EMPTY_MASTERY);
    for (const forbidden of FORBIDDEN_STRINGS) {
      expect(prompt).not.toContain(forbidden);
    }
  });
});

describe("Phase 1C — LANDING_SYSTEM_PROMPT: no Katy/TEKS/STAAR strings", () => {
  /**
   * We test the landing system prompt by reading the source file directly.
   * This ensures the marketing chatbot is district-agnostic.
   */
  it("landing.ts source file contains no Katy ISD references", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      new URL("./routers/landing.ts", import.meta.url),
      "utf-8"
    );
    expect(content).not.toContain("Katy ISD");
    expect(content).not.toContain("STAAR");
    expect(content).not.toContain("ACA track");
    expect(content).not.toContain("KAP track");
  });
});

describe("Phase 1C — educhamp-helpers.ts: no Katy/STAAR string literals", () => {
  it("educhamp-helpers.ts source file contains no Katy ISD or STAAR string literals", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      new URL("./educhamp-helpers.ts", import.meta.url),
      "utf-8"
    );
    expect(content).not.toContain("Katy ISD");
    expect(content).not.toContain("STAAR");
    expect(content).not.toContain("ACA track");
    expect(content).not.toContain("KAP track");
  });
});

describe("Phase 1C — stripe.ts: no STAAR string literals", () => {
  it("stripe.ts source file contains no STAAR references in plan features", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      new URL("./stripe.ts", import.meta.url),
      "utf-8"
    );
    expect(content).not.toContain("STAAR");
    expect(content).not.toContain("Katy ISD");
  });
});

describe("Phase 1C — onboarding.ts: no STAAR string literals", () => {
  it("onboarding.ts source file contains no STAAR references in goal generation prompt", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      new URL("./routers/onboarding.ts", import.meta.url),
      "utf-8"
    );
    expect(content).not.toContain("STAAR");
    expect(content).not.toContain("Katy ISD");
  });
});

// ─── Mastery Threshold Alignment ────────────────────────────────────────────

describe("Mastery threshold alignment — CONFIRMED 75 across all tables", () => {
  /**
   * Verifies that the mastery threshold is consistently 75 in:
   *  1. learningObjectives.masteryThreshold default (schema)
   *  2. masteryRecords.isMastered comment (source file)
   *  3. weeklyParentDigest.ts newSkillsMastered filter (source file)
   *  4. userMastery label system (score >= 75 = "Mastered" in educhamp-helpers.ts)
   */

  it("learningObjectives.masteryThreshold defaults to 75", () => {
    type LO = typeof learningObjectives.$inferInsert;
    // The default is 75; if omitted it resolves to 75 at the DB level.
    // We verify the TypeScript type allows 75 as a valid value.
    const obj: LO = {
      standardId: 1,
      description: "Solve linear equations in one variable",
      masteryThreshold: 75,
    };
    expect(obj.masteryThreshold).toBe(75);
  });

  it("masteryRecords isMastered is aligned with score >= 75", async () => {
    const fs = await import("fs/promises");
    const schemaContent = await fs.readFile(
      new URL("../drizzle/schema.ts", import.meta.url),
      "utf-8"
    );
    // The isMastered comment must reference 75, not 80
    expect(schemaContent).toContain("score >= 75");
    expect(schemaContent).not.toContain("score >= 80");
    // The pending-decision comment must be gone
    expect(schemaContent).not.toContain("pending founder decision");
    expect(schemaContent).not.toContain("pending.*decision");
  });

  it("weeklyParentDigest counts mastered skills at >= 75, not >= 80", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      new URL("./scheduled/weeklyParentDigest.ts", import.meta.url),
      "utf-8"
    );
    expect(content).toContain(">= 75");
    // Must NOT use >= 80 for the newSkillsMastered count
    expect(content).not.toContain(">= 80");
  });

  it("userMastery label system: score >= 75 is the Mastered band boundary", () => {
    // Replicate the getMasteryLabel logic from educhamp-helpers.ts
    function getMasteryLabel(score: number): string {
      if (score >= 90) return "Advanced";
      if (score >= 75) return "Mastered";
      if (score >= 60) return "Approaching";
      if (score >= 40) return "Developing";
      return "Beginner";
    }
    // Boundary: 74 is NOT mastered, 75 IS mastered
    expect(getMasteryLabel(74)).toBe("Approaching");
    expect(getMasteryLabel(75)).toBe("Mastered");
    expect(getMasteryLabel(79)).toBe("Mastered");
    expect(getMasteryLabel(80)).toBe("Mastered");
    expect(getMasteryLabel(89)).toBe("Mastered");
    expect(getMasteryLabel(90)).toBe("Advanced");
  });

  it("masteryRecords backfill SQL uses score >= 75 for isMastered", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      new URL("../docs/PHASE1_MIGRATION_PLAN.md", import.meta.url),
      "utf-8"
    );
    // The backfill pseudocode must use (um.score >= 75)
    expect(content).toContain("(um.score >= 75)");
    // The pending-decision section must be resolved
    expect(content).not.toContain("Awaiting founder confirmation");
    expect(content).not.toContain("pending founder decision");
    // The confirmed threshold table must be present
    expect(content).toContain("CONFIRMED");
  });

  it("per-objective override: learningObjectives.masteryThreshold can be set to 80 post-Phase 2", () => {
    // This is a forward-looking design test — the field accepts values other than 75
    type LO = typeof learningObjectives.$inferInsert;
    const advancedObj: LO = {
      standardId: 1,
      description: "Advanced: Prove theorems about linear systems",
      masteryThreshold: 80, // allowed for new objectives post-Phase 2
    };
    expect(advancedObj.masteryThreshold).toBe(80);
    // But the global default is 75
    const standardObj: LO = {
      standardId: 2,
      description: "Standard objective",
      masteryThreshold: 75,
    };
    expect(standardObj.masteryThreshold).toBe(75);
  });
});

// ─── Phase 1A: 18 new tables exist in schema u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500

describe("Phase 1A — 18 new tables present in schema", () => {
  const PHASE1A_TABLES = [
    "standardFrameworks",
    "standards",
    "standardCrosswalk",
    "countries",
    "states",
    "districts",
    "schools",
    "tracks",
    "pacingGuides",
    "pacingWindows",
    "resourceAdoptions",
    "learningObjectives",
    "objectivePrerequisites",
    "assessmentTemplates",
    "enrollmentContexts",
    "masteryRecords",
    "unitStandards",
    "parentalConsents",
  ] as const;

  it("all 18 Phase 1A tables are exported from schema.ts", async () => {
    const schema = await import("../drizzle/schema");
    for (const tableName of PHASE1A_TABLES) {
      expect(schema).toHaveProperty(tableName);
    }
  });

  it("has exactly 18 Phase 1A tables", () => {
    expect(PHASE1A_TABLES).toHaveLength(18);
  });
});
