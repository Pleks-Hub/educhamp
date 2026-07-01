import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ListenModeToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  showFirstTimeTooltip?: boolean;
  onDismissTooltip?: () => void;
  className?: string;
}

export function ListenModeToggle({
  enabled,
  onToggle,
  showFirstTimeTooltip = false,
  onDismissTooltip,
  className,
}: ListenModeToggleProps) {
  const handleClick = () => {
    onToggle(!enabled);
    if (showFirstTimeTooltip && onDismissTooltip) {
      onDismissTooltip();
    }
  };

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
