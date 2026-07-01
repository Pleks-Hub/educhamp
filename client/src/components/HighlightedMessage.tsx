import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { splitIntoSentences } from "@/hooks/useTTS";

interface HighlightedMessageProps {
  content: string;
  messageId: string;
  activeMessageId: string | null;
  currentSentenceIndex: number;
  className?: string;
}

/**
 * Renders message content with the currently-read sentence highlighted.
 * Falls back to plain text when this message is not being read.
 */
export function HighlightedMessage({
  content,
  messageId,
  activeMessageId,
  currentSentenceIndex,
  className,
}: HighlightedMessageProps) {
  const isActive = activeMessageId === messageId;

  const sentences = useMemo(() => splitIntoSentences(content), [content]);

  // If not actively being read, don't render with sentence spans
  if (!isActive || currentSentenceIndex < 0) {
    return null; // caller should render normal markdown
  }

  return (
    <div className={cn("leading-relaxed", className)}>
      {sentences.map((sentence, idx) => (
        <span
          key={idx}
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
