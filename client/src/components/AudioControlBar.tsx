import { Play, Pause, Square, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TtsSpeed, TtsStatus } from "@/hooks/useTTS";

interface AudioControlBarProps {
  status: TtsStatus;
  currentLabel: string;
  currentSpeed: TtsSpeed;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onReplay: () => void;
  onSpeedChange: (speed: TtsSpeed) => void;
  className?: string;
}

const SPEED_OPTIONS: { value: TtsSpeed; label: string }[] = [
  { value: "slow", label: "Slow" },
  { value: "normal", label: "Normal" },
  { value: "fast", label: "Fast" },
];

export function AudioControlBar({
  status,
  currentLabel,
  currentSpeed,
  onPlay,
  onPause,
  onStop,
  onReplay,
  onSpeedChange,
  className,
}: AudioControlBarProps) {
  if (status === "idle" && !currentLabel) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-3 px-4 py-2.5 rounded-full",
        "bg-card/95 backdrop-blur-md border border-border shadow-lg",
        "animate-in slide-in-from-bottom-4 duration-200",
        className
      )}
      role="toolbar"
      aria-label="Audio playback controls"
    >
      {/* Play/Pause */}
      {status === "playing" ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onPause}
          aria-label="Pause"
        >
          <Pause className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onPlay}
          aria-label="Play"
        >
          <Play className="h-4 w-4" />
        </Button>
      )}

      {/* Stop */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={onStop}
        aria-label="Stop"
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

      {/* Speed selector */}
      <div className="flex items-center gap-0.5 rounded-full bg-muted p-0.5">
        {SPEED_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSpeedChange(opt.value)}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-150",
              currentSpeed === opt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={`Speed: ${opt.label}`}
            aria-pressed={currentSpeed === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-border" />

      {/* Current label */}
      <span className="text-xs text-muted-foreground max-w-[160px] truncate">
        {status === "playing" ? `Reading: ${currentLabel}` : status === "paused" ? "Paused" : "Stopped"}
      </span>
    </div>
  );
}
