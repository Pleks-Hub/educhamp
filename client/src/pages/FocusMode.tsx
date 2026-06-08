import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Timer, Play, Pause, Square, Star, Zap, Trophy, Flame,
  Clock, TreePine, Sprout, Leaf, ChevronRight, RotateCcw
} from "lucide-react";

// ─── Duration presets ────────────────────────────────────────────────────────

const PRESETS = [
  { minutes: 15, label: "15 min", xp: 25, icon: Sprout, color: "text-green-500" },
  { minutes: 25, label: "25 min", xp: 50, icon: Leaf, color: "text-emerald-500" },
  { minutes: 45, label: "45 min", xp: 100, icon: TreePine, color: "text-teal-600" },
  { minutes: 60, label: "60 min", xp: 150, icon: Trophy, color: "text-amber-500" },
];

type TimerState = "idle" | "running" | "paused" | "completed";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function FocusMode() {
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const utils = trpc.useUtils();

  const { data: todayStats } = trpc.focusMode.todayStats.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const { data: history } = trpc.focusMode.history.useQuery({ limit: 10 });

  const completeSession = trpc.focusMode.complete.useMutation({
    onSuccess: (data) => {
      if (data.xpAwarded > 0) {
        toast.success(`Session complete! +${data.xpAwarded} XP earned!`, {
          icon: <Star className="h-4 w-4 text-amber-500" />,
        });
      } else if (data.dailyCapReached) {
        toast.info("Great focus! You've reached today's XP cap for focus sessions.");
      } else {
        toast.success("Session recorded!");
      }
      utils.focusMode.todayStats.invalidate();
      utils.focusMode.history.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Timer logic
  const startTimer = useCallback((minutes: number) => {
    setSelectedPreset(minutes);
    setTotalTime(minutes * 60);
    setTimeLeft(minutes * 60);
    setTimerState("running");
    startTimeRef.current = Date.now();
  }, []);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerState("paused");
  }, []);

  const resumeTimer = useCallback(() => {
    setTimerState("running");
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Calculate elapsed minutes
    const elapsed = Math.round((totalTime - timeLeft) / 60);
    setElapsedMinutes(elapsed);

    if (elapsed >= 5) {
      // Award partial credit
      completeSession.mutate({ durationMinutes: elapsed, interrupted: true });
    } else {
      toast.info("Session too short for XP. Try at least 5 minutes!");
    }

    setTimerState("idle");
    setSelectedPreset(null);
    setTimeLeft(0);
    setTotalTime(0);
  }, [totalTime, timeLeft, completeSession]);

  // Timer tick effect
  useEffect(() => {
    if (timerState !== "running") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer complete!
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setTimerState("completed");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerState]);

  // Handle completion
  useEffect(() => {
    if (timerState === "completed" && selectedPreset) {
      completeSession.mutate({ durationMinutes: selectedPreset, interrupted: false });
      // Reset after a moment
      const t = setTimeout(() => {
        setTimerState("idle");
        setSelectedPreset(null);
        setTimeLeft(0);
        setTotalTime(0);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [timerState, selectedPreset, completeSession]);

  // Progress percentage
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  // Growth stage based on progress
  const getGrowthStage = () => {
    if (progress < 25) return { icon: Sprout, label: "Sprouting", color: "text-green-400" };
    if (progress < 50) return { icon: Leaf, label: "Growing", color: "text-green-500" };
    if (progress < 75) return { icon: TreePine, label: "Flourishing", color: "text-emerald-500" };
    return { icon: TreePine, label: "Majestic", color: "text-teal-600" };
  };

  const growth = getGrowthStage();
  const GrowthIcon = growth.icon;

  return (
    <div className="container max-w-2xl py-4 sm:py-6 px-3 sm:px-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Timer className="h-6 w-6 text-primary" />
          Focus Mode
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Stay focused, earn XP. Your focus grows like a tree!
        </p>
      </div>

      {/* Today's Stats */}
      {todayStats && (
        <div className="flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">{todayStats.sessionsToday}/{todayStats.dailySessionCap} sessions</span>
          </div>
          <div className="h-4 w-px bg-emerald-300/50" />
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">{todayStats.minutesToday} min today</span>
          </div>
          <div className="h-4 w-px bg-emerald-300/50" />
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
            <span className="text-sm font-bold text-amber-600">{todayStats.xpToday} XP</span>
          </div>
        </div>
      )}

      {/* Timer Area */}
      {timerState === "idle" ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Choose your focus duration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {PRESETS.map((preset) => {
                const PresetIcon = preset.icon;
                const isDisabled = todayStats && todayStats.sessionsToday >= todayStats.dailySessionCap;
                return (
                  <button
                    key={preset.minutes}
                    disabled={!!isDisabled}
                    onClick={() => startTimer(preset.minutes)}
                    className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md hover:border-primary/50 active:scale-[0.97] ${
                      isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/30 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <PresetIcon className={`h-5 w-5 ${preset.color}`} />
                      <span className="text-lg font-bold">{preset.label}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <Star className="h-3 w-3 fill-amber-400" />
                      <span className="font-medium">+{preset.xp} XP</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {todayStats && todayStats.sessionsToday >= todayStats.dailySessionCap && (
              <p className="text-center text-sm text-muted-foreground">
                You've reached today's session cap. Come back tomorrow!
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="py-8 text-center space-y-6">
            {/* Growth visualization */}
            <div className="flex flex-col items-center gap-3">
              <div className={`relative inline-flex items-center justify-center w-32 h-32 rounded-full border-4 ${
                timerState === "completed"
                  ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                  : "border-primary/20 bg-muted/30"
              }`}>
                {timerState === "completed" ? (
                  <Trophy className="h-16 w-16 text-amber-500 animate-bounce" />
                ) : (
                  <GrowthIcon className={`h-16 w-16 ${growth.color} transition-all duration-500`} />
                )}
                {/* Circular progress indicator */}
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128">
                  <circle
                    cx="64" cy="64" r="58"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-muted/30"
                  />
                  <circle
                    cx="64" cy="64" r="58"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 58}`}
                    strokeDashoffset={`${2 * Math.PI * 58 * (1 - progress / 100)}`}
                    className="text-primary transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {timerState === "completed" ? (
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-amber-600">Session Complete!</p>
                  <p className="text-sm text-muted-foreground">Great focus! XP is being awarded...</p>
                </div>
              ) : (
                <>
                  <p className="text-4xl font-mono font-bold tracking-wider">
                    {formatTime(timeLeft)}
                  </p>
                  <p className={`text-sm font-medium ${growth.color}`}>
                    {growth.label}
                  </p>
                </>
              )}
            </div>

            {/* Controls */}
            {timerState !== "completed" && (
              <div className="flex items-center justify-center gap-3">
                {timerState === "running" ? (
                  <Button variant="outline" size="lg" onClick={pauseTimer} className="gap-2">
                    <Pause className="h-4 w-4" /> Pause
                  </Button>
                ) : (
                  <Button size="lg" onClick={resumeTimer} className="gap-2">
                    <Play className="h-4 w-4" /> Resume
                  </Button>
                )}
                <Button variant="destructive" size="lg" onClick={stopTimer} className="gap-2">
                  <Square className="h-4 w-4" /> Stop
                </Button>
              </div>
            )}

            {/* XP indicator */}
            {selectedPreset && timerState !== "completed" && (
              <div className="flex items-center justify-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                <Star className="h-4 w-4 fill-amber-400" />
                <span className="font-medium">
                  +{PRESETS.find(p => p.minutes === selectedPreset)?.xp ?? 0} XP on completion
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Session History */}
      {history && history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {history.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  session.interrupted
                    ? "bg-orange-100 dark:bg-orange-900/30"
                    : "bg-green-100 dark:bg-green-900/30"
                }`}>
                  {session.interrupted ? (
                    <Pause className="h-3.5 w-3.5 text-orange-600" />
                  ) : (
                    <TreePine className="h-3.5 w-3.5 text-green-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {session.durationMinutes} min {session.interrupted ? "(interrupted)" : ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(session.completedAt).toLocaleString(undefined, {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                    })}
                  </p>
                </div>
                {session.xpAwarded > 0 && (
                  <Badge variant="secondary" className="text-[10px] text-amber-600">
                    <Star className="h-2.5 w-2.5 mr-0.5 fill-amber-400" />
                    +{session.xpAwarded}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <div className="p-4 rounded-xl bg-muted/30 border">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-primary" />
          Focus Tips
        </h3>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li className="flex items-start gap-1.5">
            <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
            Put your phone face-down or in another room
          </li>
          <li className="flex items-start gap-1.5">
            <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
            Start with 15 minutes and work your way up
          </li>
          <li className="flex items-start gap-1.5">
            <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
            Take a 5-minute break between sessions
          </li>
          <li className="flex items-start gap-1.5">
            <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
            Complete all {todayStats?.dailySessionCap ?? 4} daily sessions for maximum XP!
          </li>
        </ul>
      </div>
    </div>
  );
}
