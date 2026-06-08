/**
 * GamificationHub — /gamification
 * Full student gamification dashboard: XP, level, streak, badges, quests, house leaderboard.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LevelBadge } from "@/components/XpProgressBar";
import { Flame, Star, Trophy, Target, Zap, Shield, Crown, Lock, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function GamificationHub() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: profile, isLoading, isError: profileError } = trpc.gamification.getProfile.useQuery(undefined, {
    enabled: !!user,
    staleTime: 15_000,
  });

  const { data: leaderboard } = trpc.gamification.getLeaderboard.useQuery({ limit: 10 }, {
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: houseLeaderboard } = trpc.gamification.getHouseLeaderboard.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60_000,
  });

  const bootstrapMutation = trpc.gamification.bootstrap.useMutation({
    onSuccess: () => utils.gamification.getProfile.invalidate(),
  });

  const markSeenMutation = trpc.gamification.markBadgesSeen.useMutation({
    onSuccess: () => utils.gamification.getProfile.invalidate(),
  });

  const assignHouseMutation = trpc.gamification.assignHouse.useMutation({
    onSuccess: () => {
      utils.gamification.getProfile.invalidate();
      toast.success("You've been assigned to a house! 🏠");
    },
  });

  // Bootstrap on first load if no profile data
  const hasData = profile && (profile.xp?.totalXp ?? 0) >= 0;

  if (profileError) {
    return (
      <div className="container max-w-4xl py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-destructive text-sm">Unable to load your achievements. Please refresh the page.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container max-w-4xl py-8 text-center">
        <p className="text-muted-foreground mb-4">Setting up your gamification profile…</p>
        <Button onClick={() => bootstrapMutation.mutate()} disabled={bootstrapMutation.isPending}>
          {bootstrapMutation.isPending ? "Setting up…" : "Initialize Gamification"}
        </Button>
      </div>
    );
  }

  const { xp, level, streak, badges, quests, house } = profile;
  const newBadgeIds = (badges.earned as any[]).filter((b: any) => b.isNew).map((b: any) => b.id);

  const handleTabChange = (tab: string) => {
    if (tab === "badges" && newBadgeIds.length > 0) {
      markSeenMutation.mutate({ badgeIds: newBadgeIds });
    }
  };

  return (
    <div className="container max-w-4xl py-4 sm:py-6 px-3 sm:px-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Achievements
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Track your XP, badges, quests, and learning streaks.</p>
      </div>

      {/* Level + XP Hero Card */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white shadow-xl">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="relative">
              <LevelBadge level={level.level} size="lg" />
              {level.level >= 10 && (
                <Crown className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="text-xl font-bold">{level.levelName}</h2>
                <span className="text-white/60 text-sm">Level {level.level}</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-white/70">
                  <span>{level.xpInLevel.toLocaleString()} XP</span>
                  <span>{level.xpNeeded.toLocaleString()} XP to next level</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-700"
                    style={{ width: `${level.progressPercent}%` }}
                  />
                </div>
              </div>
              <p className="text-white/70 text-xs mt-2">
                Total XP: <span className="text-white font-semibold">{(xp?.totalXp ?? 0).toLocaleString()}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          label="Current Streak"
          value={`${streak?.currentStreak ?? 0} days`}
          sub={`Best: ${streak?.longestStreak ?? 0}`}
          color="orange"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-yellow-500" />}
          label="Badges Earned"
          value={`${badges.earnedCount}`}
          sub={`of ${badges.totalCount}`}
          color="yellow"
          badge={badges.newCount > 0 ? `${badges.newCount} new` : undefined}
        />
        <StatCard
          icon={<Target className="w-5 h-5 text-green-500" />}
          label="Quests Done"
          value={`${[...quests.daily, ...quests.weekly, ...quests.monthly].filter((q: any) => q.completed).length}`}
          sub="this period"
          color="green"
        />
        <StatCard
          icon={<Zap className="w-5 h-5 text-violet-500" />}
          label="Total XP"
          value={(xp?.totalXp ?? 0).toLocaleString()}
          sub="all time"
          color="violet"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="quests" onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quests">
            Quests
          </TabsTrigger>
          <TabsTrigger value="badges" className="relative">
            Badges
            {badges.newCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {badges.newCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="leaderboard">Top 10</TabsTrigger>
          <TabsTrigger value="house">House</TabsTrigger>
        </TabsList>

        {/* Quests Tab */}
        <TabsContent value="quests" className="space-y-4 mt-4">
          <QuestSection title="Daily Quests" quests={quests.daily} icon="🌅" />
          <QuestSection title="Weekly Quests" quests={quests.weekly} icon="📅" />
          <QuestSection title="Monthly Quests" quests={quests.monthly} icon="🗓️" />
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges" className="mt-4">
          <BadgeGrid badges={badges.all as any[]} allBadges={badges.all as any[]} />
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">XP Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(leaderboard ?? []).map((entry: any) => (
                <div
                  key={entry.userId}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg",
                    entry.userId === user?.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50",
                  )}
                >
                  <span className={cn(
                    "w-6 text-center text-sm font-bold",
                    entry.rank === 1 ? "text-yellow-500" : entry.rank === 2 ? "text-slate-400" : entry.rank === 3 ? "text-amber-600" : "text-muted-foreground",
                  )}>
                    {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                  </span>
                  <LevelBadge level={entry.currentLevel} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.displayName ?? "Student"}</p>
                    <p className="text-xs text-muted-foreground">{entry.currentLevelName}</p>
                  </div>
                  <span className="text-sm font-semibold text-violet-600">{entry.totalXp.toLocaleString()} XP</span>
                </div>
              ))}
              {(!leaderboard || leaderboard.length === 0) && (
                <p className="text-center text-muted-foreground text-sm py-8">No leaderboard data yet. Start learning to earn XP!</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* House Tab */}
        <TabsContent value="house" className="mt-4 space-y-4">
          {house ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
                    style={{ backgroundColor: house.house.color + "22", border: `2px solid ${house.house.color}` }}
                  >
                    {house.house.mascotEmoji}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">House {house.house.name}</h3>
                    <p className="text-muted-foreground text-sm">You've contributed <span className="font-semibold text-foreground">{house.membership.pointsContributed.toLocaleString()}</span> points</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">You're not in a house yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Join a house and compete with other students!</p>
                <Button onClick={() => assignHouseMutation.mutate()} disabled={assignHouseMutation.isPending}>
                  {assignHouseMutation.isPending ? "Joining…" : "Join a House"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* House Leaderboard */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">House Standings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(houseLeaderboard ?? []).map((h: any, i: number) => (
                <div key={h.id} className="flex items-center gap-3">
                  <span className="text-lg">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: h.color + "22" }}
                  >
                    {h.mascotEmoji}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">House {h.name}</p>
                    <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${houseLeaderboard && houseLeaderboard[0] ? Math.round((h.totalPoints / Math.max(houseLeaderboard[0].totalPoints, 1)) * 100) : 0}%`,
                          backgroundColor: h.color,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{h.totalPoints.toLocaleString()} pts</span>
                </div>
              ))}
              {(!houseLeaderboard || houseLeaderboard.length === 0) && (
                <p className="text-center text-muted-foreground text-sm py-4">Houses not yet set up. An admin can initialize them.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color, badge: badgeText }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
  badge?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>{icon}</div>
          {badgeText && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{badgeText}</Badge>
          )}
        </div>
        <p className="text-xl font-bold mt-2 text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground leading-none">{label}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

function QuestSection({ title, quests, icon }: { title: string; quests: any[]; icon: string }) {
  if (quests.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
        <span>{icon}</span> {title}
      </h3>
      <div className="space-y-2">
        {quests.map((q: any) => (
          <Card key={q.id} className={cn("overflow-hidden", q.completed && "opacity-70")}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                  q.completed ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground",
                )}>
                  {q.completed ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{q.title}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      +{q.xpReward} XP
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{q.description}</p>
                  <div className="mt-2 space-y-1">
                    <Progress value={q.progressPercent} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground">
                      {q.progress} / {q.requirementValue} {q.requirementType.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BadgeGrid({ badges }: { badges: any[]; allBadges: any[] }) {
  const [filter, setFilter] = useState<string>("all");
  const categories = ["all", "achievement", "academic", "consistency", "behavioral", "special", "parent_engagement"];

  const filtered = filter === "all" ? badges : badges.filter((b: any) => b.category === filter);
  // Sort: earned first, then locked
  const sorted = [...filtered].sort((a, b) => {
    if (a.earned && !b.earned) return -1;
    if (!a.earned && b.earned) return 1;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize",
              filter === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {cat === "all" ? "All" : cat === "parent_engagement" ? "Family" : cat}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground text-sm">No badges in this category yet.</p>
          <p className="text-muted-foreground text-xs mt-1">Complete lessons, quizzes, and tasks to earn badges!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {sorted.map((badge: any) => (
            <Card
              key={badge.id}
              className={cn(
                "overflow-hidden transition-all",
                badge.isNew && "ring-2 ring-yellow-400",
                !badge.earned && "opacity-50 grayscale",
              )}
            >
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">{badge.iconEmoji}</div>
                <p className="text-xs font-semibold leading-tight">{badge.name}</p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight line-clamp-2">{badge.description}</p>
                {badge.earned ? (
                  <Badge variant="secondary" className="mt-2 text-[10px]">+{badge.xpReward} XP</Badge>
                ) : (
                  <Badge variant="outline" className="mt-2 text-[10px] opacity-70">Locked</Badge>
                )}
                {badge.isNew && (
                  <div className="mt-1">
                    <Badge className="text-[10px] bg-yellow-400 text-yellow-900">NEW!</Badge>
                  </div>
                )}
                {badge.earned && badge.earnedAt && (
                  <p className="text-[9px] text-muted-foreground mt-1">
                    Earned {new Date(badge.earnedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
