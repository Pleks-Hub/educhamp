import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { GuidedTour } from "@/components/GuidedTour";
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
  RefreshCw,
  BookMarked,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Mathematics": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "English Language Arts": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "Science": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  "Social Studies": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "World Languages": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

function subjectColor(subject?: string | null) {
  return SUBJECT_COLORS[subject ?? ""] ?? { bg: "bg-muted/40", text: "text-muted-foreground", border: "border-muted" };
}

// ─── Course Progress Card ─────────────────────────────────────────────────────

interface CourseCardProps {
  courseId: number;
  courseTitle: string;
  subject?: string | null;
  gradeLevel?: string | null;
  isCurrent: boolean;
  totalUnits: number;
  completedUnits: number;
  inProgressUnits: number;
  progressPercent: number;
  activeUnitTitle?: string | null;
  activeUnitNumber?: number | null;
  lastActivityAt?: Date | null;
  onSwitch: (courseId: number) => void;
  onOpen: (courseId: number) => void;
  isSwitching: boolean;
}

function CourseCard({
  courseId, courseTitle, subject, gradeLevel, isCurrent,
  totalUnits, completedUnits, progressPercent,
  activeUnitTitle, activeUnitNumber,
  lastActivityAt, onSwitch, onOpen, isSwitching,
}: CourseCardProps) {
  const colors = subjectColor(subject);

  return (
    <Card className={`border transition-all duration-200 ${isCurrent ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {isCurrent && (
                <Badge className="text-xs bg-primary text-primary-foreground">Active</Badge>
              )}
              {gradeLevel && (
                <Badge variant="outline" className="text-xs">{gradeLevel}</Badge>
              )}
              {subject && (
                <Badge className={`text-xs border ${colors.bg} ${colors.text} ${colors.border}`}>
                  {subject}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-sm leading-tight text-foreground">{courseTitle}</h3>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedUnits}/{totalUnits} units complete</span>
            <span className="font-medium text-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        {/* Active unit */}
        {activeUnitTitle && (
          <p className="text-xs text-muted-foreground truncate">
            <span className="text-foreground font-medium">Unit {activeUnitNumber}:</span> {activeUnitTitle}
          </p>
        )}

        {/* Last activity */}
        {lastActivityAt && (
          <p className="text-xs text-muted-foreground">
            Last studied: {new Date(lastActivityAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {isCurrent ? (
            <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => onOpen(courseId)}>
              Continue <ArrowRight className="h-3 w-3" />
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs gap-1"
                onClick={() => onSwitch(courseId)}
                disabled={isSwitching}
              >
                {isSwitching ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Switch
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 flex-1" onClick={() => onOpen(courseId)}>
                View <ChevronRight className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: dashboard, isLoading } = trpc.progress.getDashboard.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: allCourseProgress, isLoading: isLoadingCourses } = trpc.progress.getAllCourseProgress.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: diagnostic } = trpc.diagnostic.getLatestAttempt.useQuery(undefined, {
    enabled: !!user,
  });

  const utils = trpc.useUtils();
  const setActiveCourse = trpc.admin.setActiveCourse.useMutation({
    onSuccess: () => {
      utils.progress.getDashboard.invalidate();
      utils.progress.getAllCourseProgress.invalidate();
    },
  });

  const firstName = user?.name?.split(" ")[0] ?? "Student";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const activeUnit = dashboard?.units.find((u) => u.status === "in_progress" || u.status === "quiz_unlocked");
  const enrolledCount = allCourseProgress?.length ?? 0;

  function handleSwitchCourse(courseId: number) {
    setActiveCourse.mutate({ courseId });
  }

  function handleOpenCourse(courseId: number) {
    // Switch to course then navigate to curriculum
    if (courseId !== dashboard?.activeCourseId) {
      setActiveCourse.mutate({ courseId }, {
        onSuccess: () => setLocation("/curriculum"),
      });
    } else {
      setLocation("/curriculum");
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 page-enter">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 page-enter max-w-6xl">
      {/* Guided tour — shown once on first login */}
      <GuidedTour accountType={user?.accountType ?? "student"} />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {dashboard?.courseTitle ?? "EduChamp"} · Katy ISD ·{" "}
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button
            onClick={() => setLocation("/curriculum")}
            variant="default"
            size="sm"
            className="gap-2"
          >
            <BookOpen className="h-4 w-4" />
            My Curriculum
          </Button>
        </div>
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
                <BookMarked className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{enrolledCount}</p>
                <p className="text-xs text-muted-foreground">Enrolled Courses</p>
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
        {/* Left column: Continue Learning + My Courses */}
        <div className="lg:col-span-2 space-y-6">

          {/* Continue Learning — active course */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Continue Learning</h2>
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground"
                onClick={() => setLocation("/curriculum")}>
                View all units <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

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
                        <Badge variant="outline" className="text-xs">
                          {dashboard?.courseTitle}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-foreground text-base leading-tight mb-2">{activeUnit.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                        <span>{activeUnit.lessonsCompleted}/{activeUnit.totalLessons || "—"} lessons</span>
                        {activeUnit.quizScore !== null && (
                          <span>Quiz: {activeUnit.quizScore}%</span>
                        )}
                      </div>
                      <Progress value={activeUnit.totalLessons > 0 ? (activeUnit.lessonsCompleted / activeUnit.totalLessons) * 100 : 0} className="h-1.5" />
                    </div>
                    <Button size="sm" className="shrink-0 gap-1 group-hover:translate-x-0.5 transition-transform">
                      Continue <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : !diagnostic ? (
              <Card className="border border-dashed shadow-sm">
                <CardContent className="p-6 text-center space-y-3">
                  <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto" />
                  <div>
                    <p className="font-medium text-foreground">Start with the Placement Test</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      The diagnostic assessment places you at the right starting point so you don't waste time on content you already know.
                    </p>
                  </div>
                  <Button onClick={() => setLocation("/diagnostic")} className="gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Take Placement Test
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-dashed shadow-sm">
                <CardContent className="p-6 text-center space-y-3">
                  <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto" />
                  <div>
                    <p className="font-medium text-foreground">All units complete!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You've completed all available units in your active course. Enrol in another course to keep learning.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setLocation("/curriculum")} className="gap-2">
                    <BookOpen className="h-4 w-4" />
                    View Curriculum
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* My Courses — multi-course grid */}
          {enrolledCount > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">My Courses</h2>
                <span className="text-xs text-muted-foreground">{enrolledCount} enrolled</span>
              </div>

              {isLoadingCourses ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allCourseProgress?.map((cp) => (
                    <CourseCard
                      key={cp.courseId}
                      courseId={cp.courseId}
                      courseTitle={cp.courseTitle}
                      subject={cp.subject}
                      gradeLevel={cp.gradeLevel}
                      isCurrent={cp.isCurrent}
                      totalUnits={cp.totalUnits}
                      completedUnits={cp.completedUnits}
                      inProgressUnits={cp.inProgressUnits}
                      progressPercent={cp.progressPercent}
                      activeUnitTitle={cp.activeUnitTitle}
                      activeUnitNumber={cp.activeUnitNumber}
                      lastActivityAt={cp.lastActivityAt}
                      onSwitch={handleSwitchCourse}
                      onOpen={handleOpenCourse}
                      isSwitching={setActiveCourse.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: Quick actions + Mastery + Diagnostic */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs"
                onClick={() => setLocation("/tutor")}
              >
                <Brain className="h-3.5 w-3.5 text-purple-500" />
                Ask AI Tutor
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs"
                onClick={() => setLocation("/diagnostic")}
              >
                <ClipboardList className="h-3.5 w-3.5 text-amber-500" />
                {diagnostic ? "Retest Placement" : "Placement Test"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs"
                onClick={() => setLocation("/progress")}
              >
                <Target className="h-3.5 w-3.5 text-green-500" />
                View Progress
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
