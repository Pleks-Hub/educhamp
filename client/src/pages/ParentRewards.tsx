/**
 * ParentRewards — /parent-rewards
 * Dedicated page for parents to manage rewards, approve/reject redemptions,
 * create new rewards, and get guidance on setting appropriate XP costs.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Plus,
  XCircle,
  AlertCircle,
  Lightbulb,
  Users,
  TrendingUp,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
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
  pending: { label: "Awaiting Your Approval", icon: Clock, className: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-red-50 text-red-700 border-red-200" },
};

// Suggested XP costs for guidance
const XP_SUGGESTIONS = [
  { category: "screen_time", title: "30 min extra screen time", xp: 200, description: "A small, frequent reward" },
  { category: "screen_time", title: "1 hour gaming session", xp: 500, description: "Moderate effort required" },
  { category: "treat", title: "Ice cream or snack", xp: 300, description: "Quick treat for steady effort" },
  { category: "treat", title: "Choose dinner tonight", xp: 400, description: "Fun family involvement" },
  { category: "outing", title: "Trip to the park", xp: 600, description: "Encourages outdoor activity" },
  { category: "outing", title: "Movie night out", xp: 1000, description: "Big reward for sustained effort" },
  { category: "custom", title: "Stay up 30 min late", xp: 350, description: "Popular with younger kids" },
  { category: "custom", title: "Pick a family activity", xp: 800, description: "Builds family bonding" },
];

export default function ParentRewards() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [newReward, setNewReward] = useState({ title: "", xpCost: "", category: "custom", childId: "" });

  const { data: children, isLoading: childrenLoading } = trpc.parent.listChildren.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: redemptions, isLoading: redemptionsLoading } = trpc.gamification.getChildRedemptions.useQuery(
    {},
    { enabled: !!user, staleTime: 15_000 }
  );

  const { data: parentRewards, isLoading: rewardsLoading } = trpc.gamification.getParentRewards.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30_000,
  });

  const createMutation = trpc.gamification.createReward.useMutation({
    onSuccess: () => {
      utils.gamification.getParentRewards.invalidate();
      utils.gamification.getChildRedemptions.invalidate();
      toast.success("Reward created! Your child can now see it in their Rewards page.");
      setCreateOpen(false);
      setNewReward({ title: "", xpCost: "", category: "custom", childId: "" });
    },
    onError: (err) => toast.error(err.message ?? "Failed to create reward"),
  });

  const approveMutation = trpc.gamification.approveRedemption.useMutation({
    onSuccess: () => {
      utils.gamification.getChildRedemptions.invalidate();
      toast.success("Redemption approved! Your child will be thrilled.");
    },
    onError: (err) => toast.error(err.message ?? "Failed to approve"),
  });

  const rejectMutation = trpc.gamification.rejectRedemption.useMutation({
    onSuccess: (data) => {
      utils.gamification.getChildRedemptions.invalidate();
      toast.success(`Redemption rejected. ${data.xpRefunded.toLocaleString()} XP refunded to your child.`);
    },
    onError: (err) => toast.error(err.message ?? "Failed to reject"),
  });

  const deactivateMutation = trpc.gamification.deactivateReward.useMutation({
    onSuccess: (data) => {
      utils.gamification.getParentRewards.invalidate();
      toast.success(data.isActive ? "Reward reactivated" : "Reward deactivated");
    },
    onError: (err) => toast.error(err.message ?? "Failed to toggle reward"),
  });

  const pendingRedemptions = useMemo(
    () => (redemptions ?? []).filter((r: any) => r.status === "pending"),
    [redemptions]
  );

  const processedRedemptions = useMemo(
    () => (redemptions ?? []).filter((r: any) => r.status !== "pending"),
    [redemptions]
  );

  function handleCreate() {
    if (!newReward.title.trim() || !newReward.xpCost || !newReward.childId) {
      toast.error("Please fill in all fields");
      return;
    }
    createMutation.mutate({
      childUserId: Number(newReward.childId),
      rewardTitle: newReward.title.trim(),
      xpCost: Number(newReward.xpCost),
      category: newReward.category as any,
    });
  }

  function getChildName(childId: number) {
    const child = children?.find((c: any) => c.childId === childId);
    return child?.name ?? "Student";
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Gift className="h-6 w-6 text-violet-600" />
            Rewards Manager
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create rewards, approve redemptions, and guide your child's motivation.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4" />
              Create Reward
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-violet-600" />
                Create a New Reward
              </DialogTitle>
              <DialogDescription>
                Set up a reward your child can earn by spending XP from their learning activities.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="child">For which child?</Label>
                <Select value={newReward.childId} onValueChange={(v) => setNewReward({ ...newReward, childId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a child" />
                  </SelectTrigger>
                  <SelectContent>
                    {(children ?? []).map((c: any) => (
                      <SelectItem key={c.childId} value={String(c.childId)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Reward Name</Label>
                <Input
                  id="title"
                  placeholder="e.g., 30 min extra screen time"
                  value={newReward.title}
                  onChange={(e) => setNewReward({ ...newReward, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={newReward.category} onValueChange={(v) => setNewReward({ ...newReward, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="screen_time">Screen Time</SelectItem>
                    <SelectItem value="outing">Outing</SelectItem>
                    <SelectItem value="treat">Treat</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="xp">XP Cost</Label>
                <div className="relative">
                  <Input
                    id="xp"
                    type="number"
                    min={50}
                    max={50000}
                    placeholder="e.g., 500"
                    value={newReward.xpCost}
                    onChange={(e) => setNewReward({ ...newReward, xpCost: e.target.value })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">XP</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tip: 100-300 XP for small daily rewards, 500-1000 for weekly goals, 1000+ for big milestones.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                className="bg-violet-600 hover:bg-violet-700"
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                Create Reward
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Approvals Banner */}
      {pendingRedemptions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-800">
                {pendingRedemptions.length} redemption{pendingRedemptions.length > 1 ? "s" : ""} awaiting your approval
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Your child has requested reward{pendingRedemptions.length > 1 ? "s" : ""}. Review and approve or reject below.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue={pendingRedemptions.length > 0 ? "approvals" : "rewards"}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="approvals" className="gap-1.5 relative">
            <ShieldCheck className="h-3.5 w-3.5" />
            Approvals
            {pendingRedemptions.length > 0 && (
              <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                {pendingRedemptions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="rewards" className="gap-1.5">
            <Gift className="h-3.5 w-3.5" />
            My Rewards
          </TabsTrigger>
          <TabsTrigger value="guide" className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            Guidance
          </TabsTrigger>
        </TabsList>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="mt-6 space-y-4">
          {redemptionsLoading && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          )}

          {!redemptionsLoading && pendingRedemptions.length === 0 && (
            <div className="text-center py-16">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-400" />
              <h3 className="text-lg font-semibold text-foreground mb-1">All caught up!</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                No pending redemption requests. When your child redeems a reward, it will appear here for your approval.
              </p>
            </div>
          )}

          {/* Pending redemptions */}
          {pendingRedemptions.map((r: any) => {
            const meta = categoryMeta(r.category ?? "custom");
            const Icon = meta.icon;
            return (
              <Card key={r.id} className="overflow-hidden border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border", meta.bg)}>
                      <Icon className={cn("h-6 w-6", meta.colour)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{r.rewardTitle}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {r.childName ?? "Student"}
                        </span>
                        <span className="text-xs text-violet-600 font-medium flex items-center gap-0.5">
                          <Zap className="h-3 w-3" />
                          {r.xpSpent.toLocaleString()} XP spent
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.redeemedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => rejectMutation.mutate({ redemptionId: r.id })}
                        disabled={rejectMutation.isPending || approveMutation.isPending}
                      >
                        {rejectMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => approveMutation.mutate({ redemptionId: r.id })}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        {approveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                        Approve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Past decisions */}
          {processedRedemptions.length > 0 && (
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Past Decisions</h3>
              {processedRedemptions.slice(0, 10).map((r: any) => {
                const meta = categoryMeta(r.category ?? "custom");
                const Icon = meta.icon;
                const statusConfig = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;
                return (
                  <Card key={r.id} className="overflow-hidden opacity-80">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border", meta.bg)}>
                        <Icon className={cn("h-4 w-4", meta.colour)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{r.rewardTitle}</p>
                        <span className="text-xs text-muted-foreground">{r.childName} · {new Date(r.redeemedAt).toLocaleDateString()}</span>
                      </div>
                      <Badge variant="outline" className={cn("text-xs gap-1 shrink-0", statusConfig.className)}>
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

        {/* My Rewards Tab */}
        <TabsContent value="rewards" className="mt-6 space-y-4">
          {rewardsLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
            </div>
          )}

          {!rewardsLoading && (!parentRewards || parentRewards.length === 0) && (
            <div className="text-center py-16">
              <Gift className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No rewards created yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                Create rewards that your child can earn by spending XP from their learning activities.
              </p>
              <Button className="bg-violet-600 hover:bg-violet-700 gap-1.5" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Your First Reward
              </Button>
            </div>
          )}

          {!rewardsLoading && parentRewards && parentRewards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {parentRewards.map((reward: any) => {
                const meta = categoryMeta(reward.category ?? "custom");
                const Icon = meta.icon;
                return (
                  <Card key={reward.id} className={cn("overflow-hidden transition-all", !reward.isActive && "opacity-50")}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium", meta.bg, meta.colour)}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </div>
                        <button
                          onClick={() => deactivateMutation.mutate({ rewardId: reward.id })}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title={reward.isActive ? "Deactivate reward" : "Reactivate reward"}
                        >
                          {reward.isActive ? (
                            <ToggleRight className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                      <h3 className="font-semibold text-foreground">{reward.rewardTitle}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          For: {getChildName(reward.childUserId)}
                        </span>
                        <span className="text-sm font-bold text-violet-700 flex items-center gap-0.5">
                          <Zap className="h-3.5 w-3.5" />
                          {reward.xpCost.toLocaleString()} XP
                        </span>
                      </div>
                      {!reward.isActive && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Deactivated</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Guidance Tab */}
        <TabsContent value="guide" className="mt-6 space-y-6">
          {/* How XP Works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-600" />
                How Your Child Earns XP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <Zap className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Completing Lessons</p>
                    <p className="text-xs">10-25 XP per lesson completed</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <Zap className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Passing Quizzes</p>
                    <p className="text-xs">50-100 XP depending on score</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <Zap className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Daily Streak</p>
                    <p className="text-xs">Bonus XP for consecutive study days</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <Zap className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Completing Tasks</p>
                    <p className="text-xs">XP from parent-assigned tasks</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reward Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Reward Ideas & Suggested XP Costs
              </CardTitle>
              <CardDescription>
                Use these as starting points. Adjust based on how quickly your child earns XP.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {XP_SUGGESTIONS.map((s, i) => {
                  const meta = categoryMeta(s.category);
                  const Icon = meta.icon;
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border", meta.bg)}>
                        <Icon className={cn("h-4 w-4", meta.colour)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                      </div>
                      <span className="text-xs font-bold text-violet-700 flex items-center gap-0.5 shrink-0">
                        <Zap className="h-3 w-3" />
                        {s.xp}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-gradient-to-br from-violet-50/50 to-indigo-50/50 border-violet-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-600" />
                Tips for Effective Rewards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <p><strong className="text-foreground">Mix small and big rewards.</strong> Small rewards (200-400 XP) keep daily motivation high. Big rewards (1000+ XP) give long-term goals to work toward.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <p><strong className="text-foreground">Avoid purely monetary rewards.</strong> Experiences (outings, activities, privileges) tend to be more motivating and build positive associations with learning.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <p><strong className="text-foreground">Adjust costs over time.</strong> If your child is redeeming too quickly, increase XP costs slightly. If they seem discouraged, lower them or add easier-to-reach rewards.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <p><strong className="text-foreground">Approve promptly.</strong> Quick approvals reinforce the connection between effort and reward. Try to respond within a day.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <p><strong className="text-foreground">Celebrate together.</strong> When your child redeems a reward, make it a moment — acknowledge their hard work and the learning that earned it.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
