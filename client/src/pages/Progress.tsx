import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import {
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  Lock,
  PlayCircle,
  Star,
  Target,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { getLoginUrl } from "@/const";

function getMasteryColor(score: number): string {
  if (score < 60) return "#ef4444";
  if (score < 75) return "#f97316";
  if (score < 90) return "#eab308";
  if (score < 100) return "#22c55e";
  return "#3b82f6";
}

function getMasteryLabel(score: number): string {
  if (score < 60) return "Beginner";
  if (score < 75) return "Developing";
  if (score < 90) return "Approaching";
  if (score < 100) return "Mastered";
  return "Advanced";
}

function getMasteryBadgeClass(score: number): string {
  if (score < 60) return "mastery-beginner";
  if (score < 75) return "mastery-developing";
  if (score < 90) return "mastery-approaching";
  if (score < 100) return "mastery-mastered";
  return "mastery-advanced";
}

export default function ProgressPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: dashboard, isLoading: dashLoading } = trpc.progress.getDashboard.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: masteryData, isLoading: masteryLoading } = trpc.progress.getMastery.useQuery(undefined, {
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">Sign in to view progress</h2>
          <Button onClick={() => { window.location.href = getLoginUrl(); }}>Sign in</Button>
        </div>
      </div>
    );
  }

  if (dashLoading || masteryLoading) {
    return (
      <div className="p-6 space-y-4 page-enter">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // Prepare chart data
  const unitChartData = (dashboard?.units ?? []).map((u) => ({
    name: `U${u.unitNumber}`,
    score: u.quizScore ?? 0,
    status: u.status,
    title: u.title,
  }));

  const masteryByUnit: Record<number, { total: number; sum: number; count: number }> = {};
  (masteryData ?? []).forEach((m) => {
    const unitNum = parseInt(m.skillId.split("-")[1]?.replace("U", "") ?? "0", 10);
    if (!masteryByUnit[unitNum]) masteryByUnit[unitNum] = { total: 0, sum: 0, count: 0 };
    masteryByUnit[unitNum].sum += m.score;
    masteryByUnit[unitNum].count += 1;
    masteryByUnit[unitNum].total = Math.round(masteryByUnit[unitNum].sum / masteryByUnit[unitNum].count);
  });

  const overallMastery = dashboard?.overallMastery ?? 0;
  const radialData = [{ name: "Mastery", value: overallMastery, fill: getMasteryColor(overallMastery) }];

  // Group mastery by level
  const masteryGroups = {
    advanced: (masteryData ?? []).filter((m) => m.score >= 100).length,
    mastered: (masteryData ?? []).filter((m) => m.score >= 90 && m.score < 100).length,
    approaching: (masteryData ?? []).filter((m) => m.score >= 75 && m.score < 90).length,
    developing: (masteryData ?? []).filter((m) => m.score >= 60 && m.score < 75).length,
    beginner: (masteryData ?? []).filter((m) => m.score < 60).length,
  };

  return (
    <div className="p-6 space-y-6 page-enter max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Progress & Mastery</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {user.name}'s {dashboard?.courseTitle ?? ""} learning journey
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallMastery}%</p>
                <p className="text-xs text-muted-foreground">Overall Mastery</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard?.completedUnits ?? 0}</p>
                <p className="text-xs text-muted-foreground">Units Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{masteryGroups.mastered + masteryGroups.advanced}</p>
                <p className="text-xs text-muted-foreground">Skills Mastered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(masteryData ?? []).length}</p>
                <p className="text-xs text-muted-foreground">Skills Tracked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Radial Progress */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Overall Mastery</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="flex flex-col items-center">
                  <div className="relative h-40 w-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="70%"
                        outerRadius="90%"
                        data={radialData}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar
                          background={{ fill: "hsl(var(--muted))" }}
                          dataKey="value"
                          cornerRadius={8}
                          fill={getMasteryColor(overallMastery)}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-foreground">{overallMastery}%</span>
                      <span className="text-xs text-muted-foreground">{getMasteryLabel(overallMastery)}</span>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 w-full text-center">
                    <div className="p-2 bg-muted/30 rounded-lg">
                      <p className="text-lg font-bold text-foreground">{dashboard?.completedUnits ?? 0}/{dashboard?.totalUnits ?? 12}</p>
                      <p className="text-xs text-muted-foreground">Units</p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded-lg">
                      <p className="text-lg font-bold text-foreground">{(masteryData ?? []).length}</p>
                      <p className="text-xs text-muted-foreground">Skills</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mastery Distribution */}
            <Card className="border shadow-sm lg:col-span-2">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Mastery Distribution</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                {[
                  { label: "Advanced", count: masteryGroups.advanced, color: "bg-blue-500", max: (masteryData ?? []).length || 1 },
                  { label: "Mastered", count: masteryGroups.mastered, color: "bg-green-500", max: (masteryData ?? []).length || 1 },
                  { label: "Approaching", count: masteryGroups.approaching, color: "bg-yellow-500", max: (masteryData ?? []).length || 1 },
                  { label: "Developing", count: masteryGroups.developing, color: "bg-orange-500", max: (masteryData ?? []).length || 1 },
                  { label: "Beginner", count: masteryGroups.beginner, color: "bg-red-500", max: (masteryData ?? []).length || 1 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">{item.label}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                        style={{ width: `${(item.count / item.max) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-foreground w-6 text-right">{item.count}</span>
                  </div>
                ))}
                {(masteryData ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Complete unit quizzes to see your mastery distribution.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recommended Next Steps */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Recommended Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              {(() => {
                const steps = [];
                const inProgress = dashboard?.units.find((u) => u.status === "in_progress");
                const quizReady = dashboard?.units.find((u) => u.status === "quiz_unlocked");
                const lowSkills = (masteryData ?? []).filter((m) => m.score < 60).slice(0, 3);

                if (quizReady) {
                  steps.push({
                    icon: Star,
                    color: "text-yellow-600",
                    bg: "bg-yellow-50",
                    text: `Take the Unit ${quizReady.unitNumber} quiz — you've unlocked it!`,
                    action: () => setLocation(`/curriculum/unit/${quizReady.unitNumber}/quiz`),
                    cta: "Take Quiz",
                  });
                }
                if (inProgress) {
                  steps.push({
                    icon: BookOpen,
                    color: "text-blue-600",
                    bg: "bg-blue-50",
                    text: `Continue Unit ${inProgress.unitNumber}: ${inProgress.title}`,
                    action: () => setLocation(`/curriculum/unit/${inProgress.unitNumber}`),
                    cta: "Continue",
                  });
                }
                if (lowSkills.length > 0) {
                  steps.push({
                    icon: Target,
                    color: "text-red-600",
                    bg: "bg-red-50",
                    text: `${lowSkills.length} skill${lowSkills.length > 1 ? "s" : ""} need remediation: ${lowSkills.map((s) => s.skillId).join(", ")}`,
                    action: () => setLocation("/tutor"),
                    cta: "Get Help",
                  });
                }
                if (steps.length === 0) {
                  steps.push({
                    icon: Trophy,
                    color: "text-amber-600",
                    bg: "bg-amber-50",
                    text: `Great work! Start Unit 1 to begin your ${dashboard?.courseTitle ?? "course"} journey.`,
                    action: () => setLocation("/curriculum"),
                    cta: "Start Now",
                  });
                }
                return steps.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${step.bg}`}>
                      <Icon className={`h-4 w-4 ${step.color} shrink-0`} />
                      <p className="text-sm text-foreground flex-1">{step.text}</p>
                      <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={step.action}>
                        {step.cta}
                      </Button>
                    </div>
                  );
                });
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Units Tab */}
        <TabsContent value="units" className="mt-4 space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Quiz Scores by Unit</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-5">
              {unitChartData.some((d) => d.score > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={unitChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, "Score"]}
                      labelFormatter={(label) => {
                        const unit = unitChartData.find((u) => u.name === label);
                        return unit?.title ?? label;
                      }}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {unitChartData.map((entry, index) => (
                        <Cell key={index} fill={getMasteryColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                  Complete unit quizzes to see scores here.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            {(dashboard?.units ?? []).map((unit) => {
              const statusConfig = {
                completed: { icon: CheckCircle2, color: "text-green-500", label: "Completed" },
                quiz_unlocked: { icon: Star, color: "text-yellow-500", label: "Quiz Ready" },
                in_progress: { icon: PlayCircle, color: "text-blue-500", label: "In Progress" },
                locked: { icon: Lock, color: "text-muted-foreground", label: "Locked" },
              }[unit.status] ?? { icon: Lock, color: "text-muted-foreground", label: "Locked" };
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={unit.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors ${
                    unit.status !== "locked" ? "cursor-pointer hover:bg-muted/30" : "opacity-60"
                  }`}
                  onClick={() => unit.status !== "locked" && setLocation(`/curriculum/unit/${unit.unitNumber}`)}
                >
                  <StatusIcon className={`h-4 w-4 ${statusConfig.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">U{unit.unitNumber}</span>
                      <span className="text-sm font-medium text-foreground truncate">{unit.title}</span>
                    </div>
                    {unit.totalLessons > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <Progress
                          value={(unit.lessonsCompleted / unit.totalLessons) * 100}
                          className="h-1 flex-1"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">
                          {unit.lessonsCompleted}/{unit.totalLessons}
                        </span>
                      </div>
                    )}
                  </div>
                  {unit.quizScore !== null && (
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${getMasteryColor(unit.quizScore).replace("text-", "text-")}`}>
                        {unit.quizScore}%
                      </p>
                      <p className="text-xs text-muted-foreground">{getMasteryLabel(unit.quizScore)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="mt-4 space-y-4">
          {(masteryData ?? []).length === 0 ? (
            <Card className="border">
              <CardContent className="p-8 text-center">
                <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground">No skill data yet</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Complete unit quizzes to track your skill mastery.
                </p>
                <Button size="sm" onClick={() => setLocation("/curriculum")}>
                  Browse Curriculum
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(masteryData ?? [])
                .sort((a, b) => a.score - b.score)
                .map((skill) => (
                  <div key={skill.skillId} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-semibold text-primary">{skill.skillId}</span>
                        <span className="text-xs text-muted-foreground truncate">{skill.skillName}</span>
                      </div>
                      <Progress value={skill.score} className="h-1.5" />
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-bold text-foreground">{skill.score}%</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getMasteryBadgeClass(skill.score)}`}>
                        {getMasteryLabel(skill.score)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
