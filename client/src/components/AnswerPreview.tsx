/**
 * AnswerPreview — Live-rendered preview of typed math expressions.
 * Shows formatted fractions, exponents, and special symbols as the student types.
 */

interface AnswerPreviewProps {
  value: string;
  className?: string;
}

// Superscript digit map
const SUPERSCRIPT_MAP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
};

// Subscript digit map
const SUBSCRIPT_MAP: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
};

function toSuperscript(s: string): string {
  return s
    .split("")
    .map((c) => SUPERSCRIPT_MAP[c] || c)
    .join("");
}

function toSubscript(s: string): string {
  return s
    .split("")
    .map((c) => SUBSCRIPT_MAP[c] || c)
    .join("");
}

/**
 * Format a raw answer string into a visually rich math preview.
 * Handles:
 * - Fractions: a/b → ᵃ⁄ᵦ (using fraction slash U+2044)
 * - Exponents: x^2 → x²
 * - Square root: sqrt(x) or √x
 * - Mixed numbers: 1 2/3 → 1²⁄₃
 */
export function formatMathPreview(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let result = trimmed;

  // Handle exponents: x^2, x^-3, x^12
  result = result.replace(/\^(-?\d+)/g, (_, exp) => toSuperscript(exp));

  // Handle fractions: a/b where a and b are numbers (possibly negative)
  // Match patterns like "12/4", "-3/7", "1 2/3" (mixed number)
  result = result.replace(
    /(-?\d+)\s*\/\s*(-?\d+)/g,
    (_, num, denom) => `${toSuperscript(num)}⁄${toSubscript(denom)}`
  );

  // Handle sqrt notation: sqrt(x) → √x, sqrt(25) → √25
  result = result.replace(/sqrt\(([^)]+)\)/gi, (_, inner) => `√${inner}`);

  // If nothing changed and no special symbols present, don't show preview
  if (result === trimmed && !/[×÷²³√π≤≥≰≱≠±⁄]/.test(trimmed)) {
    return null;
  }

  return result;
}

export function AnswerPreview({ value, className = "" }: AnswerPreviewProps) {
  const preview = formatMathPreview(value);

  if (!preview) return null;

  return (
    <div
      className={`text-sm text-muted-foreground mt-1 flex items-center gap-1.5 ${className}`}
      aria-live="polite"
      aria-label="Answer preview"
    >
      <span className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground/70">
        Preview:
      </span>
      <span className="font-mono text-foreground/80 text-base">{preview}</span>
    </div>
  );
}
