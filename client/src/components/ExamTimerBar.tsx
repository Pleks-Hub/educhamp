import { Clock, AlertTriangle, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimerStatus } from "@/hooks/useExamTimer";

interface ExamTimerBarProps {
  formattedTime: string;
  percentRemaining: number;
  status: TimerStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  TimerStatus,
  { bar: string; text: string; bg: string; icon: React.ElementType; pulse: boolean }
> = {
  idle: {
    bar: "bg-muted",
    text: "text-muted-foreground",
    bg: "bg-muted/30",
    icon: Clock,
    pulse: false,
  },
  running: {
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    icon: Clock,
    pulse: false,
  },
  warning: {
    bar: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    icon: AlertTriangle,
    pulse: false,
  },
  critical: {
    bar: "bg-red-500",
    text: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    icon: AlertOctagon,
    pulse: true,
  },
  expired: {
    bar: "bg-red-700",
    text: "text-red-800 dark:text-red-300",
    bg: "bg-red-100 dark:bg-red-950/50",
    icon: AlertOctagon,
    pulse: true,
  },
};

export function ExamTimerBar({
  formattedTime,
  percentRemaining,
  status,
  className,
}: ExamTimerBarProps) {
  if (status === "idle") return null;

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-2 flex items-center gap-3 transition-colors duration-300",
        config.bg,
        className
      )}
      role="timer"
      aria-live="polite"
      aria-label={`Time remaining: ${formattedTime}`}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0", config.text, config.pulse && "animate-pulse")}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={cn("text-xs font-medium", config.text)}>Time Remaining</span>
          <span
            className={cn(
              "text-sm font-mono font-bold tabular-nums",
              config.text,
              config.pulse && "animate-pulse"
            )}
          >
            {formattedTime}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000 ease-linear",
              config.bar
            )}
            style={{ width: `${Math.max(0, percentRemaining)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
