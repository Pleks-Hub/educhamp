import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Trophy, Medal, Crown, TrendingUp } from "lucide-react";

export default function StreakLeaderboard() {
  const { data, isLoading } = trpc.streak.getLeaderboard.useQuery({ limit: 20 });
  const { data: myStats } = trpc.streak.getStats.useQuery();

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
    <div className="container max-w-2xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
          <Trophy className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Streak Leaderboard</h1>
          <p className="text-sm text-muted-foreground">
            See how your practice streak compares to classmates
          </p>
        </div>
      </div>

      {/* My Stats Card */}
      {myStats && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Flame className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Your Current Streak</p>
                  <p className="text-2xl font-bold">{myStats.currentStreak} days</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Your Rank</p>
                <p className="text-2xl font-bold text-primary">
                  #{myRank ?? "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Streaks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {leaderboard.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No streak data yet. Start practicing to appear on the leaderboard!
            </p>
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
                    Best: {entry.longestStreak} days · {entry.totalActiveDays} total active days
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="font-bold text-lg">{entry.currentStreak}</span>
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
