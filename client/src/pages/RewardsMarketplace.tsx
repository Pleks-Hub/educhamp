/**
 * RewardsMarketplace — /rewards
 * Students browse and redeem XP rewards created by their parent/guardian.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Gift,
  Zap,
  Monitor,
  MapPin,
  Cookie,
  Star,
  CheckCircle2,
  Clock,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<string, { icon: React.ElementType; label: string; colour: string; bg: string }> = {
  screen_time: { icon: Monitor,  label: "Screen Time",  colour: "text-blue-700",  bg: "bg-blue-50 border-blue-200" },
  outing:      { icon: MapPin,   label: "Outing",       colour: "text-green-700", bg: "bg-green-50 border-green-200" },
  treat:       { icon: Cookie,   label: "Treat",        colour: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  custom:      { icon: Star,     label: "Custom",       colour: "text-violet-700",bg: "bg-violet-50 border-violet-200" },
};

function categoryMeta(cat: string) {
  return CATEGORY_META[cat] ?? CATEGORY_META.custom;
}

export default function RewardsMarketplace() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [redeemingId, setRedeemingId] = useState<number | null>(null);

  const { data: rewards, isLoading: rewardsLoading } = trpc.gamification.getRewards.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: profile, isLoading: profileLoading } = trpc.gamification.getProfile.useQuery(undefined, {
    enabled: !!user,
    staleTime: 15_000,
  });

  const redeemMutation = trpc.gamification.redeemReward.useMutation({
    onSuccess: (data) => {
      utils.gamification.getProfile.invalidate();
      utils.gamification.getRewards.invalidate();
      toast.success(`Reward redeemed! 🎉`, {
        description: `You spent ${data.xpSpent.toLocaleString()} XP. Your parent will be notified to approve it.`,
      });
    },
    onError: (err) => {
      const msg = err.message === "insufficient_xp"
        ? "You don't have enough XP for this reward yet. Keep learning!"
        : err.message === "reward_not_found"
        ? "This reward is no longer available."
        : err.message ?? "Failed to redeem reward.";
      toast.error(msg);
    },
  });

  async function handleRedeem(rewardId: number) {
    setRedeemingId(rewardId);
    try {
      await redeemMutation.mutateAsync({ rewardId });
    } finally {
      setRedeemingId(null);
    }
  }

  const totalXp = profile?.xp?.totalXp ?? 0;
  const isLoading = rewardsLoading || profileLoading;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Gift className="h-6 w-6 text-violet-600" />
            Rewards Marketplace
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Spend your hard-earned XP on rewards set up by your parent or guardian.
          </p>
        </div>
        {/* XP Balance */}
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-50 border border-violet-200">
          <Zap className="h-4 w-4 text-violet-600" />
          <div>
            <p className="text-xs text-violet-600 font-medium leading-none">Your XP Balance</p>
            <p className="text-xl font-bold text-violet-800 leading-tight">
              {profileLoading ? "…" : totalXp.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state — no rewards set up */}
      {!isLoading && (!rewards || rewards.length === 0) && (
        <div className="text-center py-20">
          <ShoppingBag className="h-14 w-14 mx-auto mb-4 text-slate-200" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No rewards yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Your parent or guardian hasn't set up any rewards yet. Ask them to add some in the Parent Dashboard!
          </p>
        </div>
      )}

      {/* Rewards grid */}
      {!isLoading && rewards && rewards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((reward: any) => {
            const meta = categoryMeta(reward.category ?? "custom");
            const Icon = meta.icon;
            const canAfford = totalXp >= reward.xpCost;
            const isRedeeming = redeemingId === reward.id;

            return (
              <Card
                key={reward.id}
                className={cn(
                  "overflow-hidden transition-all hover:shadow-md",
                  !canAfford && "opacity-60",
                )}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Category badge */}
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium",
                      meta.bg, meta.colour,
                    )}>
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </div>
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-50 border border-violet-200 text-xs font-semibold text-violet-700">
                      <Zap className="h-3 w-3" />
                      {reward.xpCost.toLocaleString()} XP
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-slate-900 text-base leading-snug">
                    {reward.rewardTitle}
                  </h3>

                  {/* Affordability hint */}
                  {!canAfford && (
                    <p className="text-xs text-muted-foreground">
                      You need {(reward.xpCost - totalXp).toLocaleString()} more XP
                    </p>
                  )}

                  {/* Redeem button */}
                  <Button
                    className={cn(
                      "w-full gap-1.5",
                        canAfford
                        ? "bg-violet-600 hover:bg-violet-700"
                        : "bg-muted text-muted-foreground cursor-not-allowed",
                    )}
                    disabled={!canAfford || isRedeeming}
                    onClick={() => canAfford && handleRedeem(reward.id)}
                  >
                    {isRedeeming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : canAfford ? (
                      <Gift className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                    {isRedeeming ? "Redeeming…" : canAfford ? "Redeem Reward" : "Not enough XP"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* How it works */}
      <Card className="bg-muted/40 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">How rewards work</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1.5">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
            <span>Earn XP by completing lessons, passing quizzes, and keeping your learning streak.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
            <span>Click "Redeem Reward" to spend your XP — your parent will receive a notification to approve it.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
            <span>Once approved, enjoy your reward! Your parent can add more rewards from their Parent Dashboard.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
