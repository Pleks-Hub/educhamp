import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Flame, Trophy, Snowflake, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const MILESTONES = [
  { days: 3, label: "3-Day Spark", emoji: "⚡", color: "bg-yellow-100 text-yellow-800" },
  { days: 7, label: "Week Warrior", emoji: "🔥", color: "bg-orange-100 text-orange-800" },
  { days: 14, label: "Fortnight Focus", emoji: "💪", color: "bg-blue-100 text-blue-800" },
  { days: 30, label: "Monthly Master", emoji: "🏆", color: "bg-purple-100 text-purple-800" },
  { days: 60, label: "Double Down", emoji: "⭐", color: "bg-indigo-100 text-indigo-800" },
  { days: 100, label: "Century Club", emoji: "💎", color: "bg-emerald-100 text-emerald-800" },
  { days: 200, label: "Legend", emoji: "👑", color: "bg-amber-100 text-amber-800" },
  { days: 365, label: "Year of Growth", emoji: "🌟", color: "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-900" },
];

function getEarnedBadges(currentStreak: number, longestStreak: number) {
  const maxStreak = Math.max(currentStreak, longestStreak);
  return MILESTONES.filter(m => maxStreak >= m.days);
}

function getNextMilestone(currentStreak: number) {
  return MILESTONES.find(m => m.days > currentStreak);
}

// Confetti particle for fanfare animation
function ConfettiParticle({ delay, x }: { delay: number; x: number }) {
  const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  return (
    <div
      className="absolute w-2 h-2 rounded-full animate-confetti"
      style={{
        left: `${x}%`,
        backgroundColor: color,
        animationDelay: `${delay}ms`,
        animationDuration: "1.5s",
      }}
    />
  );
}

// Fanfare overlay for milestone celebrations
function MilestoneFanfare({ milestone, onDismiss }: { milestone: typeof MILESTONES[0]; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <ConfettiParticle key={i} delay={i * 50} x={Math.random() * 100} />
        ))}
      </div>
      {/* Milestone card */}
      <div className="pointer-events-auto animate-milestone-pop bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center max-w-sm mx-4 border-2 border-yellow-400">
        <div className="text-6xl mb-4 animate-bounce-slow">{milestone.emoji}</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {milestone.label} Unlocked!
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          You've maintained a {milestone.days}-day learning streak!
        </p>
        <Badge className={`${milestone.color} text-sm px-3 py-1`}>
          {milestone.days} days
        </Badge>
      </div>
    </div>
  );
}

// Weekly activity heatmap
function WeeklyHeatmap({ activity }: { activity: { date: string; count: number }[] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date();

  // Build last 7 days
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const found = activity.find(a => a.date === dateStr);
    return {
      date: dateStr,
      count: found?.count ?? 0,
      dayLabel: days[d.getDay() === 0 ? 6 : d.getDay() - 1],
      isToday: i === 6,
    };
  });

  return (
    <div className="flex items-center gap-1.5">
      {last7Days.map((day) => (
        <TooltipProvider key={day.date}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{day.dayLabel}</span>
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                    day.count > 0
                      ? day.count >= 5
                        ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
                        : day.count >= 3
                          ? "bg-orange-400 text-white"
                          : "bg-orange-200 text-orange-800"
                      : day.isToday
                        ? "bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-orange-300"
                        : "bg-gray-100 dark:bg-gray-700"
                  }`}
                >
                  {day.count > 0 ? day.count : ""}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{day.count > 0 ? `${day.count} activities on ${day.date}` : `No activity on ${day.date}`}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}

export function StreakTracker() {
  const { data: streakData, isLoading } = trpc.streak.getStats.useQuery();
  const [showFanfare, setShowFanfare] = useState<typeof MILESTONES[0] | null>(null);
  const hasShownFanfare = useRef(false);

  // Check if we should show fanfare (new milestone just achieved)
  useEffect(() => {
    if (streakData && !hasShownFanfare.current) {
      const milestone = MILESTONES.find(m => m.days === streakData.currentStreak);
      if (milestone && streakData.todayActive) {
        setShowFanfare(milestone);
        hasShownFanfare.current = true;
      }
    }
  }, [streakData]);

  if (isLoading || !streakData) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded" />
        </CardContent>
      </Card>
    );
  }

  const { currentStreak, longestStreak, totalActiveDays, streakFreezes, todayActive, weeklyActivity } = streakData;
  const earnedBadges = getEarnedBadges(currentStreak, longestStreak);
  const nextMilestone = getNextMilestone(currentStreak);

  return (
    <>
      {showFanfare && (
        <MilestoneFanfare milestone={showFanfare} onDismiss={() => setShowFanfare(null)} />
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-4">
          {/* Main streak display */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`relative p-2 rounded-xl ${currentStreak > 0 ? "bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                <Flame className={`h-6 w-6 ${currentStreak > 0 ? "text-orange-500 animate-pulse" : "text-gray-400"}`} />
                {currentStreak >= 7 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
                )}
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{currentStreak}</span>
                  <span className="text-sm text-muted-foreground">day streak</span>
                </div>
                {!todayActive && currentStreak > 0 && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                    Complete a lesson today to keep your streak!
                  </p>
                )}
                {todayActive && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Active today!
                  </p>
                )}
              </div>
            </div>

            {/* Streak freeze indicator */}
            {streakFreezes > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <Snowflake className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{streakFreezes}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Streak freezes: miss a day without losing your streak</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Weekly activity heatmap */}
          <div className="mb-3">
            <WeeklyHeatmap activity={weeklyActivity} />
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Trophy className="h-3 w-3 text-yellow-500" />
              Best: {longestStreak} days
            </span>
            <span>Total: {totalActiveDays} days</span>
          </div>

          {/* Next milestone progress */}
          {nextMilestone && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Next: {nextMilestone.emoji} {nextMilestone.label}</span>
                <span className="font-medium">{currentStreak}/{nextMilestone.days}</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (currentStreak / nextMilestone.days) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Earned badges */}
          {earnedBadges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {earnedBadges.map((badge) => (
                <TooltipProvider key={badge.days}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className={`${badge.color} text-xs cursor-default`}>
                        {badge.emoji} {badge.days}d
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{badge.label} — {badge.days} day streak achieved!</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
