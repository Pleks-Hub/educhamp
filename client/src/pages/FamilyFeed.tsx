import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  CheckCircle2,
  Star,
  Flame,
  Timer,
  ArrowUp,
  Activity,
  Users,
} from "lucide-react";

const EVENT_CONFIG: Record<string, { icon: typeof Trophy; color: string; bgColor: string }> = {
  task_completed: { icon: CheckCircle2, color: "text-green-500", bgColor: "bg-green-500/10" },
  badge_earned: { icon: Star, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  challenge_won: { icon: Trophy, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  level_up: { icon: ArrowUp, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  focus_completed: { icon: Timer, color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
  streak_milestone: { icon: Flame, color: "text-orange-500", bgColor: "bg-orange-500/10" },
};

function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export default function FamilyFeed() {
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const feedQuery = trpc.familyFeed.getFeed.useQuery({ limit: 30, cursor });
  const statsQuery = trpc.familyFeed.getStats.useQuery();

  const items = feedQuery.data?.items ?? [];
  const nextCursor = feedQuery.data?.nextCursor;
  const stats = statsQuery.data ?? [];

  const totalEvents = stats.reduce((sum, s) => sum + Number(s.count), 0);
  const totalXp = stats.reduce((sum, s) => sum + Number(s.totalXp), 0);

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
          <Activity className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Family Activity Feed</h1>
          <p className="text-muted-foreground text-sm">Celebrate your family's achievements together</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{totalEvents}</p>
            <p className="text-xs text-muted-foreground">Events This Week</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{totalXp}</p>
            <p className="text-xs text-muted-foreground">XP Earned</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {stats.find((s) => s.eventType === "badge_earned")?.count ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Badges Earned</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {stats.find((s) => s.eventType === "challenge_won")?.count ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Challenges Won</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feedQuery.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No activity yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                When your children complete tasks, earn badges, or win challenges, it will show up here!
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item, idx) => {
                const config = EVENT_CONFIG[item.eventType] ?? EVENT_CONFIG.task_completed;
                const Icon = config.icon;
                return (
                  <div
                    key={item.id}
                    className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    {/* Icon */}
                    <div className={`h-10 w-10 rounded-full ${config.bgColor} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm leading-tight">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          {getRelativeTime(item.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {item.studentName ?? "Student"}
                        </Badge>
                        {item.xpEarned && item.xpEarned > 0 ? (
                          <span className="text-xs text-amber-600 font-medium">+{item.xpEarned} XP</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Load More */}
              {nextCursor && (
                <div className="pt-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCursor(nextCursor)}
                    disabled={feedQuery.isFetching}
                  >
                    {feedQuery.isFetching ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
