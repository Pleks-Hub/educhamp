import { describe, it, expect } from "vitest";
import { partialCreditCheck, answersMatch, normaliseAnswer } from "../shared/answerUtils";
import { formatMathPreview } from "../client/src/components/AnswerPreview";

// ─── Partial Credit Tests ─────────────────────────────────────────────────────

describe("partialCreditCheck", () => {
  it("returns no partial credit when answer is exactly correct", () => {
    const result = partialCreditCheck("3", "3");
    expect(result.isPartial).toBe(false);
    expect(result.score).toBe(0);
  });

  it("returns no partial credit when answer is equivalent fraction (full match)", () => {
    const result = partialCreditCheck("6/2", "3");
    expect(result.isPartial).toBe(false);
    expect(result.score).toBe(0);
  });

  it("awards 50% partial credit for 0.33 when correct is 1/3", () => {
    const result = partialCreditCheck("0.33", "1/3");
    expect(result.isPartial).toBe(true);
    expect(result.score).toBe(0.5);
    expect(result.hint).toBe("Exact answer: 1/3");
  });

  it("awards 50% partial credit for 0.67 when correct is 2/3", () => {
    const result = partialCreditCheck("0.67", "2/3");
    expect(result.isPartial).toBe(true);
    expect(result.score).toBe(0.5);
    expect(result.hint).toBe("Exact answer: 2/3");
  });

  it("does NOT award partial credit for 0.5 when correct is 1/3 (too far)", () => {
    const result = partialCreditCheck("0.5", "1/3");
    expect(result.isPartial).toBe(false);
    expect(result.score).toBe(0);
  });

  it("awards partial credit for 3.14 when correct is 3.1416 (within 0.01)", () => {
    const result = partialCreditCheck("3.14", "3.1416");
    expect(result.isPartial).toBe(true);
    expect(result.score).toBe(0.5);
  });

  it("does NOT award partial credit for non-numeric answers", () => {
    const result = partialCreditCheck("abc", "1/3");
    expect(result.isPartial).toBe(false);
  });

  it("does NOT award partial credit when correct answer is non-numeric", () => {
    const result = partialCreditCheck("3.14", "pi");
    expect(result.isPartial).toBe(false);
  });

  it("does NOT award partial credit for exact match via decimal (0.5 = 1/2)", () => {
    // 0.5 exactly equals 1/2, so answersMatch returns true → no partial credit
    const result = partialCreditCheck("0.5", "1/2");
    expect(result.isPartial).toBe(false);
    expect(result.score).toBe(0);
  });

  it("awards partial credit for 0.34 when correct is 1/3 (within tolerance)", () => {
    // 1/3 = 0.3333..., |0.34 - 0.3333| = 0.0067 < 0.01
    const result = partialCreditCheck("0.34", "1/3");
    expect(result.isPartial).toBe(true);
    expect(result.score).toBe(0.5);
  });

  it("does NOT award partial credit for 0.35 when correct is 1/3 (beyond tolerance)", () => {
    // 1/3 = 0.3333..., |0.35 - 0.3333| = 0.0167 > 0.01
    const result = partialCreditCheck("0.35", "1/3");
    expect(result.isPartial).toBe(false);
  });

  it("handles negative numbers correctly", () => {
    const result = partialCreditCheck("-0.33", "-1/3");
    expect(result.isPartial).toBe(true);
    expect(result.score).toBe(0.5);
  });
});

// ─── Answer Preview Formatting Tests ──────────────────────────────────────────

describe("formatMathPreview", () => {
  it("returns null for empty string", () => {
    expect(formatMathPreview("")).toBeNull();
  });

  it("returns null for plain text without math symbols", () => {
    expect(formatMathPreview("hello")).toBeNull();
  });

  it("formats simple fraction 12/4 with superscript/subscript", () => {
    const result = formatMathPreview("12/4");
    expect(result).not.toBeNull();
    expect(result).toContain("¹²");
    expect(result).toContain("₄");
    expect(result).toContain("⁄"); // fraction slash
  });

  it("formats exponents x^2 as x²", () => {
    const result = formatMathPreview("x^2");
    expect(result).not.toBeNull();
    expect(result).toContain("²");
    expect(result).not.toContain("^");
  });

  it("formats negative exponents x^-3", () => {
    const result = formatMathPreview("x^-3");
    expect(result).not.toBeNull();
    expect(result).toContain("⁻³");
  });

  it("formats sqrt(25) as √25", () => {
    const result = formatMathPreview("sqrt(25)");
    expect(result).not.toBeNull();
    expect(result).toContain("√25");
  });

  it("preserves special math symbols in preview", () => {
    const result = formatMathPreview("x ≤ 5");
    expect(result).not.toBeNull();
    expect(result).toContain("≤");
  });

  it("formats mixed number 1 2/3", () => {
    const result = formatMathPreview("1 2/3");
    expect(result).not.toBeNull();
    expect(result).toContain("²");
    expect(result).toContain("₃");
  });

  it("returns preview when × symbol is present", () => {
    const result = formatMathPreview("3 × 4");
    expect(result).not.toBeNull();
    expect(result).toContain("×");
  });
});

// ─── Integration: answersMatch still works correctly ──────────────────────────

describe("answersMatch integration (Sprint 43 regression)", () => {
  it("still matches fractions correctly: 12/4 = 3", () => {
    expect(answersMatch("12/4", "3")).toBe(true);
  });

  it("still matches division sign equivalence: 12÷4 = 12/4", () => {
    expect(answersMatch("12÷4", "12/4")).toBe(true);
  });

  it("still matches equivalent fractions: 2/4 = 1/2", () => {
    expect(answersMatch("2/4", "1/2")).toBe(true);
  });

  it("normalises × to *", () => {
    expect(normaliseAnswer("3×4")).toBe("3*4");
  });
});
