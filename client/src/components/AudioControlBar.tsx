import { useEffect, useRef, useCallback, useState } from "react";
import { Play, Pause, Square, RotateCcw, ChevronLeft, ChevronRight, Loader2, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { TtsSpeed, TtsStatus } from "@/hooks/useTTS";

interface AudioControlBarProps {
  status: TtsStatus;
  currentLabel: string;
  currentSpeed: TtsSpeed;
  currentSentenceIndex: number;
  totalSentences: number;
  /** Current playback time in seconds */
  currentTime?: number;
  /** Total audio duration in seconds */
  duration?: number;
  /** Seek to a fraction (0-1) of the audio */
  onSeek?: (fraction: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onReplay: () => void;
  onSpeedCycle: () => void;
  onSkipForward: () => void;
  onSkipBack: () => void;
  className?: string;
}

const SPEED_DISPLAY: Record<TtsSpeed, string> = {
  slow: "0.75x",
  normal: "1x",
  fast: "1.25x",
  faster: "1.5x",
};

/** Format seconds to mm:ss */
function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioControlBar({
  status,
  currentLabel,
  currentSpeed,
  currentSentenceIndex,
  totalSentences,
  currentTime = 0,
  duration = 0,
  onSeek,
  onPlay,
  onPause,
  onStop,
  onReplay,
  onSpeedCycle,
  onSkipForward,
  onSkipBack,
  className,
}: AudioControlBarProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragFraction, setDragFraction] = useState(0);

  // Keyboard shortcuts — only active when TTS is playing or paused
  useEffect(() => {
    if (status === "idle" || status === "loading") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (status === "playing") onPause();
          else if (status === "paused") onPlay();
          break;
        case "Escape":
          e.preventDefault();
          onStop();
          break;
        case "ArrowRight":
          e.preventDefault();
          onSkipForward();
          break;
        case "ArrowLeft":
          e.preventDefault();
          onSkipBack();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [status, onPlay, onPause, onStop, onSkipForward, onSkipBack]);

  // Calculate progress fraction for the seek bar
  const progressFraction = isDragging
    ? dragFraction
    : duration > 0
    ? Math.min(currentTime / duration, 1)
    : 0;

  // Handle seek bar click/drag
  const getFractionFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!progressBarRef.current) return 0;
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      return Math.max(0, Math.min(1, x / rect.width));
    },
    []
  );

  const handleProgressMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onSeek || duration <= 0) return;
      e.preventDefault();
      setIsDragging(true);
      const fraction = getFractionFromEvent(e);
      setDragFraction(fraction);
    },
    [onSeek, duration, getFractionFromEvent]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const fraction = getFractionFromEvent(e);
      setDragFraction(fraction);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const fraction = getFractionFromEvent(e);
      setIsDragging(false);
      onSeek?.(fraction);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, getFractionFromEvent, onSeek]);

  // Handle touch events for mobile
  const handleProgressTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!onSeek || duration <= 0 || !progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const fraction = Math.max(0, Math.min(1, x / rect.width));
      setIsDragging(true);
      setDragFraction(fraction);
    },
    [onSeek, duration]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (!progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const fraction = Math.max(0, Math.min(1, x / rect.width));
      setDragFraction(fraction);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = e.changedTouches[0].clientX - rect.left;
      const fraction = Math.max(0, Math.min(1, x / rect.width));
      setIsDragging(false);
      onSeek?.(fraction);
    };

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, onSeek]);

  if (status === "idle" && !currentLabel) return null;
  const isLoading = status === "loading";
  const hasTimeData = duration > 0;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "flex flex-col items-stretch gap-0 rounded-2xl",
        "bg-card/95 backdrop-blur-md border border-border shadow-lg",
        "animate-in slide-in-from-bottom-4 duration-200",
        "overflow-hidden w-[440px] max-w-[calc(100vw-2rem)]",
        className
      )}
      role="toolbar"
      aria-label="Audio playback controls"
    >
      {/* Seekable progress bar */}
      <div
        ref={progressBarRef}
        className={cn(
          "w-full h-2 bg-muted relative group",
          hasTimeData && onSeek ? "cursor-pointer" : "cursor-default"
        )}
        onMouseDown={handleProgressMouseDown}
        onTouchStart={handleProgressTouchStart}
        role="slider"
        aria-label="Audio progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressFraction * 100)}
      >
        {/* Filled portion */}
        <div
          className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-75 ease-linear"
          style={{ width: `${progressFraction * 100}%` }}
        />
        {/* Scrub handle — visible on hover or drag */}
        {hasTimeData && onSeek && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary",
              "shadow-sm border border-primary-foreground/20",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
              isDragging && "opacity-100 scale-110"
            )}
            style={{ left: `${progressFraction * 100}%` }}
          />
        )}
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-1.5 px-3 py-2">
        {/* Time elapsed */}
        {hasTimeData && (
          <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
            {formatTime(isDragging ? dragFraction * duration : currentTime)}
          </span>
        )}

        {/* Skip back */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          onClick={onSkipBack}
          aria-label="Previous sentence (Left arrow)"
          disabled={currentSentenceIndex <= 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Play/Pause/Loading */}
        {isLoading ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            disabled
            aria-label="Loading audio..."
          >
            <Loader2 className="h-4 w-4 animate-spin" />
          </Button>
        ) : status === "playing" ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onPause}
            aria-label="Pause (Space)"
          >
            <Pause className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onPlay}
            aria-label="Play (Space)"
          >
            <Play className="h-4 w-4" />
          </Button>
        )}

        {/* Skip forward */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          onClick={onSkipForward}
          aria-label="Next sentence (Right arrow)"
          disabled={currentSentenceIndex >= totalSentences - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Time remaining */}
        {hasTimeData && (
          <span className="text-[10px] text-muted-foreground tabular-nums w-8">
            {formatTime(duration)}
          </span>
        )}

        {/* Divider */}
        <div className="w-px h-5 bg-border" />

        {/* Stop */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          onClick={onStop}
          aria-label="Stop (Escape)"
        >
          <Square className="h-3.5 w-3.5" />
        </Button>

        {/* Replay */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          onClick={onReplay}
          aria-label="Replay"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>

        {/* Divider */}
        <div className="w-px h-5 bg-border" />

        {/* Speed badge — clickable to cycle */}
        <button
          onClick={onSpeedCycle}
          className={cn(
            "px-2 py-0.5 text-[10px] font-semibold rounded-full",
            "bg-primary/10 text-primary border border-primary/20",
            "hover:bg-primary/20 transition-all duration-150",
            "active:scale-95"
          )}
          aria-label={`Speed: ${SPEED_DISPLAY[currentSpeed]}. Click to cycle.`}
          title="Click to change speed"
        >
          {SPEED_DISPLAY[currentSpeed]}
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-border" />

        {/* Keyboard shortcut hint tooltip */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "h-6 w-6 flex items-center justify-center rounded-full",
                  "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  "transition-colors duration-150"
                )}
                aria-label="Keyboard shortcuts"
                tabIndex={0}
              >
                <Keyboard className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="center"
              className="p-3 max-w-[220px]"
            >
              <p className="text-xs font-semibold mb-1.5">Keyboard Shortcuts</p>
              <div className="space-y-1">
                <ShortcutRow keys="Space" label="Pause / Resume" />
                <ShortcutRow keys="Esc" label="Stop playback" />
                <ShortcutRow keys={"\u2190"} label="Previous sentence" />
                <ShortcutRow keys={"\u2192"} label="Next sentence" />
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Divider */}
        <div className="w-px h-5 bg-border" />

        {/* Progress indicator + label */}
        <div className="flex items-center gap-1.5 min-w-0">
          {totalSentences > 0 && currentSentenceIndex >= 0 && (
            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
              {currentSentenceIndex + 1}/{totalSentences}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground max-w-[80px] truncate">
            {isLoading
              ? "Loading..."
              : status === "playing"
              ? currentLabel
              : status === "paused"
              ? "Paused"
              : "Stopped"}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Small helper to render a shortcut row in the tooltip */
function ShortcutRow({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-medium bg-muted rounded border border-border min-w-[32px] text-center">
        {keys}
      </kbd>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
