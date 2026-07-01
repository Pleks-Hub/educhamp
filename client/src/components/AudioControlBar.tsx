import { useEffect } from "react";
import { Play, Pause, Square, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TtsSpeed, TtsStatus } from "@/hooks/useTTS";

interface AudioControlBarProps {
  status: TtsStatus;
  currentLabel: string;
  currentSpeed: TtsSpeed;
  currentSentenceIndex: number;
  totalSentences: number;
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
  slow: "0.7x",
  normal: "1x",
  fast: "1.25x",
};

export function AudioControlBar({
  status,
  currentLabel,
  currentSpeed,
  currentSentenceIndex,
  totalSentences,
  onPlay,
  onPause,
  onStop,
  onReplay,
  onSpeedCycle,
  onSkipForward,
  onSkipBack,
  className,
}: AudioControlBarProps) {
  // Keyboard shortcuts — only active when TTS is playing or paused
  useEffect(() => {
    if (status === "idle") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when user is typing in an input/textarea
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

  if (status === "idle" && !currentLabel) return null;

  const progressPercent =
    totalSentences > 0 && currentSentenceIndex >= 0
      ? Math.round(((currentSentenceIndex + 1) / totalSentences) * 100)
      : 0;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "flex flex-col items-center gap-0 rounded-2xl",
        "bg-card/95 backdrop-blur-md border border-border shadow-lg",
        "animate-in slide-in-from-bottom-4 duration-200",
        "overflow-hidden",
        className
      )}
      role="toolbar"
      aria-label="Audio playback controls"
    >
      {/* Progress bar */}
      <div className="w-full h-1 bg-muted relative">
        <div
          className="absolute inset-y-0 left-0 bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2 px-4 py-2.5">
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

        {/* Play/Pause */}
        {status === "playing" ? (
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

        {/* Stop */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onStop}
          aria-label="Stop (Escape)"
        >
          <Square className="h-3.5 w-3.5" />
        </Button>

        {/* Replay */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onReplay}
          aria-label="Replay"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        {/* Divider */}
        <div className="w-px h-5 bg-border" />

        {/* Speed badge — clickable to cycle */}
        <button
          onClick={onSpeedCycle}
          className={cn(
            "px-2.5 py-1 text-xs font-semibold rounded-full",
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

        {/* Progress indicator + label */}
        <div className="flex items-center gap-2">
          {totalSentences > 0 && currentSentenceIndex >= 0 && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {currentSentenceIndex + 1}/{totalSentences}
            </span>
          )}
          <span className="text-xs text-muted-foreground max-w-[140px] truncate">
            {status === "playing"
              ? `Reading: ${currentLabel}`
              : status === "paused"
              ? "Paused"
              : "Stopped"}
          </span>
        </div>
      </div>
    </div>
  );
}
