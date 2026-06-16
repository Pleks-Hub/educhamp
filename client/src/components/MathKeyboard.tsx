import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";

const MATH_SYMBOLS = [
  { symbol: "×", label: "Multiply", key: "×" },
  { symbol: "÷", label: "Divide", key: "÷" },
  { symbol: "²", label: "Squared", key: "²" },
  { symbol: "³", label: "Cubed", key: "³" },
  { symbol: "√", label: "Square root", key: "√" },
  { symbol: "π", label: "Pi", key: "π" },
  { symbol: "≤", label: "Less than or equal", key: "≤" },
  { symbol: "≥", label: "Greater than or equal", key: "≥" },
  { symbol: "≰", label: "Not less than or equal", key: "≰" },
  { symbol: "≱", label: "Not greater than or equal", key: "≱" },
  { symbol: "≠", label: "Not equal", key: "≠" },
  { symbol: "±", label: "Plus or minus", key: "±" },
] as const;

interface MathKeyboardProps {
  onInsert: (symbol: string) => void;
  className?: string;
}

export function MathKeyboard({ onInsert, className = "" }: MathKeyboardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-1.5 text-xs h-7 px-2 border-dashed"
        aria-label="Toggle math symbols keyboard"
      >
        <Keyboard className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Math Symbols</span>
        <span className="sm:hidden">∑</span>
      </Button>

      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-1.5 z-50 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-2 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2"
          style={{ animationDuration: "150ms" }}
        >
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
            {MATH_SYMBOLS.map(({ symbol, label, key }) => (
              <Button
                key={key}
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-lg font-mono hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-95"
                onClick={() => onInsert(key)}
                title={label}
                aria-label={`Insert ${label}`}
              >
                {symbol}
              </Button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Tap a symbol to insert it into your answer
          </p>
        </div>
      )}
    </div>
  );
}
