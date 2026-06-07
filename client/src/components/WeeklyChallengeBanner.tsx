/**
 * WeeklyChallengeBanner — shown on the student dashboard with the current
 * weekly challenge, progress bar, countdown, and claim button.
 */
import { trpc } from "@/lib/trpc";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Clock, Trophy, Target, Flame, Brain, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CHALLENGE_ICONS: Record<string, typeof Target> = {
  task_count: Target,
  streak_days: Flame,
  focus_minutes: Brain,
  xp_earned: Star,
};

const CHALLENGE_COLORS: Record<string, { gradient: string; text: string; badge: string }> = {
  task_count: {
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    text: "text-white",
    badge: "bg-white/20 text-white border-white/30",
  },
  streak_days: {
    gradient: "from-orange-500 via-red-500 to-pink-500",
    text: "text-white",
    badge: "bg-white/20 text-white border-white/30",
  },
  focus_minutes: {
    gradient: "from-violet-500 via-purple-500 to-indigo-500",
    text: "text-white",
    badge: "bg-white/20 text-white border-white/30",
  },
  xp_earned: {
    gradient: "from-amber-400 via-yellow-400 to-orange-400",
    text: "text-amber-900",
    badge: "bg-amber-100 text-amber-900 border-amber-300",
  },
};

export function WeeklyChallengeBanner() {
  const { data: challenge, isLoading } = trpc.weeklyChallenges.getCurrent.useQuery(undefined, {
    staleTime: 60_000,
    retry: false,
  });

  const utils = trpc.useUtils();
  const claimReward = trpc.weeklyChallenges.claimReward.useMutation({
    onSuccess: (data) => {
      toast.success(`Challenge complete! +${data.xpAwarded} XP earned!`, { icon: "🏆" });
      utils.weeklyChallenges.getCurrent.invalidate();
      utils.gamification.getProfile.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading || !challenge) return null;

  const Icon = CHALLENGE_ICONS[challenge.challengeType] ?? Target;
  const colors = CHALLENGE_COLORS[challenge.challengeType] ?? CHALLENGE_COLORS.task_count;
  const progressPercent = Math.min(100, Math.round((challenge.progress / challenge.target) * 100));
  const isCompleted = challenge.status === "completed";
  const isClaimed = challenge.status === "claimed";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-r p-5 shadow-lg",
        colors.gradient,
      )}
      role="region"
      aria-label="Weekly Challenge"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
          <Icon className="h-6 w-6 text-white" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-[10px] font-semibold border uppercase tracking-wide", colors.badge)}>
              <Target className="h-2.5 w-2.5 mr-1" />
              Weekly Challenge
            </Badge>
            <Badge variant="outline" className={cn("text-[10px] font-semibold border", colors.badge)}>
              <Zap className="h-2.5 w-2.5 mr-1" />
              +{challenge.bonusXp} XP Bonus
            </Badge>
            {challenge.daysLeft !== undefined && challenge.daysLeft > 0 && !isClaimed && (
              <Badge variant="outline" className={cn("text-[10px] font-semibold border", colors.badge)}>
                <Clock className="h-2.5 w-2.5 mr-1" />
                {challenge.daysLeft} day{challenge.daysLeft !== 1 ? "s" : ""} left
              </Badge>
            )}
          </div>

          {/* Title & description */}
          <div>
            <h3 className={cn("text-lg font-bold leading-tight", colors.text)}>
              {challenge.title}
            </h3>
            {challenge.description && (
              <p className={cn("text-sm mt-0.5 opacity-90", colors.text)}>
                {challenge.description}
              </p>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className={cn("flex justify-between text-xs opacity-90", colors.text)}>
              <span>{challenge.progress} / {challenge.target}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2.5 bg-black/20 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  isClaimed || isCompleted ? "bg-white" : "bg-white/80",
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-2 pt-1">
            {isClaimed ? (
              <div className={cn("flex items-center gap-1.5 text-sm font-semibold", colors.text)}>
                <Trophy className="h-4 w-4" />
                Challenge Complete — Reward Claimed!
              </div>
            ) : isCompleted ? (
              <Button
                size="sm"
                className="bg-white text-emerald-700 hover:bg-white/90 font-semibold shadow-md"
                onClick={() => claimReward.mutate({ challengeId: challenge.id })}
                disabled={claimReward.isPending}
              >
                <Trophy className="h-4 w-4 mr-1.5" />
                {claimReward.isPending ? "Claiming..." : `Claim ${challenge.bonusXp} XP Reward`}
              </Button>
            ) : (
              <div className={cn("text-xs font-medium opacity-80", colors.text)}>
                Keep going — you're {progressPercent}% there!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
