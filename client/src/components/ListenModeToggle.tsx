import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Map BCP 47 tags to short display codes */
const LANG_BADGE_MAP: Record<string, string> = {
  "es-ES": "ES",
  "fr-FR": "FR",
  "de-DE": "DE",
  "it-IT": "IT",
  "pt-BR": "PT",
  "zh-CN": "中",
  "ja-JP": "日",
  "ko-KR": "한",
  "ar-SA": "ع",
  "ru-RU": "RU",
};

interface ListenModeToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  showFirstTimeTooltip?: boolean;
  onDismissTooltip?: () => void;
  /** The detected/resolved language code (e.g. "es-ES"). Badge shown when non-English. */
  detectedLanguage?: string;
  className?: string;
}

export function ListenModeToggle({
  enabled,
  onToggle,
  showFirstTimeTooltip = false,
  onDismissTooltip,
  detectedLanguage,
  className,
}: ListenModeToggleProps) {
  const handleClick = () => {
    onToggle(!enabled);
    if (showFirstTimeTooltip && onDismissTooltip) {
      onDismissTooltip();
    }
  };

  // Show badge only when language is non-English
  const langCode = detectedLanguage && detectedLanguage !== "en-US"
    ? LANG_BADGE_MAP[detectedLanguage] || detectedLanguage.split("-")[0].toUpperCase()
    : null;

  const button = (
    <Button
      variant={enabled ? "default" : "outline"}
      size="sm"
      onClick={handleClick}
      className={cn(
        "gap-2 transition-all duration-160",
        enabled && "bg-primary text-primary-foreground shadow-sm",
        className
      )}
      aria-label={enabled ? "Disable Listen Mode" : "Enable Listen Mode"}
      aria-pressed={enabled}
    >
      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      <span className="text-xs font-medium">Listen Mode</span>
      {langCode && enabled && (
        <Badge
          variant="secondary"
          className="ml-0.5 px-1.5 py-0 text-[10px] font-bold leading-4 rounded-sm bg-primary-foreground/20 text-primary-foreground"
        >
          {langCode}
        </Badge>
      )}
    </Button>
  );

  if (showFirstTimeTooltip) {
    return (
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[240px] text-center">
            <p className="text-xs">
              This subject supports Listen Mode — tap the speaker icon to have your AI tutor read to you.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
