/**
 * Tests for shared/ageValidation.ts
 *
 * Covers:
 *  - calcAge: basic calculation, birthday not yet reached this year, invalid input
 *  - getGuardianMinAge: default (18), Alabama (19), Nebraska (19), Mississippi (21), case-insensitive
 *  - validateGuardianAge: missing DOB, invalid DOB, below minimum, exactly at minimum, above minimum
 *  - validateStudentAge: missing DOB, too young, too old, valid range
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calcAge,
  getGuardianMinAge,
  validateGuardianAge,
  validateStudentAge,
  DEFAULT_GUARDIAN_MIN_AGE,
  STUDENT_MIN_AGE,
  STUDENT_MAX_AGE,
} from "../shared/ageValidation";

// ─── Helper: freeze "today" so tests are deterministic ───────────────────────

function freezeDate(isoDate: string) {
  const fixed = new Date(isoDate);
  vi.useFakeTimers();
  vi.setSystemTime(fixed);
}

afterEach(() => {
  vi.useRealTimers();
});

// ─── calcAge ─────────────────────────────────────────────────────────────────

describe("calcAge", () => {
  beforeEach(() => freezeDate("2026-05-31"));

  it("returns null for empty string", () => {
    expect(calcAge("")).toBeNull();
  });

  it("returns null for invalid date string", () => {
    expect(calcAge("not-a-date")).toBeNull();
  });

  it("calculates age correctly when birthday has already passed this year", () => {
    // Born 2000-01-15, today is 2026-05-31 → 26 years old
    expect(calcAge("2000-01-15")).toBe(26);
  });

  it("calculates age correctly when birthday has NOT yet occurred this year", () => {
    // Born 2000-12-01, today is 2026-05-31 → still 25 years old
    expect(calcAge("2000-12-01")).toBe(25);
  });

  it("returns 0 for a newborn (today's date)", () => {
    expect(calcAge("2026-05-31")).toBe(0);
  });

  it("returns correct age on the exact birthday", () => {
    // Born 2008-05-31, today is 2026-05-31 → exactly 18
    expect(calcAge("2008-05-31")).toBe(18);
  });

  it("returns correct age one day before birthday", () => {
    // Born 2008-06-01, today is 2026-05-31 → still 17
    expect(calcAge("2008-06-01")).toBe(17);
  });
});

// ─── getGuardianMinAge ────────────────────────────────────────────────────────

describe("getGuardianMinAge", () => {
  it("returns 18 for undefined state", () => {
    expect(getGuardianMinAge(undefined)).toBe(DEFAULT_GUARDIAN_MIN_AGE);
  });

  it("returns 18 for null state", () => {
    expect(getGuardianMinAge(null)).toBe(DEFAULT_GUARDIAN_MIN_AGE);
  });

  it("returns 18 for an unknown state code", () => {
    expect(getGuardianMinAge("XX")).toBe(DEFAULT_GUARDIAN_MIN_AGE);
  });

  it("returns 18 for a typical state (TX)", () => {
    expect(getGuardianMinAge("TX")).toBe(18);
  });

  it("returns 19 for Alabama (AL)", () => {
    expect(getGuardianMinAge("AL")).toBe(19);
  });

  it("returns 19 for Nebraska (NE)", () => {
    expect(getGuardianMinAge("NE")).toBe(19);
  });

  it("returns 21 for Mississippi (MS)", () => {
    expect(getGuardianMinAge("MS")).toBe(21);
  });

  it("is case-insensitive (lowercase 'al' → 19)", () => {
    expect(getGuardianMinAge("al")).toBe(19);
  });

  it("is case-insensitive (mixed 'Ms' → 21)", () => {
    expect(getGuardianMinAge("Ms")).toBe(21);
  });
});

// ─── validateGuardianAge ─────────────────────────────────────────────────────

describe("validateGuardianAge", () => {
  beforeEach(() => freezeDate("2026-05-31"));

  it("returns invalid when DOB is missing", () => {
    const result = validateGuardianAge(null, "TX");
    expect(result.valid).toBe(false);
    expect((result as any).reason).toMatch(/required/i);
  });

  it("returns invalid when DOB is empty string", () => {
    const result = validateGuardianAge("", "TX");
    expect(result.valid).toBe(false);
  });

  it("returns invalid when DOB is not a valid date", () => {
    const result = validateGuardianAge("bad-date", "TX");
    expect(result.valid).toBe(false);
    expect((result as any).reason).toMatch(/valid date/i);
  });

  it("returns invalid when age is below 18 (default state)", () => {
    // 17 years old: born 2008-06-01, today 2026-05-31
    const result = validateGuardianAge("2008-06-01");
    expect(result.valid).toBe(false);
    expect((result as any).reason).toMatch(/18/);
  });

  it("returns valid when age is exactly 18 (default state)", () => {
    // Born 2008-05-31, today 2026-05-31 → exactly 18
    const result = validateGuardianAge("2008-05-31");
    expect(result.valid).toBe(true);
  });

  it("returns valid when age is above 18 (default state)", () => {
    const result = validateGuardianAge("1990-01-01");
    expect(result.valid).toBe(true);
  });

  it("returns invalid when age is 18 in Alabama (requires 19)", () => {
    // Exactly 18: born 2008-05-31
    const result = validateGuardianAge("2008-05-31", "AL");
    expect(result.valid).toBe(false);
    expect((result as any).reason).toMatch(/19/);
    expect((result as any).reason).toMatch(/AL/);
  });

  it("returns valid when age is exactly 19 in Alabama", () => {
    // Born 2007-05-31, today 2026-05-31 → exactly 19
    const result = validateGuardianAge("2007-05-31", "AL");
    expect(result.valid).toBe(true);
  });

  it("returns invalid when age is 20 in Mississippi (requires 21)", () => {
    // Born 2006-05-31 → exactly 20
    const result = validateGuardianAge("2006-05-31", "MS");
    expect(result.valid).toBe(false);
    expect((result as any).reason).toMatch(/21/);
    expect((result as any).reason).toMatch(/MS/);
  });

  it("returns valid when age is exactly 21 in Mississippi", () => {
    // Born 2005-05-31 → exactly 21
    const result = validateGuardianAge("2005-05-31", "MS");
    expect(result.valid).toBe(true);
  });

  it("returns valid when no state is provided and age >= 18", () => {
    const result = validateGuardianAge("1985-03-10");
    expect(result.valid).toBe(true);
  });
});

// ─── validateStudentAge ───────────────────────────────────────────────────────

describe("validateStudentAge", () => {
  beforeEach(() => freezeDate("2026-05-31"));

  it("returns invalid when DOB is missing", () => {
    const result = validateStudentAge(null);
    expect(result.valid).toBe(false);
    expect((result as any).reason).toMatch(/required/i);
  });

  it("returns invalid when DOB is empty string", () => {
    const result = validateStudentAge("");
    expect(result.valid).toBe(false);
  });

  it("returns invalid when DOB is not a valid date", () => {
    const result = validateStudentAge("not-a-date");
    expect(result.valid).toBe(false);
    expect((result as any).reason).toMatch(/valid date/i);
  });

  it("returns invalid when student is younger than minimum age", () => {
    // Age 2: born 2024-05-31
    const result = validateStudentAge("2024-05-31");
    expect(result.valid).toBe(false);
    expect((result as any).reason).toMatch(new RegExp(String(STUDENT_MIN_AGE)));
  });

  it("returns valid when student is exactly the minimum age", () => {
    // Age 3: born 2023-05-31
    const result = validateStudentAge("2023-05-31");
    expect(result.valid).toBe(true);
  });

  it("returns valid for a typical school-age student (age 14)", () => {
    // Born 2012-01-01 → 14 years old
    const result = validateStudentAge("2012-01-01");
    expect(result.valid).toBe(true);
  });

  it("returns valid when student is exactly the maximum age", () => {
    // Age 21: born 2005-05-31
    const result = validateStudentAge("2005-05-31");
    expect(result.valid).toBe(true);
  });

  it("returns invalid when student is older than maximum age", () => {
    // Age 22: born 2004-05-31
    const result = validateStudentAge("2004-05-31");
    expect(result.valid).toBe(false);
    expect((result as any).reason).toMatch(new RegExp(String(STUDENT_MAX_AGE)));
  });
});
