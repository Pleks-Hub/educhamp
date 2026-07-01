import { Volume2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TtsStatus } from "@/hooks/useTTS";

interface ReadThisButtonProps {
  messageId: string;
  messageContent: string;
  activeMessageId: string | null;
  ttsStatus: TtsStatus;
  onRead: (content: string, messageId: string) => void;
  onStop: () => void;
  className?: string;
}

export function ReadThisButton({
  messageId,
  messageContent,
  activeMessageId,
  ttsStatus,
  onRead,
  onStop,
  className,
}: ReadThisButtonProps) {
  const isThisMessagePlaying = activeMessageId === messageId && (ttsStatus === "playing" || ttsStatus === "paused");

  const handleClick = () => {
    if (isThisMessagePlaying) {
      onStop();
    } else {
      onRead(messageContent, messageId);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={cn(
        "h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all duration-150",
        isThisMessagePlaying && "opacity-100 text-primary",
        className
      )}
      aria-label={isThisMessagePlaying ? "Stop reading" : "Read this message aloud"}
    >
      {isThisMessagePlaying ? (
        <>
          <Square className="h-3 w-3" />
          <span>Stop</span>
        </>
      ) : (
        <>
          <Volume2 className="h-3 w-3" />
          <span>Read This</span>
        </>
      )}
    </Button>
  );
}
