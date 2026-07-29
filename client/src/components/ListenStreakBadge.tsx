/**
 * ListenStreakBadge — Compact streak counter with flame icon for Listen Mode.
 * Shows consecutive weeks meeting the listen goal, progress this week, and freeze status.
 * Designed to sit in the Tutor page header or sidebar.
 */

import { useState } from "react";
import { Flame, Snowflake, Target, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function formatMinutes(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

interface ListenStreakBadgeProps {
  /** Whether to show expanded detail panel */
  expandable?: boolean;
  className?: string;
}

export function ListenStreakBadge({ expandable = true, className }: ListenStreakBadgeProps) {
  const { data, isLoading } = trpc.listenStreaks.getStats.useQuery(undefined, {
    staleTime: 60_000, // refresh every minute
  });
  const [expanded, setExpanded] = useState(false);

  if (isLoading || !data) return null;

  const { currentStreak, thisWeekSeconds, goalSeconds, goalMet, freezesAvailable, freezeUsedThisWeek, weeklyHistory } = data;
  const progressPercent = Math.min(100, Math.round((thisWeekSeconds / goalSeconds) * 100));
  const hasStreak = currentStreak > 0;

  return (
    <div className={cn("relative", className)}>
      {/* Compact badge */}
      <button
        onClick={() => expandable && setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
          "border transition-all duration-200",
          hasStreak
            ? "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 dark:from-orange-950/30 dark:to-amber-950/30 dark:border-orange-800"
            : "bg-muted/50 border-border",
          expandable && "cursor-pointer hover:shadow-sm active:scale-[0.97]"
        )}
        aria-label={`Listen streak: ${currentStreak} weeks`}
      >
        <Flame
          className={cn(
            "h-3.5 w-3.5",
            hasStreak ? "text-orange-500" : "text-muted-foreground",
            currentStreak >= 4 && "animate-pulse"
          )}
        />
        <span className={cn(
          "text-xs font-bold tabular-nums",
          hasStreak ? "text-orange-700 dark:text-orange-300" : "text-muted-foreground"
        )}>
          {currentStreak}
        </span>
        {freezesAvailable > 0 && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-0.5 ml-0.5">
                  <Snowflake className="h-2.5 w-2.5 text-blue-500" />
                  <span className="text-[9px] text-blue-600 dark:text-blue-400 font-medium">{freezesAvailable}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {freezesAvailable} streak freeze{freezesAvailable > 1 ? "s" : ""} — miss a week without losing your streak
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {expandable && (
          expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className={cn(
          "absolute top-full left-0 mt-1.5 z-50 w-64",
          "bg-card border border-border rounded-xl shadow-lg p-3",
          "animate-in fade-in-0 slide-in-from-top-1 duration-150"
        )}>
          {/* Header */}
          <div className="flex items-center gap-2 mb-2.5">
            <div className={cn(
              "p-1.5 rounded-lg",
              hasStreak
                ? "bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30"
                : "bg-muted"
            )}>
              <Flame className={cn("h-4 w-4", hasStreak ? "text-orange-500" : "text-muted-foreground")} />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {currentStreak} week{currentStreak !== 1 ? "s" : ""} streak
              </p>
              <p className="text-[10px] text-muted-foreground">
                {goalMet ? "Goal met this week!" : "Keep listening to build your streak"}
              </p>
            </div>
          </div>

          {/* This week's progress */}
          <div className="mb-2.5">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Target className="h-2.5 w-2.5" />
                This week
              </span>
              <span className="font-medium">
                {formatMinutes(thisWeekSeconds)} / {formatMinutes(goalSeconds)}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  goalMet
                    ? "bg-gradient-to-r from-green-400 to-emerald-500"
                    : "bg-gradient-to-r from-orange-400 to-amber-500"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Freeze status */}
          {(freezesAvailable > 0 || freezeUsedThisWeek) && (
            <div className="flex items-center gap-1.5 mb-2.5 px-2 py-1 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <Snowflake className="h-3 w-3 text-blue-500" />
              <span className="text-[10px] text-blue-700 dark:text-blue-300">
                {freezeUsedThisWeek
                  ? "Freeze used this week — streak saved!"
                  : `${freezesAvailable} freeze${freezesAvailable > 1 ? "s" : ""} available`}
              </span>
            </div>
          )}

          {/* Weekly history mini-chart */}
          {weeklyHistory.length > 1 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Recent weeks</p>
              <div className="flex items-end gap-1 h-6">
                {weeklyHistory.slice(0, 8).reverse().map((week, i) => {
                  const pct = Math.min(100, Math.round((week.secondsListened / goalSeconds) * 100));
                  return (
                    <TooltipProvider key={week.weekStart} delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex-1 rounded-sm transition-all duration-200 min-h-[2px]",
                              week.goalMet
                                ? "bg-green-400 dark:bg-green-500"
                                : week.freezeUsed
                                ? "bg-blue-300 dark:bg-blue-600"
                                : "bg-muted-foreground/20"
                            )}
                            style={{ height: `${Math.max(8, pct)}%` }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px]">
                          <p>Week of {week.weekStart}</p>
                          <p>{formatMinutes(week.secondsListened)} listened</p>
                          {week.goalMet && <p className="text-green-600">Goal met!</p>}
                          {week.freezeUsed && <p className="text-blue-600">Freeze used</p>}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          )}

          {/* Earn info */}
          <p className="text-[9px] text-muted-foreground mt-2 leading-relaxed">
            Earn a streak freeze every 4 weeks. Listen {formatMinutes(goalSeconds)}/week to keep your streak.
          </p>
        </div>
      )}
    </div>
  );
}
