import { useMemo, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { splitIntoSentences } from "@/hooks/useTTS";

interface HighlightedMessageProps {
  content: string;
  messageId: string;
  activeMessageId: string | null;
  currentSentenceIndex: number;
  /** If true, auto-scroll is disabled (e.g. user scrolled up manually) */
  autoScrollDisabled?: boolean;
  className?: string;
}

/**
 * Renders message content with the currently-read sentence highlighted.
 * Auto-scrolls to keep the highlighted sentence visible when it advances
 * below the viewport, unless the user has manually scrolled up.
 */
export function HighlightedMessage({
  content,
  messageId,
  activeMessageId,
  currentSentenceIndex,
  autoScrollDisabled = false,
  className,
}: HighlightedMessageProps) {
  const isActive = activeMessageId === messageId;
  const activeSentenceRef = useRef<HTMLSpanElement | null>(null);

  const sentences = useMemo(() => splitIntoSentences(content), [content]);

  // Auto-scroll to the active sentence when it changes
  useEffect(() => {
    if (!isActive || autoScrollDisabled || currentSentenceIndex < 0) return;
    if (!activeSentenceRef.current) return;

    // Use scrollIntoView with smooth behavior, only scroll if needed
    activeSentenceRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [isActive, currentSentenceIndex, autoScrollDisabled]);

  // If not actively being read, don't render with sentence spans
  if (!isActive || currentSentenceIndex < 0) {
    return null; // caller should render normal markdown
  }

  return (
    <div className={cn("leading-relaxed", className)}>
      {sentences.map((sentence, idx) => (
        <span
          key={idx}
          ref={idx === currentSentenceIndex ? activeSentenceRef : undefined}
          className={cn(
            "transition-all duration-200 rounded-sm",
            idx === currentSentenceIndex
              ? "bg-primary/15 text-foreground px-0.5 py-0.5"
              : idx < currentSentenceIndex
                ? "text-muted-foreground/70"
                : "text-foreground"
          )}
        >
          {sentence}{" "}
        </span>
      ))}
    </div>
  );
}
