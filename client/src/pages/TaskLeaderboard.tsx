import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Trophy, Medal, Crown, Target, Star } from "lucide-react";

export default function TaskLeaderboard() {
  const { data, isLoading } = trpc.gamification.getTaskLeaderboard.useQuery({ limit: 20 });

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const leaderboard = data?.leaderboard ?? [];
  const myRank = data?.myRank;
  const myStats = data?.myStats;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
  };

  const getRankBg = (rank: number, isMe: boolean) => {
    if (isMe) return "bg-primary/10 border-primary/30";
    if (rank === 1) return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800";
    if (rank === 2) return "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700";
    if (rank === 3) return "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800";
    return "";
  };

  return (
    <div className="container max-w-2xl py-4 sm:py-8 px-3 sm:px-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <Trophy className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Task XP Leaderboard</h1>
          <p className="text-sm text-muted-foreground">
            See how your task XP compares to your siblings
          </p>
        </div>
      </div>

      {/* My Stats Card */}
      {myStats && (
        <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50">
                  <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Task XP</p>
                  <p className="text-xl sm:text-2xl font-bold">{myStats.taskXp.toLocaleString()} XP</p>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Tasks Done</p>
                  <p className="text-xl font-bold text-green-600">{myStats.tasksCompleted}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Your Rank</p>
                  <p className="text-2xl font-bold text-purple-600">
                    #{myRank ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Family Task Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Star className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">
                No task data yet. Complete tasks to appear on the leaderboard!
              </p>
              <p className="text-sm text-muted-foreground">
                Ask your parent to assign you some tasks to get started.
              </p>
            </div>
          ) : (
            leaderboard.map((entry) => (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${getRankBg(entry.rank, entry.isMe)}`}
              >
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(entry.rank)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {entry.isMe ? "You" : entry.name}
                    </span>
                    {entry.isMe && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {entry.tasksCompleted} task{entry.tasksCompleted !== 1 ? "s" : ""} completed
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Zap className="h-4 w-4 text-purple-500" />
                  <span className="font-bold text-lg">{entry.taskXp.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">XP</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Motivational footer */}
      <div className="text-center text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
        <p className="font-medium">💡 Pro tip: Complete tasks daily to earn more XP and climb the rankings!</p>
        <p className="mt-1">Tasks with higher difficulty give more XP. Ask your parent for bonus challenges!</p>
      </div>
    </div>
  );
}
