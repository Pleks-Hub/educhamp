import { describe, it, expect } from "vitest";
import { normaliseAnswer, answersMatch } from "../shared/answerUtils";

describe("Sprint 42b — Division sign support in answer matching", () => {
  describe("normaliseAnswer", () => {
    it("trims and lowercases", () => {
      expect(normaliseAnswer("  Hello  ")).toBe("hello");
    });

    it("collapses whitespace", () => {
      expect(normaliseAnswer("x = 3")).toBe("x=3");
    });

    it("normalises ÷ to /", () => {
      expect(normaliseAnswer("12÷4")).toBe("12/4");
    });

    it("normalises × to *", () => {
      expect(normaliseAnswer("3×4")).toBe("3*4");
    });

    it("handles combined symbols", () => {
      expect(normaliseAnswer("12 ÷ 4 × 2")).toBe("12/4*2");
    });
  });

  describe("answersMatch — division equivalence", () => {
    it("/ matches ÷ directly", () => {
      expect(answersMatch("12/4", "12÷4")).toBe(true);
    });

    it("÷ matches / directly", () => {
      expect(answersMatch("12÷4", "12/4")).toBe(true);
    });

    it("12/4 matches 3 via fraction evaluation", () => {
      expect(answersMatch("12/4", "3")).toBe(true);
    });

    it("3 matches 12/4 via reverse fraction evaluation", () => {
      expect(answersMatch("3", "12/4")).toBe(true);
    });

    it("12÷4 matches 3 via normalisation + fraction evaluation", () => {
      expect(answersMatch("12÷4", "3")).toBe(true);
    });

    it("6/2 matches 3", () => {
      expect(answersMatch("6/2", "3")).toBe(true);
    });

    it("10/5 matches 2", () => {
      expect(answersMatch("10/5", "2")).toBe(true);
    });

    it("1/2 matches 0.5", () => {
      expect(answersMatch("1/2", "0.5")).toBe(true);
    });

    it("3/4 matches 0.75", () => {
      expect(answersMatch("3/4", "0.75")).toBe(true);
    });

    it("equivalent fractions match: 6/2 vs 12/4", () => {
      expect(answersMatch("6/2", "12/4")).toBe(true);
    });

    it("does not match incorrect division: 12/4 vs 4", () => {
      expect(answersMatch("12/4", "4")).toBe(false);
    });

    it("handles division by zero gracefully", () => {
      expect(answersMatch("5/0", "0")).toBe(false);
    });
  });

  describe("answersMatch — existing features still work", () => {
    it("direct match", () => {
      expect(answersMatch("42", "42")).toBe(true);
    });

    it("case insensitive", () => {
      expect(answersMatch("X", "x")).toBe(true);
    });

    it("strips trailing .0", () => {
      expect(answersMatch("3.0", "3")).toBe(true);
    });

    it("comma-separated in any order", () => {
      expect(answersMatch("2,3", "3,2")).toBe(true);
    });

    it("variable prefix: x=3 matches 3", () => {
      expect(answersMatch("x=3", "3")).toBe(true);
    });

    it("does not match wrong answers", () => {
      expect(answersMatch("5", "3")).toBe(false);
    });

    it("negative fractions: -6/2 matches -3", () => {
      expect(answersMatch("-6/2", "-3")).toBe(true);
    });
  });
});
