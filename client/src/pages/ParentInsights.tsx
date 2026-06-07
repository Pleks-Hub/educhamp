/**
 * ParentInsights — analytics tab for parents showing trends over time:
 * tasks completed per week, XP growth chart, most productive days.
 */
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, BarChart3, Calendar, Zap, CheckCircle2,
  Flame, Trophy, Clock, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Simple bar chart component ─────────────────────────────────────────────

function BarChart({ data, maxValue, label }: { data: { label: string; value: number }[]; maxValue: number; label: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-end gap-1 h-32">
        {data.map((item, i) => {
          const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-foreground">{item.value || ""}</span>
              <div className="w-full bg-muted rounded-t-sm relative" style={{ height: "100px" }}>
                <div
                  className="absolute bottom-0 w-full bg-primary rounded-t-sm transition-all duration-500"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground truncate w-full text-center">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day-of-week heatmap ────────────────────────────────────────────────────

function DayHeatmap({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="grid grid-cols-7 gap-2">
      {data.map((d, i) => {
        const intensity = d.count / max;
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center text-xs font-semibold transition-colors",
                intensity === 0 ? "bg-muted text-muted-foreground" :
                intensity < 0.33 ? "bg-emerald-100 text-emerald-700" :
                intensity < 0.66 ? "bg-emerald-300 text-emerald-800" :
                "bg-emerald-500 text-white"
              )}
            >
              {d.count}
            </div>
            <span className="text-[10px] text-muted-foreground">{d.day}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ParentInsights() {
  const { data: insights, isLoading } = trpc.parentTasks.getInsights.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">No data available yet. Assign tasks to your children to see insights.</p>
      </div>
    );
  }

  const weeklyMax = Math.max(...(insights.weeklyTasks?.map(w => w.value) ?? []), 1);
  const xpMax = Math.max(...(insights.weeklyXp?.map(w => w.value) ?? []), 1);

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Insights</h1>
          <p className="text-sm text-muted-foreground">
            Track your children's task completion trends and identify patterns
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{insights.totalTasksCompleted}</p>
            <p className="text-xs text-muted-foreground">Tasks Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="h-5 w-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{insights.totalXpEarned}</p>
            <p className="text-xs text-muted-foreground">Total XP Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{insights.longestStreak}</p>
            <p className="text-xs text-muted-foreground">Longest Streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{insights.completionRate}%</p>
            <p className="text-xs text-muted-foreground">Completion Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Tasks / Week
          </TabsTrigger>
          <TabsTrigger value="xp" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            XP Growth
          </TabsTrigger>
          <TabsTrigger value="days" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Best Days
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tasks Completed Per Week</CardTitle>
            </CardHeader>
            <CardContent>
              {insights.weeklyTasks && insights.weeklyTasks.length > 0 ? (
                <BarChart data={insights.weeklyTasks} maxValue={weeklyMax} label="Last 8 weeks" />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="xp">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">XP Earned Per Week</CardTitle>
            </CardHeader>
            <CardContent>
              {insights.weeklyXp && insights.weeklyXp.length > 0 ? (
                <BarChart data={insights.weeklyXp} maxValue={xpMax} label="Last 8 weeks" />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="days">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Most Productive Days</CardTitle>
              <p className="text-xs text-muted-foreground">Tasks completed by day of week (last 30 days)</p>
            </CardHeader>
            <CardContent>
              {insights.dayOfWeek && insights.dayOfWeek.length > 0 ? (
                <DayHeatmap data={insights.dayOfWeek} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Per-child breakdown */}
      {insights.perChild && insights.perChild.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Per-Child Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.perChild.map((child, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {child.name?.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{child.name}</p>
                      <p className="text-xs text-muted-foreground">{child.tasksCompleted} tasks · {child.xpEarned} XP</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Flame className="h-3 w-3 mr-1 text-orange-500" />
                      {child.currentStreak}d streak
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
