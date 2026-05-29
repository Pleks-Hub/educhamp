/**
 * XpProgressBar — compact XP + level widget for the sidebar header.
 * Shows current level badge, level name, XP progress bar, and streak flame.
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Flame, Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function XpProgressBar({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { data: profile } = trpc.gamification.getProfile.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  if (!user || !profile) return null;

  const { level, streak } = profile;
  const { progressPercent, xpInLevel, xpNeeded, levelName, level: lvl } = level;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-default select-none">
              <LevelBadge level={lvl} size="sm" />
              {streak && streak.currentStreak > 0 && (
                <span className="flex items-center gap-0.5 text-orange-500 text-xs font-semibold">
                  <Flame className="w-3 h-3" />
                  {streak.currentStreak}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            <p className="font-semibold">{levelName}</p>
            <p>{xpInLevel} / {xpNeeded} XP</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="px-3 pb-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LevelBadge level={lvl} size="md" />
          <div>
            <p className="text-xs font-semibold text-foreground leading-none">{levelName}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Level {lvl}</p>
          </div>
        </div>
        {streak && streak.currentStreak > 0 && (
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="w-4 h-4" />
            <span className="text-xs font-bold">{streak.currentStreak}</span>
          </div>
        )}
      </div>
      {/* XP progress bar */}
      <div className="space-y-0.5">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-right">
          {xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP
        </p>
      </div>
    </div>
  );
}

// ─── Level Badge ──────────────────────────────────────────────────────────────

export function LevelBadge({ level, size = "md" }: { level: number; size?: "sm" | "md" | "lg" }) {
  const color = getLevelColor(level);
  const sizeClass = size === "sm" ? "w-6 h-6 text-[10px]" : size === "lg" ? "w-12 h-12 text-lg" : "w-8 h-8 text-xs";

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0",
        sizeClass,
        color,
      )}
    >
      {level}
    </div>
  );
}

function getLevelColor(level: number): string {
  if (level >= 50) return "bg-gradient-to-br from-yellow-400 to-amber-600";
  if (level >= 40) return "bg-gradient-to-br from-purple-500 to-pink-600";
  if (level >= 30) return "bg-gradient-to-br from-blue-500 to-cyan-600";
  if (level >= 20) return "bg-gradient-to-br from-emerald-500 to-teal-600";
  if (level >= 10) return "bg-gradient-to-br from-indigo-500 to-violet-600";
  return "bg-gradient-to-br from-slate-500 to-slate-700";
}
