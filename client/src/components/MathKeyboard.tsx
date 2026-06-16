import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Keyboard, Clock, Star, Trash2, X } from "lucide-react";

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
const ONBOARDING_KEY = "educhamp_math_keyboard_onboarded";
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

/** Save reordered pinned symbols */
export function savePinnedOrder(symbols: string[]): void {
  try {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(symbols.slice(0, MAX_PINNED)));
  } catch { /* ignore */ }
}

/** Check if onboarding has been shown */
export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  } catch {
    return false;
  }
}

/** Mark onboarding as seen */
export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, "true");
  } catch { /* ignore */ }
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFractionBuilder, setShowFractionBuilder] = useState(false);
  const [fractionNumerator, setFractionNumerator] = useState("");
  const [fractionDenominator, setFractionDenominator] = useState("");

  // Drag-and-drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLButtonElement | null>(null);

  // Onboarding auto-dismiss timer
  const onboardingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRecentSymbols(getRecentSymbols());
    setPinnedSymbols(getPinnedSymbols());
  }, []);

  // Show onboarding when keyboard opens for the first time
  useEffect(() => {
    if (isOpen && !hasSeenOnboarding()) {
      setShowOnboarding(true);
      onboardingTimerRef.current = setTimeout(() => {
        setShowOnboarding(false);
        markOnboardingSeen();
      }, 6000);
    }
    return () => {
      if (onboardingTimerRef.current) {
        clearTimeout(onboardingTimerRef.current);
      }
    };
  }, [isOpen]);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    markOnboardingSeen();
    if (onboardingTimerRef.current) {
      clearTimeout(onboardingTimerRef.current);
    }
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

  // ─── Drag-and-drop handlers ────────────────────────────────────────────────
  const handleDragStart = useCallback((index: number, e: React.DragEvent<HTMLButtonElement>) => {
    setDragIndex(index);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = "move";
    // Make the drag image slightly transparent
    if (e.currentTarget) {
      e.currentTarget.style.opacity = "0.4";
    }
  }, []);

  const handleDragOver = useCallback((index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = "1";
    }
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newPinned = [...pinnedSymbols];
      const [moved] = newPinned.splice(dragIndex, 1);
      newPinned.splice(dragOverIndex, 0, moved);
      setPinnedSymbols(newPinned);
      savePinnedOrder(newPinned);
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  }, [dragIndex, dragOverIndex, pinnedSymbols]);

  // ─── Touch-based reorder (mobile) ──────────────────────────────────────────
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);

  const handleTouchHold = useCallback((index: number) => {
    // On long press, swap with previous position (simple mobile reorder)
    if (index > 0) {
      const newPinned = [...pinnedSymbols];
      [newPinned[index - 1], newPinned[index]] = [newPinned[index], newPinned[index - 1]];
      setPinnedSymbols(newPinned);
      savePinnedOrder(newPinned);
    }
    setTouchDragIndex(null);
  }, [pinnedSymbols]);

  // ─── Fraction builder ──────────────────────────────────────────────────────
  const handleInsertFraction = useCallback(() => {
    const num = fractionNumerator.trim();
    const den = fractionDenominator.trim();
    if (num && den) {
      onInsert(`${num}/${den}`);
      setFractionNumerator("");
      setFractionDenominator("");
      setShowFractionBuilder(false);
    }
  }, [fractionNumerator, fractionDenominator, onInsert]);

  const hasQuickAccess = pinnedSymbols.length > 0 || recentSymbols.length > 0;

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-1 flex-wrap">
        {/* Pinned favorites (always visible, draggable) */}
        {pinnedSymbols.length > 0 && (
          <div className="flex items-center gap-0.5">
            <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
            {pinnedSymbols.map((sym, idx) => (
              <Button
                key={`pinned-${sym}`}
                type="button"
                variant="ghost"
                size="sm"
                draggable
                onDragStart={(e) => handleDragStart(idx, e)}
                onDragOver={(e) => handleDragOver(idx, e)}
                onDragEnd={handleDragEnd}
                onTouchStart={() => setTouchDragIndex(idx)}
                onTouchEnd={() => {
                  if (touchDragIndex === idx) handleTouchHold(idx);
                }}
                className={`h-7 w-7 p-0 math-symbol text-base hover:text-foreground hover:bg-accent transition-all duration-100 active:scale-95 cursor-grab active:cursor-grabbing
                  ${dragOverIndex === idx && dragIndex !== idx ? "ring-2 ring-primary/50 scale-110" : ""}
                  ${dragIndex === idx ? "opacity-40" : ""}`}
                onClick={() => handleInsert(sym)}
                title={`Insert ${MATH_SYMBOLS.find((s) => s.key === sym)?.label ?? sym} (pinned) • Drag to reorder`}
                aria-label={`Insert pinned symbol ${sym}. Drag to reorder.`}
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

        {/* Fraction builder toggle */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowFractionBuilder(!showFractionBuilder)}
          className={`gap-1 text-xs h-7 px-2 border-dashed ${showFractionBuilder ? "bg-primary/10 border-primary/30" : ""}`}
          aria-label="Toggle fraction builder"
          title="Build a fraction"
        >
          <span className="math-symbol text-sm leading-none">⅟</span>
          <span className="hidden sm:inline">Fraction</span>
        </Button>
      </div>

      {/* Full keyboard popup */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-1.5 z-50 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-2.5 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 w-[280px] sm:w-auto"
          style={{ animationDuration: "150ms" }}
        >
          {/* Onboarding tooltip */}
          {showOnboarding && (
            <div className="mb-2 p-2 bg-primary/10 border border-primary/20 rounded-md relative animate-in fade-in-0 slide-in-from-top-1" style={{ animationDuration: "200ms" }}>
              <button
                type="button"
                onClick={dismissOnboarding}
                className="absolute top-1 right-1 h-4 w-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss tip"
              >
                <X className="h-3 w-3" />
              </button>
              <p className="text-xs text-foreground/80 pr-4">
                <Star className="h-3 w-3 inline text-amber-500 fill-amber-500 -mt-0.5 mr-0.5" />
                <strong>Tip:</strong> Click the <Star className="h-2.5 w-2.5 inline -mt-0.5 mx-0.5" /> on any symbol to pin it as a favorite for quick access!
              </p>
            </div>
          )}

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
              Tap to insert • <Star className="h-2.5 w-2.5 inline -mt-0.5" /> to pin • Drag pinned to reorder
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

      {/* Fraction builder popup */}
      {showFractionBuilder && (
        <div
          className="absolute bottom-full left-0 mb-1.5 z-50 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-3 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 w-[220px]"
          style={{ animationDuration: "150ms" }}
        >
          <p className="text-xs font-medium text-muted-foreground mb-2">Build a fraction</p>
          <div className="flex flex-col items-center gap-0">
            {/* Numerator */}
            <input
              type="text"
              inputMode="numeric"
              value={fractionNumerator}
              onChange={(e) => setFractionNumerator(e.target.value)}
              placeholder="numerator"
              className="w-full text-center text-sm font-medium bg-transparent border-0 border-b-0 outline-none focus:ring-0 placeholder:text-muted-foreground/50 py-1"
              aria-label="Fraction numerator"
              autoFocus
            />
            {/* Fraction bar */}
            <div className="w-full h-[2px] bg-foreground/70 rounded-full my-0.5" />
            {/* Denominator */}
            <input
              type="text"
              inputMode="numeric"
              value={fractionDenominator}
              onChange={(e) => setFractionDenominator(e.target.value)}
              placeholder="denominator"
              className="w-full text-center text-sm font-medium bg-transparent border-0 outline-none focus:ring-0 placeholder:text-muted-foreground/50 py-1"
              aria-label="Fraction denominator"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleInsertFraction();
              }}
            />
          </div>
          {/* Preview */}
          {fractionNumerator && fractionDenominator && (
            <p className="text-center text-xs text-muted-foreground mt-1.5">
              Inserts: <span className="math-symbol font-medium text-foreground">{fractionNumerator}/{fractionDenominator}</span>
            </p>
          )}
          {/* Actions */}
          <div className="flex gap-1.5 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => {
                setShowFractionBuilder(false);
                setFractionNumerator("");
                setFractionDenominator("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={handleInsertFraction}
              disabled={!fractionNumerator.trim() || !fractionDenominator.trim()}
            >
              Insert
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
