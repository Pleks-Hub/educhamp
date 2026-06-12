import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Trophy, Medal, Crown, Target, Star, BookOpen, CheckCircle2 } from "lucide-react";

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
          <h1 className="text-xl sm:text-2xl font-bold">Family XP Leaderboard</h1>
          <p className="text-sm text-muted-foreground">
            Total XP earned from all academic work — lessons, quizzes, tasks, streaks, and more
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
                  <p className="text-sm text-muted-foreground">Your Total XP</p>
                  <p className="text-xl sm:text-2xl font-bold">{(myStats.totalXp ?? 0).toLocaleString()} XP</p>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Task XP</p>
                  <p className="text-lg font-bold text-green-600">{myStats.taskXp.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Tasks Done</p>
                  <p className="text-lg font-bold text-blue-600">{myStats.tasksCompleted}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Rank</p>
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
            Family Rankings
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Ranked by total XP earned from all sources (lessons, quizzes, tasks, streaks, badges, and more)
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Star className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">
                No XP data yet. Start learning to appear on the leaderboard!
              </p>
              <p className="text-sm text-muted-foreground">
                Complete lessons, quizzes, and tasks to earn XP.
              </p>
            </div>
          ) : (
            leaderboard.map((entry: any) => (
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
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      Lv.{entry.currentLevel}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {entry.tasksCompleted} task{entry.tasksCompleted !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {entry.taskXp.toLocaleString()} task XP
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <div className="flex items-center gap-1">
                    <Zap className="h-4 w-4 text-purple-500" />
                    <span className="font-bold text-lg">{entry.totalXp.toLocaleString()}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Total XP</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* XP Sources Explanation */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <p className="text-sm font-medium text-foreground mb-2">How XP is earned:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><BookOpen className="h-3 w-3 text-blue-500" /> Lessons completed</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-500" /> Quizzes passed</span>
            <span className="flex items-center gap-1.5"><Target className="h-3 w-3 text-purple-500" /> Tasks finished</span>
            <span className="flex items-center gap-1.5"><Star className="h-3 w-3 text-yellow-500" /> Badges earned</span>
            <span className="flex items-center gap-1.5"><Zap className="h-3 w-3 text-orange-500" /> Daily streaks</span>
            <span className="flex items-center gap-1.5"><Trophy className="h-3 w-3 text-amber-500" /> Quests completed</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
