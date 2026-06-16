import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Keyboard, Clock, Star, Trash2 } from "lucide-react";

const MATH_SYMBOLS = [
  { symbol: "×", label: "Multiply", key: "×" },
  { symbol: "÷", label: "Divide", key: "÷" },
  { symbol: "²", label: "Squared", key: "²" },
  { symbol: "³", label: "Cubed", key: "³" },
  { symbol: "√", label: "Square root", key: "√" },
  { symbol: "π", label: "Pi", key: "π" },
  { symbol: "≤", label: "Less than or equal", key: "≤" },
  { symbol: "≥", label: "Greater than or equal", key: "≥" },
  { symbol: "≠", label: "Not equal", key: "≠" },
  { symbol: "±", label: "Plus or minus", key: "±" },
  { symbol: "∞", label: "Infinity", key: "∞" },
  { symbol: "°", label: "Degree", key: "°" },
] as const;

const RECENT_STORAGE_KEY = "educhamp_math_recent_symbols";
const PINNED_STORAGE_KEY = "educhamp_math_pinned_symbols";
const MAX_RECENT = 4;
const MAX_PINNED = 6;

// ─── localStorage helpers ─────────────────────────────────────────────────────

/** Get recently used symbols from localStorage */
export function getRecentSymbols(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string").slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/** Record a symbol usage in localStorage */
export function recordSymbolUsage(symbol: string): string[] {
  const recent = getRecentSymbols().filter((s) => s !== symbol);
  const updated = [symbol, ...recent].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
  } catch { /* quota exceeded — ignore */ }
  return updated;
}

/** Clear all recently used symbols */
export function clearRecentSymbols(): void {
  try {
    localStorage.removeItem(RECENT_STORAGE_KEY);
  } catch { /* ignore */ }
}

/** Get pinned favorite symbols from localStorage */
export function getPinnedSymbols(): string[] {
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string").slice(0, MAX_PINNED);
  } catch {
    return [];
  }
}

/** Toggle a symbol's pinned state */
export function togglePinnedSymbol(symbol: string): string[] {
  const pinned = getPinnedSymbols();
  let updated: string[];
  if (pinned.includes(symbol)) {
    updated = pinned.filter((s) => s !== symbol);
  } else {
    updated = [...pinned, symbol].slice(0, MAX_PINNED);
  }
  try {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(updated));
  } catch { /* quota exceeded — ignore */ }
  return updated;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MathKeyboardProps {
  onInsert: (symbol: string) => void;
  className?: string;
}

export function MathKeyboard({ onInsert, className = "" }: MathKeyboardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentSymbols, setRecentSymbols] = useState<string[]>([]);
  const [pinnedSymbols, setPinnedSymbols] = useState<string[]>([]);

  useEffect(() => {
    setRecentSymbols(getRecentSymbols());
    setPinnedSymbols(getPinnedSymbols());
  }, []);

  const handleInsert = useCallback((symbol: string) => {
    const updated = recordSymbolUsage(symbol);
    setRecentSymbols(updated);
    onInsert(symbol);
  }, [onInsert]);

  const handleClearRecent = useCallback(() => {
    clearRecentSymbols();
    setRecentSymbols([]);
  }, []);

  const handleTogglePin = useCallback((symbol: string) => {
    const updated = togglePinnedSymbol(symbol);
    setPinnedSymbols(updated);
  }, []);

  const hasQuickAccess = pinnedSymbols.length > 0 || recentSymbols.length > 0;

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-1 flex-wrap">
        {/* Pinned favorites (always visible when available) */}
        {pinnedSymbols.length > 0 && (
          <div className="flex items-center gap-0.5">
            <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
            {pinnedSymbols.map((sym) => (
              <Button
                key={`pinned-${sym}`}
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 math-symbol text-base hover:text-foreground hover:bg-accent transition-all duration-100 active:scale-95"
                onClick={() => handleInsert(sym)}
                title={`Insert ${MATH_SYMBOLS.find((s) => s.key === sym)?.label ?? sym} (pinned)`}
                aria-label={`Insert pinned symbol ${sym}`}
              >
                {sym}
              </Button>
            ))}
            {recentSymbols.length > 0 && <div className="w-px h-4 bg-border mx-0.5" />}
          </div>
        )}

        {/* Recently used symbols */}
        {recentSymbols.length > 0 && (
          <div className="flex items-center gap-0.5">
            <Clock className="h-3 w-3 text-muted-foreground/60 shrink-0" />
            {recentSymbols.map((sym) => (
              <Button
                key={`recent-${sym}`}
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 math-symbol text-base text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-100 active:scale-95"
                onClick={() => handleInsert(sym)}
                title={`Insert ${MATH_SYMBOLS.find((s) => s.key === sym)?.label ?? sym}`}
                aria-label={`Insert recently used ${sym}`}
              >
                {sym}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-destructive transition-all duration-100"
              onClick={handleClearRecent}
              title="Clear recent symbols"
              aria-label="Clear recently used symbols"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
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
          className="absolute bottom-full left-0 mb-1.5 z-50 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-2.5 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 w-[280px] sm:w-auto"
          style={{ animationDuration: "150ms" }}
        >
          {/* Symbol grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
            {MATH_SYMBOLS.map(({ symbol, label, key }) => {
              const isPinned = pinnedSymbols.includes(key);
              return (
                <div key={key} className="relative group">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0 math-symbol text-xl hover:bg-accent hover:text-accent-foreground transition-all duration-100 active:scale-95"
                    onClick={() => handleInsert(key)}
                    title={label}
                    aria-label={`Insert ${label}`}
                  >
                    {symbol}
                  </Button>
                  {/* Pin toggle (visible on hover / always on mobile) */}
                  <button
                    type="button"
                    className={`absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center transition-all duration-100
                      ${isPinned
                        ? "bg-amber-100 text-amber-600 opacity-100"
                        : "bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 sm:opacity-0 max-sm:opacity-60"
                      }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePin(key);
                    }}
                    title={isPinned ? `Unpin ${label}` : `Pin ${label} to favorites`}
                    aria-label={isPinned ? `Unpin ${label}` : `Pin ${label} to favorites`}
                  >
                    <Star className={`h-2.5 w-2.5 ${isPinned ? "fill-amber-500" : ""}`} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground">
              Tap to insert • <Star className="h-2.5 w-2.5 inline -mt-0.5" /> to pin favorites
            </p>
            {hasQuickAccess && (
              <button
                type="button"
                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                onClick={handleClearRecent}
              >
                Clear recent
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
