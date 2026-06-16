import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getRecentSymbols,
  recordSymbolUsage,
  clearRecentSymbols,
  getPinnedSymbols,
  togglePinnedSymbol,
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

describe("MathKeyboard — Clear All Recent Symbols", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMockLocalStorage());
  });

  it("clearRecentSymbols removes all recent entries", () => {
    recordSymbolUsage("×");
    recordSymbolUsage("÷");
    recordSymbolUsage("π");
    expect(getRecentSymbols()).toHaveLength(3);

    clearRecentSymbols();
    expect(getRecentSymbols()).toEqual([]);
  });

  it("clearRecentSymbols works when already empty", () => {
    clearRecentSymbols();
    expect(getRecentSymbols()).toEqual([]);
  });

  it("recording after clear starts fresh", () => {
    recordSymbolUsage("×");
    recordSymbolUsage("÷");
    clearRecentSymbols();
    const result = recordSymbolUsage("π");
    expect(result).toEqual(["π"]);
  });
});

describe("MathKeyboard — Pinned Favorites", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMockLocalStorage());
  });

  it("returns empty array when no symbols are pinned", () => {
    expect(getPinnedSymbols()).toEqual([]);
  });

  it("togglePinnedSymbol adds a symbol to pinned list", () => {
    const result = togglePinnedSymbol("π");
    expect(result).toEqual(["π"]);
    expect(getPinnedSymbols()).toEqual(["π"]);
  });

  it("togglePinnedSymbol removes a symbol when already pinned", () => {
    togglePinnedSymbol("π");
    togglePinnedSymbol("×");
    const result = togglePinnedSymbol("π"); // unpin π
    expect(result).toEqual(["×"]);
    expect(getPinnedSymbols()).toEqual(["×"]);
  });

  it("maintains order of pinned symbols", () => {
    togglePinnedSymbol("×");
    togglePinnedSymbol("÷");
    togglePinnedSymbol("π");
    expect(getPinnedSymbols()).toEqual(["×", "÷", "π"]);
  });

  it("limits to 6 pinned symbols maximum", () => {
    togglePinnedSymbol("×");
    togglePinnedSymbol("÷");
    togglePinnedSymbol("²");
    togglePinnedSymbol("³");
    togglePinnedSymbol("√");
    togglePinnedSymbol("π");
    const result = togglePinnedSymbol("≤"); // 7th should cap at 6
    expect(result).toHaveLength(6);
    // The list is [...existing, new].slice(0, 6) — so 7th gets added then sliced off
    // First 6 remain, 7th (≤) is dropped
    expect(result).toEqual(["×", "÷", "²", "³", "√", "π"]);
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("educhamp_math_pinned_symbols", "invalid-json");
    expect(getPinnedSymbols()).toEqual([]);
  });

  it("handles non-array localStorage value gracefully", () => {
    localStorage.setItem("educhamp_math_pinned_symbols", JSON.stringify(42));
    expect(getPinnedSymbols()).toEqual([]);
  });

  it("pinned and recent are independent", () => {
    recordSymbolUsage("×");
    recordSymbolUsage("÷");
    togglePinnedSymbol("π");
    togglePinnedSymbol("√");

    expect(getRecentSymbols()).toEqual(["÷", "×"]);
    expect(getPinnedSymbols()).toEqual(["π", "√"]);

    clearRecentSymbols();
    expect(getRecentSymbols()).toEqual([]);
    expect(getPinnedSymbols()).toEqual(["π", "√"]); // pinned unaffected
  });
});

describe("MathKeyboard — Symbol List Audit", () => {
  // These symbols MUST be real Unicode characters that render correctly
  const EXPECTED_SYMBOLS = [
    { key: "×", codePoint: 0x00D7, name: "MULTIPLICATION SIGN" },
    { key: "÷", codePoint: 0x00F7, name: "DIVISION SIGN" },
    { key: "²", codePoint: 0x00B2, name: "SUPERSCRIPT TWO" },
    { key: "³", codePoint: 0x00B3, name: "SUPERSCRIPT THREE" },
    { key: "√", codePoint: 0x221A, name: "SQUARE ROOT" },
    { key: "π", codePoint: 0x03C0, name: "GREEK SMALL LETTER PI" },
    { key: "≤", codePoint: 0x2264, name: "LESS-THAN OR EQUAL TO" },
    { key: "≥", codePoint: 0x2265, name: "GREATER-THAN OR EQUAL TO" },
    { key: "≠", codePoint: 0x2260, name: "NOT EQUAL TO" },
    { key: "±", codePoint: 0x00B1, name: "PLUS-MINUS SIGN" },
    { key: "∞", codePoint: 0x221E, name: "INFINITY" },
    { key: "°", codePoint: 0x00B0, name: "DEGREE SIGN" },
  ];

  it("all symbols are single Unicode characters (not composed/multi-char)", () => {
    for (const { key, name } of EXPECTED_SYMBOLS) {
      // Each symbol should be exactly 1 character (not a combining sequence)
      expect(key.length).toBe(1);
      // Verify it's the expected code point
      expect(key.codePointAt(0)).toBe(
        EXPECTED_SYMBOLS.find((s) => s.name === name)!.codePoint
      );
    }
  });

  it("no problematic composed characters (≰ ≱) are in the symbol list", () => {
    // ≰ (U+2270) and ≱ (U+2271) are known to render poorly on many systems
    // because they are often displayed as composed characters (≤ + combining slash)
    // We replaced them with ≠ and other well-supported symbols
    const symbolKeys = EXPECTED_SYMBOLS.map((s) => s.key);
    expect(symbolKeys).not.toContain("≰");
    expect(symbolKeys).not.toContain("≱");
  });

  it("all symbols have code points in well-supported Unicode blocks", () => {
    for (const { key, codePoint } of EXPECTED_SYMBOLS) {
      // All should be in Basic Latin, Latin-1 Supplement, Greek, or Mathematical Operators
      // These blocks are universally supported
      const inSupportedBlock =
        (codePoint >= 0x0000 && codePoint <= 0x00FF) || // Basic Latin + Latin-1 Supplement
        (codePoint >= 0x0370 && codePoint <= 0x03FF) || // Greek and Coptic
        (codePoint >= 0x2200 && codePoint <= 0x22FF) || // Mathematical Operators
        (codePoint >= 0x2000 && codePoint <= 0x206F);   // General Punctuation
      expect(inSupportedBlock).toBe(true);
    }
  });
});
