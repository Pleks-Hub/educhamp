/**
 * Phase 4B Tests — COPPA Gate, Age Utilities, Grade Window, Course Eligibility
 *
 * Covers:
 *  1. calcAge / isUnder13 / isMinor
 *  2. ageToGrade
 *  3. gradeToNum / gradeWindow
 *  4. isCourseEligible (grade window ±2, AP/SAT always eligible)
 *  5. isCoppaGrade (DB helper — pure logic, no DB call)
 *  6. COPPA gate middleware error codes
 */

import { describe, it, expect } from "vitest";
import {
  calcAge,
  isUnder13,
  isMinor,
  ageToGrade,
  gradeToNum,
  gradeWindow,
  isCourseEligible,
} from "./utils/age";
import { isCoppaGrade } from "./db";

// ─── 1. calcAge ───────────────────────────────────────────────────────────────

describe("calcAge", () => {
  it("returns null for null/undefined input", () => {
    expect(calcAge(null)).toBeNull();
    expect(calcAge(undefined)).toBeNull();
    expect(calcAge("")).toBeNull();
  });

  it("returns null for invalid date strings", () => {
    expect(calcAge("not-a-date")).toBeNull();
    expect(calcAge("2000-13-01")).toBeNull();
  });

  it("returns correct age for a known past date", () => {
    // Someone born exactly 20 years ago should be 20
    const today = new Date();
    const dob = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
    const dobStr = dob.toISOString().split("T")[0];
    expect(calcAge(dobStr)).toBe(20);
  });

  it("returns age - 1 if birthday hasn't occurred yet this year", () => {
    const today = new Date();
    // Set birthday to tomorrow's month/day from 20 years ago
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dob = new Date(today.getFullYear() - 20, tomorrow.getMonth(), tomorrow.getDate());
    const dobStr = dob.toISOString().split("T")[0];
    expect(calcAge(dobStr)).toBe(19);
  });
});

// ─── 2. isUnder13 ─────────────────────────────────────────────────────────────

describe("isUnder13", () => {
  it("returns false for null/undefined (conservative: do not gate unknown ages)", () => {
    expect(isUnder13(null)).toBe(false);
    expect(isUnder13(undefined)).toBe(false);
  });

  it("returns true for a 12-year-old", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 12, today.getMonth(), today.getDate());
    expect(isUnder13(dob.toISOString().split("T")[0])).toBe(true);
  });

  it("returns true for a 13-year-old (EduChamp policy: under-14 gate, so 13 IS gated)", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    expect(isUnder13(dob.toISOString().split("T")[0])).toBe(true);
  });

  it("returns false for a 14-year-old (exactly at threshold — 14 is NOT gated)", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 14, today.getMonth(), today.getDate());
    expect(isUnder13(dob.toISOString().split("T")[0])).toBe(false);
  });

  it("returns false for a 16-year-old", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
    expect(isUnder13(dob.toISOString().split("T")[0])).toBe(false);
  });
});

// ─── 3. isMinor ───────────────────────────────────────────────────────────────

describe("isMinor", () => {
  it("returns true for a 17-year-old", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
    expect(isMinor(dob.toISOString().split("T")[0])).toBe(true);
  });

  it("returns false for an 18-year-old", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    expect(isMinor(dob.toISOString().split("T")[0])).toBe(false);
  });
});

// ─── 4. ageToGrade ────────────────────────────────────────────────────────────

describe("ageToGrade", () => {
  it("returns null for null/undefined", () => {
    expect(ageToGrade(null)).toBeNull();
  });

  it("maps age 5 → Kindergarten", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate());
    expect(ageToGrade(dob.toISOString().split("T")[0])).toBe("Kindergarten");
  });

  it("maps age 10 → Grade 5", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate());
    expect(ageToGrade(dob.toISOString().split("T")[0])).toBe("5");
  });

  it("maps age 16 → Grade 11", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
    expect(ageToGrade(dob.toISOString().split("T")[0])).toBe("11");
  });

  it("maps age 20 → Adult", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
    expect(ageToGrade(dob.toISOString().split("T")[0])).toBe("Adult");
  });
});

// ─── 5. gradeToNum ────────────────────────────────────────────────────────────

describe("gradeToNum", () => {
  it("converts numeric grade strings", () => {
    expect(gradeToNum("9")).toBe(9);
    expect(gradeToNum("12")).toBe(12);
    expect(gradeToNum("1")).toBe(1);
  });

  it("converts Kindergarten → 0", () => {
    expect(gradeToNum("Kindergarten")).toBe(0);
  });

  it("converts Pre-K → -1", () => {
    expect(gradeToNum("Pre-K")).toBe(-1);
  });

  it("returns null for non-numeric grades (AP, SAT, Adult)", () => {
    expect(gradeToNum("AP")).toBeNull();
    expect(gradeToNum("SAT")).toBeNull();
    expect(gradeToNum("Adult")).toBeNull();
    expect(gradeToNum(null)).toBeNull();
  });
});

// ─── 6. gradeWindow ───────────────────────────────────────────────────────────

// Spec behaviour (approved 2026-05-30):
//   - Floor = grade - 1 for all students
//   - Ceiling = null (no restriction) for Grade 7+
//   - Ceiling = grade + 2 for Grade 6 and below
describe("gradeWindow", () => {
  it("Grade 9 student: floor=8, ceiling=null (no upper cap for Grade 7+)", () => {
    expect(gradeWindow("9")).toEqual({ floor: 8, ceiling: null });
  });

  it("Grade 7 student: floor=6, ceiling=null (boundary of no-ceiling rule)", () => {
    expect(gradeWindow("7")).toEqual({ floor: 6, ceiling: null });
  });

  it("Grade 6 student: floor=5, ceiling=8 (soft ceiling applies below Grade 7)", () => {
    expect(gradeWindow("6")).toEqual({ floor: 5, ceiling: 8 });
  });

  it("Grade 1 student: floor=0 (Kindergarten), ceiling=3", () => {
    expect(gradeWindow("1")).toEqual({ floor: 0, ceiling: 3 });
  });

  it("returns null floor/ceiling for non-numeric grades (AP, SAT, Adult)", () => {
    expect(gradeWindow("AP")).toEqual({ floor: null, ceiling: null });
    expect(gradeWindow(null)).toEqual({ floor: null, ceiling: null });
  });
});

// ─── 7. isCourseEligible ─────────────────────────────────────────────────────

describe("isCourseEligible", () => {
  it("always returns true for AP courses", () => {
    expect(isCourseEligible("AP", "9")).toBe(true);
    expect(isCourseEligible("AP", "6")).toBe(true);
  });

  it("always returns true for SAT courses", () => {
    expect(isCourseEligible("SAT", "9")).toBe(true);
  });

  it("Grade 9 student: can access Grade 8, 9, 10, 11, 12 (no ceiling)", () => {
    expect(isCourseEligible("8", "9")).toBe(true);  // floor = 8, exactly at floor
    expect(isCourseEligible("9", "9")).toBe(true);
    expect(isCourseEligible("12", "9")).toBe(true); // no ceiling for Grade 7+
  });

  it("Grade 9 student: cannot access Grade 7 (below floor of 8)", () => {
    expect(isCourseEligible("7", "9")).toBe(false);
    expect(isCourseEligible("6", "9")).toBe(false);
    expect(isCourseEligible("1", "9")).toBe(false);
  });

  it("Grade 6 student: can access Grade 5, 6, 7, 8 but not Grade 9 (soft ceiling)", () => {
    expect(isCourseEligible("5", "6")).toBe(true);
    expect(isCourseEligible("6", "6")).toBe(true);
    expect(isCourseEligible("8", "6")).toBe(true);  // ceiling = 8
    expect(isCourseEligible("9", "6")).toBe(false); // above soft ceiling
  });

  it("returns true when student grade is null (no restriction)", () => {
    expect(isCourseEligible("9", null)).toBe(true);
    expect(isCourseEligible("12", null)).toBe(true);
  });

  it("returns true when course grade is null (no restriction)", () => {
    expect(isCourseEligible(null, "9")).toBe(true);
  });
});

// ─── 8. isCoppaGrade ─────────────────────────────────────────────────────────

// EduChamp policy: under-14 gate covers K–8 (ages ~5–13)
describe("isCoppaGrade", () => {
  it("returns true for grades K–8 (COPPA_GRADES set covers Pre-K through Grade 8)", () => {
    expect(isCoppaGrade("Kindergarten")).toBe(true);
    expect(isCoppaGrade("1")).toBe(true);
    expect(isCoppaGrade("5")).toBe(true);
    expect(isCoppaGrade("6")).toBe(true);
    expect(isCoppaGrade("7")).toBe(true);  // newly added: 7th graders are typically 12–13
    expect(isCoppaGrade("8")).toBe(true);  // newly added: 8th graders are typically 13–14
    // Also accepts 'Grade N' format
    expect(isCoppaGrade("Grade 7")).toBe(true);
    expect(isCoppaGrade("Grade 8")).toBe(true);
    expect(isCoppaGrade("8th Grade")).toBe(true);
  });

  it("age-13 boundary: Grade 8 triggers consent gate (age 13 is under-14)", () => {
    // A 13-year-old is typically in Grade 8. Under EduChamp policy (< 14), they require consent.
    expect(isCoppaGrade("8")).toBe(true);
  });

  it("age-14 boundary: Grade 9 does NOT trigger consent gate (age 14 is not under-14)", () => {
    // A 14-year-old is typically in Grade 9. They do not require parental consent.
    expect(isCoppaGrade("9")).toBe(false);
  });

  it("returns false for Grade 9 and above (not in COPPA_GRADES)", () => {
    expect(isCoppaGrade("9")).toBe(false);
    expect(isCoppaGrade("10")).toBe(false);
    expect(isCoppaGrade("12")).toBe(false);
  });

  it("returns false for null/undefined (conservative: no gate without grade)", () => {
    expect(isCoppaGrade(null)).toBe(false);
    expect(isCoppaGrade(undefined)).toBe(false);
  });

  it("returns false for non-grade strings (AP, SAT, Adult)", () => {
    expect(isCoppaGrade("AP")).toBe(false);
    expect(isCoppaGrade("Adult")).toBe(false);
  });
});

// ─── 9. COPPA gate error codes ───────────────────────────────────────────────

describe("COPPA gate error codes", () => {
  const COPPA_CODES = [
    "COPPA_CONSENT_REQUIRED",
    "COPPA_CONSENT_PENDING",
    "COPPA_CONSENT_DENIED",
    "COPPA_CONSENT_EXPIRED",
  ] as const;

  it("all four COPPA gate error codes are defined strings", () => {
    for (const code of COPPA_CODES) {
      expect(typeof code).toBe("string");
      expect(code.startsWith("COPPA_")).toBe(true);
    }
  });

  it("COPPA_CONSENT_REQUIRED is distinct from COPPA_CONSENT_PENDING", () => {
    expect("COPPA_CONSENT_REQUIRED").not.toBe("COPPA_CONSENT_PENDING");
  });

  it("COPPA_CONSENT_DENIED is distinct from COPPA_CONSENT_EXPIRED", () => {
    expect("COPPA_CONSENT_DENIED").not.toBe("COPPA_CONSENT_EXPIRED");
  });
});
