/**
 * MathAnswerInput — Reusable component that combines:
 * - Text input for answer
 * - MathKeyboard toolbar for inserting symbols
 * - AnswerPreview for live formatted display
 * - Division tip hint
 * - Optional "Show Your Work" scratchpad
 *
 * Used across Quiz, Diagnostic, ExamPrep, PracticeWeakSkills, and LessonDetail pages.
 */
import { useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MathKeyboard } from "@/components/MathKeyboard";
import { AnswerPreview } from "@/components/AnswerPreview";
import { ShowYourWork } from "@/components/ShowYourWork";

interface MathAnswerInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  className?: string;
  label?: string;
  /** Show the math keyboard toolbar and answer preview. Defaults to true. Set false for non-math courses. */
  showMathKeyboard?: boolean;
  /** Enable scratchpad. Pass scratchpad value + onChange to manage state externally. */
  scratchpad?: {
    value: string;
    onChange: (value: string) => void;
  };
}

export function MathAnswerInput({
  id,
  value,
  onChange,
  onEnter,
  placeholder = "Type your answer...",
  className = "",
  label,
  showMathKeyboard = true,
  scratchpad,
}: MathAnswerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInsertSymbol = useCallback(
    (symbol: string) => {
      const input = inputRef.current;
      if (!input) {
        // Fallback: append to end
        onChange(value + symbol);
        return;
      }

      const start = input.selectionStart ?? value.length;
      const end = input.selectionEnd ?? value.length;
      const newValue = value.slice(0, start) + symbol + value.slice(end);
      onChange(newValue);

      // Restore cursor position after the inserted symbol
      requestAnimationFrame(() => {
        const newPos = start + symbol.length;
        input.setSelectionRange(newPos, newPos);
        input.focus();
      });
    },
    [value, onChange]
  );

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm text-muted-foreground">
          {label}
        </label>
      )}
      <div className="flex items-end gap-2">
        <Input
          ref={inputRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="text-sm flex-1"
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        />
        {showMathKeyboard && <MathKeyboard onInsert={handleInsertSymbol} />}
      </div>
      {showMathKeyboard && <AnswerPreview value={value} />}
      {showMathKeyboard && (
        <p className="text-xs text-muted-foreground">
          Tip: Use{" "}
          <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">
            /
          </kbd>{" "}
          for division (e.g., 12/4 = 3)
        </p>
      )}
      {scratchpad && (
        <ShowYourWork
          questionId={id}
          value={scratchpad.value}
          onChange={scratchpad.onChange}
          className="mt-1"
        />
      )}
    </div>
  );
}
