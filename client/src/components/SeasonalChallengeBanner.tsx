/**
 * SeasonalChallengeBanner — shown on the Home dashboard when an active seasonal
 * challenge exists. Displays theme, title, XP bonus, days remaining, and user
 * progress. Dismissible per session.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Zap, Clock, Trophy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

const THEME_STYLES: Record<string, {
  gradient: string;
  textPrimary: string;
  textSecondary: string;
  badgeBg: string;
  emoji: string;
}> = {
  summer: {
    gradient: "from-amber-400 via-orange-400 to-yellow-300",
    textPrimary: "text-amber-900",
    textSecondary: "text-amber-800/80",
    badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
    emoji: "☀️",
  },
  back_to_school: {
    gradient: "from-blue-500 via-indigo-500 to-violet-500",
    textPrimary: "text-white",
    textSecondary: "text-white/80",
    badgeBg: "bg-white/20 text-white border-white/30",
    emoji: "🎒",
  },
  sat_sprint: {
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    textPrimary: "text-white",
    textSecondary: "text-white/80",
    badgeBg: "bg-white/20 text-white border-white/30",
    emoji: "📝",
  },
  stem_month: {
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    textPrimary: "text-white",
    textSecondary: "text-white/80",
    badgeBg: "bg-white/20 text-white border-white/30",
    emoji: "🔬",
  },
  default: {
    gradient: "from-slate-600 via-slate-700 to-slate-800",
    textPrimary: "text-white",
    textSecondary: "text-white/80",
    badgeBg: "bg-white/20 text-white border-white/30",
    emoji: "🏆",
  },
};

const DISMISS_KEY = "educhamp-seasonal-banner-dismissed";

export function SeasonalChallengeBanner() {
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem(DISMISS_KEY) === "1"
  );

  const { data: challenge } = trpc.gamification.getActiveSeasonalChallenge.useQuery(undefined, {
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (dismissed || !challenge) return null;

  const themeKey = challenge.theme ?? "default";
  const style = THEME_STYLES[themeKey] ?? THEME_STYLES.default;
  const progressPercent = Math.min(100, challenge.userProgress ?? 0);

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-r p-5 shadow-lg",
        style.gradient,
      )}
      role="region"
      aria-label="Seasonal Challenge"
    >
      {/* Dismiss button */}
      <button
        onClick={dismiss}
        className={cn(
          "absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center transition-colors",
          "bg-black/10 hover:bg-black/20",
          style.textPrimary,
        )}
        aria-label="Dismiss seasonal challenge banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-start gap-4 pr-8">
        {/* Theme emoji */}
        <div className="text-4xl shrink-0 mt-0.5 select-none" aria-hidden="true">
          {style.emoji}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn("text-[10px] font-semibold border uppercase tracking-wide", style.badgeBg)}
            >
              <Sparkles className="h-2.5 w-2.5 mr-1" />
              Seasonal Challenge
            </Badge>
            {challenge.xpBonus > 0 && (
              <Badge
                variant="outline"
                className={cn("text-[10px] font-semibold border", style.badgeBg)}
              >
                <Zap className="h-2.5 w-2.5 mr-1" />
                +{challenge.xpBonus.toLocaleString()} XP Bonus
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn("text-[10px] font-semibold border", style.badgeBg)}
            >
              <Clock className="h-2.5 w-2.5 mr-1" />
              {challenge.daysLeft} day{challenge.daysLeft !== 1 ? "s" : ""} left
            </Badge>
          </div>

          {/* Title & description */}
          <div>
            <h3 className={cn("text-lg font-bold leading-tight", style.textPrimary)}>
              {challenge.title}
            </h3>
            {challenge.description && (
              <p className={cn("text-sm mt-0.5 line-clamp-2", style.textSecondary)}>
                {challenge.description}
              </p>
            )}
          </div>

          {/* Progress bar */}
          {progressPercent > 0 && (
            <div className="space-y-1">
              <div className={cn("flex justify-between text-xs", style.textSecondary)}>
                <span>Your progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center gap-2 pt-1">
            {challenge.completed ? (
              <div className={cn("flex items-center gap-1.5 text-sm font-semibold", style.textPrimary)}>
                <Trophy className="h-4 w-4" />
                Challenge Complete!
              </div>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 border text-xs font-semibold backdrop-blur-sm"
                onClick={() => setLocation("/gamification")}
              >
                View Challenge
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
