import { useState, useEffect, useRef } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceRatingPromptProps {
  /** Whether to show the prompt */
  visible: boolean;
  /** The voice URI being rated */
  voiceUri: string | null;
  /** Callback when user submits a rating */
  onRate: (rating: "thumbs_up" | "thumbs_down") => void;
  /** Callback when prompt is dismissed (timeout or manual) */
  onDismiss: () => void;
  /** Auto-dismiss timeout in ms (default 8000) */
  autoDismissMs?: number;
}

/**
 * VoiceRatingPrompt — a compact, auto-dismissing prompt shown after TTS sessions
 * (>3 sentences) asking the student to rate voice quality with thumbs up/down.
 */
export function VoiceRatingPrompt({
  visible,
  voiceUri,
  onRate,
  onDismiss,
  autoDismissMs = 8000,
}: VoiceRatingPromptProps) {
  const [rated, setRated] = useState<"thumbs_up" | "thumbs_down" | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after timeout
  useEffect(() => {
    if (!visible || rated) return;
    timerRef.current = setTimeout(() => {
      onDismiss();
    }, autoDismissMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, rated, autoDismissMs, onDismiss]);

  // Reset rated state when visibility changes
  useEffect(() => {
    if (!visible) setRated(null);
  }, [visible]);

  if (!visible || !voiceUri) return null;

  const handleRate = (rating: "thumbs_up" | "thumbs_down") => {
    setRated(rating);
    onRate(rating);
    // Show "Thanks!" briefly then dismiss
    setTimeout(() => {
      onDismiss();
    }, 1200);
  };

  if (rated) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg animate-in fade-in duration-200">
        <Check className="h-4 w-4 text-green-600" />
        <span className="text-xs font-medium text-green-700 dark:text-green-300">Thanks for the feedback!</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
      <span className="text-xs text-muted-foreground">How was the voice?</span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors"
          onClick={() => handleRate("thumbs_up")}
          aria-label="Good voice quality"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
          onClick={() => handleRate("thumbs_down")}
          aria-label="Poor voice quality"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
