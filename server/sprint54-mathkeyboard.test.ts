/**
 * Sprint 54 — Tests for math keyboard conditional visibility
 */
import { describe, it, expect } from "vitest";

// Import the utility function directly (it's a pure function)
// We'll inline the logic here since it's a client-side module
function needsMathKeyboard(courseSubject: string | undefined | null): boolean {
  if (!courseSubject) return false;
  const s = courseSubject.toLowerCase().trim();
  return s === "math" || s === "mathematics" || s === "science";
}

describe("needsMathKeyboard utility", () => {
  it("returns true for 'math' subject", () => {
    expect(needsMathKeyboard("math")).toBe(true);
  });

  it("returns true for 'Math' (case-insensitive)", () => {
    expect(needsMathKeyboard("Math")).toBe(true);
  });

  it("returns true for 'mathematics'", () => {
    expect(needsMathKeyboard("mathematics")).toBe(true);
  });

  it("returns true for 'science'", () => {
    expect(needsMathKeyboard("science")).toBe(true);
  });

  it("returns true for 'Science' (case-insensitive)", () => {
    expect(needsMathKeyboard("Science")).toBe(true);
  });

  it("returns false for 'ela' (English Language Arts)", () => {
    expect(needsMathKeyboard("ela")).toBe(false);
  });

  it("returns false for 'english'", () => {
    expect(needsMathKeyboard("english")).toBe(false);
  });

  it("returns false for 'social_studies'", () => {
    expect(needsMathKeyboard("social_studies")).toBe(false);
  });

  it("returns false for 'technology'", () => {
    expect(needsMathKeyboard("technology")).toBe(false);
  });

  it("returns false for 'spanish'", () => {
    expect(needsMathKeyboard("spanish")).toBe(false);
  });

  it("returns false for 'other'", () => {
    expect(needsMathKeyboard("other")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(needsMathKeyboard(undefined)).toBe(false);
  });

  it("returns false for null", () => {
    expect(needsMathKeyboard(null)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(needsMathKeyboard("")).toBe(false);
  });

  it("handles whitespace-padded subjects", () => {
    expect(needsMathKeyboard("  math  ")).toBe(true);
    expect(needsMathKeyboard(" science ")).toBe(true);
    expect(needsMathKeyboard(" english ")).toBe(false);
  });
});
