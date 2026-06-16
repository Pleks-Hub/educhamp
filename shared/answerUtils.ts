/**
 * Shared answer matching utilities for EduChamp.
 * Used by both server (quiz/diagnostic/exam grading) and client (lesson practice checks).
 *
 * Key feature: treats "/" and "÷" as equivalent division operators.
 */

/**
 * Normalise a raw answer string for comparison:
 * - Trim and lowercase
 * - Collapse whitespace
 * - Normalise division symbols: "/" and "÷" are treated as equivalent
 * - Normalise multiplication symbols: "×" and "*" are treated as equivalent
 */
export function normaliseAnswer(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    // Normalise division: ÷ → /
    .replace(/÷/g, "/")
    // Normalise multiplication: × → *
    .replace(/×/g, "*");
}

/**
 * Compare a student's answer against the correct answer with flexible matching:
 * 1. Direct normalised comparison (handles "/" ↔ "÷" automatically)
 * 2. Strip trailing .0 (e.g., "3.0" matches "3")
 * 3. Comma-separated values in any order (e.g., "2,3" matches "3,2")
 * 4. Variable prefix (e.g., "x=3" matches "3")
 * 5. Fraction equivalence (e.g., "6/2" matches "3" via evaluation)
 */
export function answersMatch(student: string, correct: string): boolean {
  const s = normaliseAnswer(student);
  const c = normaliseAnswer(correct);

  // Direct match
  if (s === c) return true;

  // Strip trailing .0
  const stripDot0 = (v: string) => v.replace(/\.0+$/, "");
  if (stripDot0(s) === stripDot0(c)) return true;

  // Comma-separated values in any order
  const sParts = s.split(",").map((p) => p.trim()).sort();
  const cParts = c.split(",").map((p) => p.trim()).sort();
  if (sParts.join(",") === cParts.join(",")) return true;

  // Variable prefix: "x=3" matches "3"
  const numericMatch = s.replace(/^[a-z]=/i, "");
  if (numericMatch === c || stripDot0(numericMatch) === stripDot0(c)) return true;

  // Simple fraction evaluation: if student types "12/4" and correct is "3",
  // evaluate the division and compare
  const evalFraction = (expr: string): number | null => {
    const match = expr.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
    if (!match) return null;
    const denom = parseFloat(match[2]);
    if (denom === 0) return null;
    return parseFloat(match[1]) / denom;
  };

  const studentFrac = evalFraction(s);
  const correctFrac = evalFraction(c);
  const correctNum = parseFloat(c);
  const studentNum = parseFloat(s);

  // Student typed a fraction, correct is a number: "12/4" vs "3"
  if (studentFrac !== null && !isNaN(correctNum)) {
    if (Math.abs(studentFrac - correctNum) < 0.0001) return true;
  }

  // Correct is a fraction, student typed a number: "3" vs "12/4"
  if (correctFrac !== null && !isNaN(studentNum)) {
    if (Math.abs(correctFrac - studentNum) < 0.0001) return true;
  }

  // Both are fractions: "6/2" vs "12/4"
  if (studentFrac !== null && correctFrac !== null) {
    if (Math.abs(studentFrac - correctFrac) < 0.0001) return true;
  }

  return false;
}
