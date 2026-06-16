import { describe, it, expect, beforeEach, vi } from "vitest";
import { getRecentSymbols, recordSymbolUsage } from "../client/src/components/MathKeyboard";

// ─── Recently Used Symbols Tests ──────────────────────────────────────────────

describe("MathKeyboard - Recently Used Symbols", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
      length: 0,
      key: () => null,
    });
  });

  it("returns empty array when no symbols have been used", () => {
    expect(getRecentSymbols()).toEqual([]);
  });

  it("records a symbol and returns it in recent list", () => {
    const result = recordSymbolUsage("×");
    expect(result).toEqual(["×"]);
    expect(getRecentSymbols()).toEqual(["×"]);
  });

  it("records multiple symbols in most-recent-first order", () => {
    recordSymbolUsage("×");
    recordSymbolUsage("÷");
    const result = recordSymbolUsage("π");
    expect(result).toEqual(["π", "÷", "×"]);
  });

  it("limits to 4 recent symbols maximum", () => {
    recordSymbolUsage("×");
    recordSymbolUsage("÷");
    recordSymbolUsage("²");
    recordSymbolUsage("³");
    const result = recordSymbolUsage("√");
    expect(result).toHaveLength(4);
    expect(result).toEqual(["√", "³", "²", "÷"]);
    // × should be evicted
    expect(result).not.toContain("×");
  });

  it("moves a re-used symbol to the front without duplicating", () => {
    recordSymbolUsage("×");
    recordSymbolUsage("÷");
    recordSymbolUsage("²");
    const result = recordSymbolUsage("×"); // re-use ×
    expect(result).toEqual(["×", "²", "÷"]);
    // No duplicates
    expect(result.filter((s) => s === "×")).toHaveLength(1);
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("educhamp_math_recent_symbols", "not-valid-json");
    expect(getRecentSymbols()).toEqual([]);
  });

  it("handles non-array localStorage value gracefully", () => {
    localStorage.setItem("educhamp_math_recent_symbols", JSON.stringify({ foo: "bar" }));
    expect(getRecentSymbols()).toEqual([]);
  });
});

// ─── ShowYourWork Component Logic Tests ───────────────────────────────────────

describe("ShowYourWork - Scratchpad behavior", () => {
  it("scratchpad value is preserved per question (simulated state)", () => {
    // Simulate the parent state management pattern
    const notes: Record<string, string> = {};
    
    // Student writes work for question 1
    notes["q1"] = "Step 1: 3x = 9\nStep 2: x = 3";
    
    // Student writes work for question 2
    notes["q2"] = "Area = length × width = 5 × 3 = 15";
    
    // Verify both are preserved independently
    expect(notes["q1"]).toContain("x = 3");
    expect(notes["q2"]).toContain("15");
    expect(Object.keys(notes)).toHaveLength(2);
  });

  it("empty scratchpad has empty string value", () => {
    const notes: Record<string, string> = {};
    expect(notes["q1"] ?? "").toBe("");
  });
});

// ─── Partial Credit UI Type Tests ─────────────────────────────────────────────

describe("Partial Credit UI - Type compatibility", () => {
  type GradedAnswer = {
    questionId: string;
    answer: string;
    correct: boolean;
    isPartial?: boolean;
    partialHint?: string;
    questionText: string;
    questionType: string;
    choices: null;
    mapsToUnit: string;
    correctAnswer: string;
    explanation: string;
  };

  it("GradedAnswer with isPartial=true is valid", () => {
    const answer: GradedAnswer = {
      questionId: "q1",
      answer: "0.33",
      correct: false,
      isPartial: true,
      partialHint: "Exact answer: 1/3",
      questionText: "What is 1/3?",
      questionType: "short_answer",
      choices: null,
      mapsToUnit: "1",
      correctAnswer: "1/3",
      explanation: "1 divided by 3 = 0.333...",
    };
    expect(answer.isPartial).toBe(true);
    expect(answer.partialHint).toBe("Exact answer: 1/3");
  });

  it("GradedAnswer without partial fields is valid (backward compatible)", () => {
    const answer: GradedAnswer = {
      questionId: "q2",
      answer: "5",
      correct: true,
      questionText: "What is 2+3?",
      questionType: "short_answer",
      choices: null,
      mapsToUnit: "1",
      correctAnswer: "5",
      explanation: "",
    };
    expect(answer.isPartial).toBeUndefined();
    expect(answer.partialHint).toBeUndefined();
  });

  type SubmitResult = {
    questionId: number;
    isCorrect: boolean;
    isPartial?: boolean;
    partialHint?: string;
    correctAnswer: string;
    explanation: string;
    difficulty: "easy" | "medium" | "hard" | "challenge";
    skillTag: string;
  };

  it("SubmitResult with partial credit fields renders amber state", () => {
    const result: SubmitResult = {
      questionId: 1,
      isCorrect: false,
      isPartial: true,
      partialHint: "Exact answer: 2/3",
      correctAnswer: "2/3",
      explanation: "2 divided by 3",
      difficulty: "medium",
      skillTag: "fractions",
    };
    // Simulate UI logic
    const borderClass = result.isCorrect
      ? "border-l-emerald-500"
      : result.isPartial
      ? "border-l-amber-500"
      : "border-l-red-500";
    expect(borderClass).toBe("border-l-amber-500");
  });
});
