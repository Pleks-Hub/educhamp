import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Lock,
  PlayCircle,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";

function getMasteryColor(score: number): string {
  if (score < 60) return "text-red-500";
  if (score < 75) return "text-orange-500";
  if (score < 90) return "text-yellow-600";
  if (score < 100) return "text-green-600";
  return "text-blue-600";
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

function getStatusIcon(status: string) {
  switch (status) {
    case "completed": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "quiz_unlocked": return <Star className="h-4 w-4 text-yellow-500" />;
    case "in_progress": return <PlayCircle className="h-4 w-4 text-blue-500" />;
    default: return <Lock className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: dashboard, isLoading } = trpc.progress.getDashboard.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: diagnostic } = trpc.diagnostic.getLatestAttempt.useQuery(undefined, {
    enabled: !!user,
  });

  const firstName = user?.name?.split(" ")[0] ?? "Student";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 page-enter">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const activeUnit = dashboard?.units.find((u) => u.status === "in_progress" || u.status === "quiz_unlocked");
  const nextUnit = dashboard?.units.find((u) => u.status === "locked");

  return (
    <div className="p-6 space-y-6 page-enter max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Algebra I · Katy ISD · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        {!diagnostic && (
          <Button
            onClick={() => setLocation("/diagnostic")}
            variant="outline"
            className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
          >
            <ClipboardList className="h-4 w-4" />
            Take Placement Test
          </Button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{dashboard?.overallMastery ?? 0}%</p>
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
                <p className="text-2xl font-bold text-foreground">{dashboard?.completedUnits ?? 0}</p>
                <p className="text-xs text-muted-foreground">Units Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{dashboard?.inProgressUnits ?? 0}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
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
                <p className="text-2xl font-bold text-foreground">{dashboard?.mastery.filter((m) => m.score >= 90).length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Skills Mastered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Continue Learning */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Continue Learning</h2>

          {activeUnit ? (
            <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setLocation(`/curriculum/unit/${activeUnit.unitNumber}`)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs font-medium">
                        Unit {activeUnit.unitNumber}
                      </Badge>
                      {activeUnit.status === "quiz_unlocked" && (
                        <Badge className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200">
                          Quiz Ready
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground text-base leading-tight mb-2">{activeUnit.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                      <span>{activeUnit.lessonsCompleted}/{activeUnit.totalLessons || "—"} lessons</span>
                      {activeUnit.quizScore !== null && (
                        <span>Quiz: {activeUnit.quizScore}%</span>
                      )}
                    </div>
                    <Progress
                      value={activeUnit.totalLessons > 0 ? (activeUnit.lessonsCompleted / activeUnit.totalLessons) * 100 : 0}
                      className="h-1.5"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" className="gap-1.5 group-hover:gap-2 transition-all">
                      Continue
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border shadow-sm">
              <CardContent className="p-5 text-center">
                <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground mb-1">Ready to start?</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {diagnostic ? "Begin Unit 1 to start your Algebra I journey." : "Take the placement test to find your starting point."}
                </p>
                <Button
                  size="sm"
                  onClick={() => setLocation(diagnostic ? "/curriculum" : "/diagnostic")}
                >
                  {diagnostic ? "Browse Curriculum" : "Take Placement Test"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* All 12 Units Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">All 12 Units</h3>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={() => setLocation("/curriculum")}>
                Browse Curriculum <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(dashboard?.units ?? []).map((unit) => (
                <div
                  key={unit.id}
                  className={`relative p-3 rounded-lg border transition-all cursor-pointer group ${
                    unit.status === "locked"
                      ? "opacity-50 cursor-default bg-muted/20 border-dashed"
                      : "hover:shadow-md hover:border-primary/30 bg-card"
                  }`}
                  onClick={() => unit.status !== "locked" && setLocation(`/curriculum/unit/${unit.unitNumber}`)}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {getStatusIcon(unit.status)}
                    <span className="text-xs font-bold text-muted-foreground">U{unit.unitNumber}</span>
                  </div>
                  <p className="text-xs font-medium text-foreground leading-tight line-clamp-2 mb-2">{unit.title}</p>
                  {unit.quizScore !== null ? (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${getMasteryBadgeClass(unit.quizScore)}`}>
                      {getMasteryLabel(unit.quizScore)}
                    </span>
                  ) : unit.status !== "locked" ? (
                    <span className="text-xs text-muted-foreground">In progress</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Locked</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Next Steps */}
          {dashboard && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Recommended Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {(() => {
                  const steps: { label: string; action: string; path: string; variant: "default" | "outline" }[] = [];
                  if (!diagnostic) {
                    steps.push({ label: "Take the placement diagnostic", action: "Start", path: "/diagnostic", variant: "default" });
                  }
                  const lowMastery = dashboard.mastery.filter((m) => m.score < 60);
                  if (lowMastery.length > 0) {
                    steps.push({ label: `Remediate ${lowMastery.length} skill${lowMastery.length > 1 ? "s" : ""} below 60%`, action: "Open Tutor", path: "/tutor", variant: "outline" });
                  }
                  if (activeUnit?.status === "quiz_unlocked") {
                    steps.push({ label: `Take the Unit ${activeUnit.unitNumber} quiz`, action: "Take Quiz", path: `/quiz/${activeUnit.unitNumber}`, variant: "default" });
                  } else if (activeUnit) {
                    steps.push({ label: `Continue Unit ${activeUnit.unitNumber}: ${activeUnit.title}`, action: "Continue", path: `/curriculum/unit/${activeUnit.unitNumber}`, variant: "default" });
                  }
                  if (steps.length === 0) {
                    steps.push({ label: "Explore the full curriculum", action: "Browse", path: "/curriculum", variant: "outline" });
                  }
                  return steps.slice(0, 3).map((step, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/30">
                      <p className="text-xs text-foreground leading-tight flex-1">{step.label}</p>
                      <Button
                        size="sm"
                        variant={step.variant}
                        className="h-7 text-xs shrink-0"
                        onClick={() => setLocation(step.path)}
                      >
                        {step.action}
                      </Button>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* AI Tutor CTA */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-5 w-5" />
                <span className="font-semibold text-sm">AI Tutor</span>
              </div>
              <p className="text-sm opacity-90 mb-4 leading-relaxed">
                Get personalized help, practice problems, and exam review from your AI tutor.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full bg-white/20 hover:bg-white/30 text-primary-foreground border-0"
                onClick={() => setLocation("/tutor")}
              >
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Open AI Tutor
              </Button>
            </CardContent>
          </Card>

          {/* Mastery Overview */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Skill Mastery
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {dashboard?.mastery.slice(0, 5).map((m) => (
                <div key={m.skillId} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono w-24 shrink-0 truncate">{m.skillId}</span>
                  <Progress value={m.score} className="h-1.5 flex-1" />
                  <span className={`text-xs font-semibold w-8 text-right ${getMasteryColor(m.score)}`}>
                    {m.score}%
                  </span>
                </div>
              ))}
              {(dashboard?.mastery.length ?? 0) === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Complete quizzes to track skill mastery
                </p>
              )}
              {(dashboard?.mastery.length ?? 0) > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground mt-1"
                  onClick={() => setLocation("/progress")}
                >
                  View all skills
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Diagnostic Result */}
          {diagnostic && (
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Placement Result</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {(diagnostic as any).placementRecommendation}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Score:</span>
                  <span className={`text-xs font-bold ${getMasteryColor((diagnostic as any).overallScore)}`}>
                    {(diagnostic as any).overallScore}%
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getMasteryBadgeClass((diagnostic as any).overallScore)}`}>
                    {getMasteryLabel((diagnostic as any).overallScore)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
