import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Keyboard, Clock } from "lucide-react";

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

const STORAGE_KEY = "educhamp_math_recent_symbols";
const MAX_RECENT = 4;

/** Get recently used symbols from localStorage */
export function getRecentSymbols(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/** Record a symbol usage in localStorage */
export function recordSymbolUsage(symbol: string): string[] {
  const recent = getRecentSymbols().filter((s) => s !== symbol);
  const updated = [symbol, ...recent].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { /* quota exceeded — ignore */ }
  return updated;
}

interface MathKeyboardProps {
  onInsert: (symbol: string) => void;
  className?: string;
}

export function MathKeyboard({ onInsert, className = "" }: MathKeyboardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentSymbols, setRecentSymbols] = useState<string[]>([]);

  useEffect(() => {
    setRecentSymbols(getRecentSymbols());
  }, []);

  const handleInsert = useCallback((symbol: string) => {
    const updated = recordSymbolUsage(symbol);
    setRecentSymbols(updated);
    onInsert(symbol);
  }, [onInsert]);

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-1">
        {/* Recently used symbols (always visible when available) */}
        {recentSymbols.length > 0 && (
          <div className="flex items-center gap-0.5 mr-0.5">
            <Clock className="h-3 w-3 text-muted-foreground/60 shrink-0" />
            {recentSymbols.map((sym) => (
              <Button
                key={`recent-${sym}`}
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-base font-mono text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-100 active:scale-95"
                onClick={() => handleInsert(sym)}
                title={`Insert ${MATH_SYMBOLS.find((s) => s.key === sym)?.label ?? sym}`}
                aria-label={`Insert recently used ${sym}`}
              >
                {sym}
              </Button>
            ))}
            <div className="w-px h-4 bg-border mx-0.5" />
          </div>
        )}

        {/* Toggle button for full keyboard */}
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
      </div>

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
                onClick={() => handleInsert(key)}
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
