/**
 * RewardsMarketplace — /rewards
 * Students browse and redeem XP rewards created by their parent/guardian.
 * Includes "My Redemptions" tab showing pending/approved/rejected history.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  History,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<string, { icon: React.ElementType; label: string; colour: string; bg: string }> = {
  screen_time: { icon: Monitor, label: "Screen Time", colour: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  outing: { icon: MapPin, label: "Outing", colour: "text-green-700", bg: "bg-green-50 border-green-200" },
  treat: { icon: Cookie, label: "Treat", colour: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  custom: { icon: Star, label: "Custom", colour: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
};

function categoryMeta(cat: string) {
  return CATEGORY_META[cat] ?? CATEGORY_META.custom;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pending: { label: "Pending Approval", icon: Clock, className: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "Rejected (XP Refunded)", icon: XCircle, className: "bg-red-50 text-red-700 border-red-200" },
};

export default function RewardsMarketplace() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [redeemingId, setRedeemingId] = useState<number | null>(null);
  const [confirmReward, setConfirmReward] = useState<{ id: number; title: string; xpCost: number } | null>(null);

  const { data: rewards, isLoading: rewardsLoading } = trpc.gamification.getRewards.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: profile, isLoading: profileLoading } = trpc.gamification.getProfile.useQuery(undefined, {
    enabled: !!user,
    staleTime: 15_000,
  });

  const { data: redemptions, isLoading: redemptionsLoading } = trpc.gamification.getMyRedemptions.useQuery(
    { limit: 50 },
    { enabled: !!user, staleTime: 30_000 }
  );

  const redeemMutation = trpc.gamification.redeemReward.useMutation({
    onSuccess: (data) => {
      utils.gamification.getProfile.invalidate();
      utils.gamification.getRewards.invalidate();
      utils.gamification.getMyRedemptions.invalidate();
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
    setConfirmReward(null);
    try {
      await redeemMutation.mutateAsync({ rewardId });
    } finally {
      setRedeemingId(null);
    }
  }

  const totalXp = profile?.xp?.totalXp ?? 0;
  const isLoading = rewardsLoading || profileLoading;

  const pendingCount = useMemo(
    () => (redemptions ?? []).filter((r: any) => r.status === "pending").length,
    [redemptions]
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Gift className="h-6 w-6 text-violet-600" />
            XP & Rewards
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Spend your hard-earned XP on rewards set up by your parent or guardian.
          </p>
        </div>
        {/* XP Balance */}
        <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 shadow-sm">
          <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center">
            <Zap className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-xs text-violet-600 font-medium leading-none">Your XP Balance</p>
            <p className="text-2xl font-bold text-violet-800 leading-tight">
              {profileLoading ? "…" : totalXp.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="marketplace">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="marketplace" className="gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5" />
            Available Rewards
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 relative">
            <History className="h-3.5 w-3.5" />
            My Redemptions
            {pendingCount > 0 && (
              <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Marketplace Tab */}
        <TabsContent value="marketplace" className="mt-6 space-y-6">
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
              <ShoppingBag className="h-14 w-14 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No rewards yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
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
                      "overflow-hidden transition-all hover:shadow-md border",
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
                      <h3 className="font-semibold text-foreground text-base leading-snug">
                        {reward.rewardTitle}
                      </h3>

                      {/* Affordability hint */}
                      {!canAfford && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
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
                        onClick={() => canAfford && setConfirmReward({
                          id: reward.id,
                          title: reward.rewardTitle,
                          xpCost: reward.xpCost,
                        })}
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
                <span>Once approved, enjoy your reward! If rejected, your XP will be refunded automatically.</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Redemptions Tab */}
        <TabsContent value="history" className="mt-6 space-y-4">
          {redemptionsLoading && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          )}

          {!redemptionsLoading && (!redemptions || redemptions.length === 0) && (
            <div className="text-center py-16">
              <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No redemptions yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                When you redeem a reward, it will appear here with its approval status.
              </p>
            </div>
          )}

          {!redemptionsLoading && redemptions && redemptions.length > 0 && (
            <div className="space-y-3">
              {redemptions.map((r: any) => {
                const meta = categoryMeta(r.category ?? "custom");
                const Icon = meta.icon;
                const statusConfig = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;

                return (
                  <Card key={r.id} className="overflow-hidden">
                    <CardContent className="p-4 flex items-center gap-4">
                      {/* Category icon */}
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                        meta.bg,
                      )}>
                        <Icon className={cn("h-5 w-5", meta.colour)} />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{r.rewardTitle}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.redeemedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-xs text-violet-600 font-medium flex items-center gap-0.5">
                            <Zap className="h-3 w-3" />
                            {r.xpSpent.toLocaleString()} XP
                          </span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <Badge
                        variant="outline"
                        className={cn("text-xs gap-1 shrink-0", statusConfig.className)}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmReward} onOpenChange={(open) => !open && setConfirmReward(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-violet-600" />
              Confirm Redemption
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to redeem <strong>"{confirmReward?.title}"</strong>?
              </p>
              <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 flex items-center justify-between">
                <span className="text-sm text-violet-700">XP Cost</span>
                <span className="text-lg font-bold text-violet-800 flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  {confirmReward?.xpCost.toLocaleString()}
                </span>
              </div>
              <div className="rounded-lg bg-muted p-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Your balance after</span>
                <span className="text-lg font-bold text-foreground">
                  {(totalXp - (confirmReward?.xpCost ?? 0)).toLocaleString()} XP
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Your parent will be notified and must approve this redemption. If they reject it, your XP will be refunded.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-violet-600 hover:bg-violet-700"
              onClick={() => confirmReward && handleRedeem(confirmReward.id)}
            >
              <Gift className="h-4 w-4 mr-1.5" />
              Confirm & Redeem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
