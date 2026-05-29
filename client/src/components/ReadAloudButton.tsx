/**
 * ReadAloudButton — Accessible read-aloud control bar for lesson content.
 *
 * Shows only for young learners (Pre-K through Grade 2) or when parent-led
 * mode is active. Falls back gracefully when speechSynthesis is unavailable.
 */
import { Volume2, VolumeX, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useReadAloud } from "@/hooks/useReadAloud";
import { cn } from "@/lib/utils";

interface ReadAloudButtonProps {
  text: string;
  /** Extra class names for the container */
  className?: string;
  /** Called when narration ends */
  onEnd?: () => void;
}

export function ReadAloudButton({ text, className, onEnd }: ReadAloudButtonProps) {
  const ra = useReadAloud(text, { rate: 0.85, onEnd });

  if (!ra.isSupported) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <VolumeX className="h-4 w-4" />
        <span>Read-aloud not supported in this browser</span>
      </div>
    );
  }

  const rateLabel = ra.rate === 0.6 ? "Slow" : ra.rate <= 0.85 ? "Normal" : ra.rate <= 1.1 ? "Fast" : "Faster";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 shadow-sm",
        className
      )}
      role="region"
      aria-label="Read-aloud controls"
    >
      {/* Main play/pause button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-full bg-amber-400 hover:bg-amber-500 text-white p-0 shrink-0"
            onClick={ra.toggle}
            aria-label={ra.isPlaying ? "Pause narration" : ra.isPaused ? "Resume narration" : "Read aloud"}
          >
            {ra.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{ra.isPlaying ? "Pause" : ra.isPaused ? "Resume" : "Read Aloud"}</TooltipContent>
      </Tooltip>

      {/* Replay button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-full p-0 text-amber-700 hover:bg-amber-100 shrink-0"
            onClick={ra.play}
            aria-label="Restart narration from beginning"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Restart</TooltipContent>
      </Tooltip>

      {/* Volume icon label */}
      <Volume2 className="h-4 w-4 text-amber-600 shrink-0" aria-hidden />

      {/* Speed label */}
      <span className="text-xs font-medium text-amber-700 w-12 shrink-0">{rateLabel}</span>

      {/* Speed slider */}
      <div className="flex items-center gap-1.5 min-w-[100px] flex-1">
        <span className="text-[10px] text-amber-500">🐢</span>
        <Slider
          min={0.6}
          max={1.6}
          step={0.1}
          value={[ra.rate]}
          onValueChange={([v]) => ra.setRate(v)}
          className="flex-1"
          aria-label="Narration speed"
        />
        <span className="text-[10px] text-amber-500">🐇</span>
      </div>

      {/* Status label */}
      {ra.isPlaying && (
        <span className="text-xs text-amber-600 animate-pulse" aria-live="polite">
          Reading…
        </span>
      )}
      {ra.isPaused && (
        <span className="text-xs text-amber-500" aria-live="polite">
          Paused
        </span>
      )}
    </div>
  );
}

/**
 * HighlightedText — Renders text with the currently spoken word highlighted.
 * Use alongside ReadAloudButton when you want word-by-word highlighting.
 */
interface HighlightedTextProps {
  words: string[];
  wordIndex: number;
  className?: string;
}

export function HighlightedText({ words, wordIndex, className }: HighlightedTextProps) {
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span
          key={i}
          className={cn(
            "transition-colors duration-100",
            i === wordIndex && "bg-yellow-300 rounded px-0.5"
          )}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
