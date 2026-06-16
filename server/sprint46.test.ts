import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getRecentSymbols,
  recordSymbolUsage,
  clearRecentSymbols,
  getPinnedSymbols,
  togglePinnedSymbol,
  savePinnedOrder,
  hasSeenOnboarding,
  markOnboardingSeen,
} from "../client/src/components/MathKeyboard";

// ─── Setup ────────────────────────────────────────────────────────────────────

function createMockLocalStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    length: 0,
    key: () => null,
  };
}

describe("MathKeyboard — Onboarding", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMockLocalStorage());
  });

  it("hasSeenOnboarding returns false when never shown", () => {
    expect(hasSeenOnboarding()).toBe(false);
  });

  it("markOnboardingSeen sets the flag", () => {
    markOnboardingSeen();
    expect(hasSeenOnboarding()).toBe(true);
  });

  it("hasSeenOnboarding returns true after marking", () => {
    expect(hasSeenOnboarding()).toBe(false);
    markOnboardingSeen();
    expect(hasSeenOnboarding()).toBe(true);
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("educhamp_math_keyboard_onboarded", "invalid");
    // Only "true" string counts as seen
    expect(hasSeenOnboarding()).toBe(false);
  });
});

describe("MathKeyboard — Drag-and-Drop Reorder (savePinnedOrder)", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMockLocalStorage());
  });

  it("savePinnedOrder persists a new order", () => {
    togglePinnedSymbol("×");
    togglePinnedSymbol("÷");
    togglePinnedSymbol("π");
    expect(getPinnedSymbols()).toEqual(["×", "÷", "π"]);

    // Simulate drag: move π to front
    savePinnedOrder(["π", "×", "÷"]);
    expect(getPinnedSymbols()).toEqual(["π", "×", "÷"]);
  });

  it("savePinnedOrder respects MAX_PINNED limit", () => {
    const tooMany = ["×", "÷", "²", "³", "√", "π", "≤", "≥"];
    savePinnedOrder(tooMany);
    expect(getPinnedSymbols()).toHaveLength(6);
    expect(getPinnedSymbols()).toEqual(["×", "÷", "²", "³", "√", "π"]);
  });

  it("savePinnedOrder with empty array clears pinned", () => {
    togglePinnedSymbol("×");
    togglePinnedSymbol("÷");
    savePinnedOrder([]);
    expect(getPinnedSymbols()).toEqual([]);
  });

  it("reorder preserves all symbols without duplication", () => {
    togglePinnedSymbol("×");
    togglePinnedSymbol("÷");
    togglePinnedSymbol("π");
    togglePinnedSymbol("√");

    // Reverse order
    savePinnedOrder(["√", "π", "÷", "×"]);
    const result = getPinnedSymbols();
    expect(result).toEqual(["√", "π", "÷", "×"]);
    expect(new Set(result).size).toBe(result.length); // no duplicates
  });
});

describe("MathKeyboard — Fraction Builder Logic", () => {
  it("fraction format produces correct string", () => {
    // The fraction builder inserts `numerator/denominator`
    const buildFraction = (num: string, den: string) => `${num.trim()}/${den.trim()}`;

    expect(buildFraction("3", "4")).toBe("3/4");
    expect(buildFraction("12", "5")).toBe("12/5");
    expect(buildFraction("-1", "2")).toBe("-1/2");
    expect(buildFraction("  7 ", " 8  ")).toBe("7/8");
  });

  it("fraction builder requires both numerator and denominator", () => {
    const canInsert = (num: string, den: string) => num.trim() !== "" && den.trim() !== "";

    expect(canInsert("3", "4")).toBe(true);
    expect(canInsert("", "4")).toBe(false);
    expect(canInsert("3", "")).toBe(false);
    expect(canInsert("", "")).toBe(false);
    expect(canInsert("  ", "  ")).toBe(false);
  });
});

describe("MathKeyboard — Integration: pinned + recent remain independent", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMockLocalStorage());
  });

  it("clearing recent does not affect pinned or their order", () => {
    togglePinnedSymbol("π");
    togglePinnedSymbol("√");
    savePinnedOrder(["√", "π"]);
    recordSymbolUsage("×");
    recordSymbolUsage("÷");

    clearRecentSymbols();
    expect(getRecentSymbols()).toEqual([]);
    expect(getPinnedSymbols()).toEqual(["√", "π"]);
  });

  it("reordering pinned does not affect recent", () => {
    recordSymbolUsage("×");
    recordSymbolUsage("÷");
    togglePinnedSymbol("π");
    togglePinnedSymbol("√");
    savePinnedOrder(["√", "π"]);

    expect(getRecentSymbols()).toEqual(["÷", "×"]);
  });
});
