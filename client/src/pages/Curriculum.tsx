import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Lock,
  PlayCircle,
  Star,
  Trophy,
} from "lucide-react";
import { CourseContextBanner } from "@/components/CourseContextBanner";

const SUBJECT_LABELS: Record<string, string> = {
  math: "Mathematics",
  english: "English Language Arts",
  science: "Science",
  social_studies: "Social Studies",
  language: "World Language",
  business: "Business & Finance",
  test_prep: "Test Preparation",
  other: "",
};

function getStatusConfig(status: string) {
  switch (status) {
    case "completed":
      return { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50", label: "Completed", border: "border-green-200" };
    case "quiz_unlocked":
      return { icon: Star, color: "text-yellow-500", bg: "bg-yellow-50", label: "Quiz Ready", border: "border-yellow-200" };
    case "in_progress":
      return { icon: PlayCircle, color: "text-blue-500", bg: "bg-blue-50", label: "In Progress", border: "border-blue-200" };
    default:
      return { icon: Lock, color: "text-muted-foreground", bg: "bg-muted/30", label: "Locked", border: "border-border" };
  }
}

export default function Curriculum() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: dashboard, isLoading } = trpc.progress.getDashboard.useQuery(undefined, { enabled: !!user });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 page-enter">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const units = dashboard?.units ?? [];
  const courseTitle = dashboard?.courseTitle ?? "Curriculum";
  const totalUnits = dashboard?.totalUnits ?? units.length;
  const courseSubject = dashboard?.courseSubject ?? "other";
  const courseGradeLevel = dashboard?.courseGradeLevel ?? "";
  const courseTeksCode = dashboard?.courseTeksCode ?? null;

  // Human-readable grade label
  const gradeLabel =
    courseGradeLevel === "AP"
      ? "AP / Advanced"
      : courseGradeLevel
      ? `Grade ${courseGradeLevel}`
      : "";
  const subjectLabel = SUBJECT_LABELS[courseSubject] ?? courseSubject;
  const teksLabel = courseTeksCode ? `${courseTeksCode}` : "TEKS-aligned";

  // Subtitle parts: e.g. "Grade 9 · Mathematics · TEKS 111.39"
  const subtitleParts = [gradeLabel, subjectLabel, teksLabel].filter(Boolean);

  return (
    <div className="p-6 space-y-6 page-enter max-w-6xl">
      <CourseContextBanner />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <button onClick={() => setLocation("/")} className="hover:text-foreground transition-colors">
          Dashboard
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{courseTitle}</span>
      </nav>

      {/* Course Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-foreground">{courseTitle}</h1>
          {courseGradeLevel === "AP" && (
            <Badge variant="secondary" className="text-xs font-semibold bg-violet-100 text-violet-700 border-violet-200">
              AP
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {totalUnits} units · {subtitleParts.join(" · ")}
        </p>
      </div>

      {/* Progress Summary */}
      <div className="flex items-center gap-6 p-4 bg-muted/30 rounded-xl border">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <div>
            <p className="text-sm font-semibold">{dashboard?.completedUnits ?? 0} / {totalUnits}</p>
            <p className="text-xs text-muted-foreground">Units Complete</p>
          </div>
        </div>
        <div className="flex-1">
          <Progress
            value={totalUnits > 0 ? ((dashboard?.completedUnits ?? 0) / totalUnits) * 100 : 0}
            className="h-2"
          />
        </div>
        <div className="text-sm font-semibold text-foreground">
          {totalUnits > 0 ? Math.round(((dashboard?.completedUnits ?? 0) / totalUnits) * 100) : 0}%
        </div>
      </div>

      {/* Units Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {units.map((unit) => {
          const config = getStatusConfig(unit.status);
          const StatusIcon = config.icon;
          const isLocked = unit.status === "locked";

          return (
            <Card
              key={unit.id}
              className={`border transition-all duration-200 ${
                isLocked
                  ? "opacity-70 cursor-default"
                  : "hover:shadow-md cursor-pointer hover:-translate-y-0.5"
              } ${config.border}`}
              onClick={() => !isLocked && setLocation(`/curriculum/unit/${unit.unitNumber}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Unit {unit.unitNumber}
                    </span>
                    <div className={`h-5 w-5 rounded-full ${config.bg} flex items-center justify-center`}>
                      <StatusIcon className={`h-3 w-3 ${config.color}`} />
                    </div>
                  </div>
                  {unit.quizScore !== null && (
                    <span className="text-xs font-bold text-foreground">{unit.quizScore}%</span>
                  )}
                </div>

                <h3 className="font-semibold text-foreground text-sm leading-tight mb-3 line-clamp-2">
                  {unit.title}
                </h3>

                {unit.status !== "locked" && (
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{Math.min(unit.lessonsCompleted, unit.totalLessons)}/{unit.totalLessons || "—"} lessons</span>
                      <span className={`font-medium ${config.color}`}>{config.label}</span>
                    </div>
                    {unit.totalLessons > 0 && (
                      <Progress
                        value={(Math.min(unit.lessonsCompleted, unit.totalLessons) / unit.totalLessons) * 100}
                        className="h-1"
                      />
                    )}
                  </div>
                )}

                {unit.status === "locked" && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <Lock className="h-3 w-3" />
                    <span>Complete previous unit to unlock</span>
                  </div>
                )}

                {!isLocked && (
                  <Button
                    size="sm"
                    variant={unit.status === "quiz_unlocked" ? "default" : "outline"}
                    className="w-full gap-1.5 text-xs h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (unit.status === "quiz_unlocked") {
                        setLocation(`/curriculum/unit/${unit.unitNumber}/quiz`);
                      } else {
                        setLocation(`/curriculum/unit/${unit.unitNumber}`);
                      }
                    }}
                  >
                    {unit.status === "quiz_unlocked" ? (
                      <>
                        <Star className="h-3 w-3" />
                        Take Quiz
                      </>
                    ) : unit.status === "completed" ? (
                      <>
                        <BookOpen className="h-3 w-3" />
                        Review
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-3 w-3" />
                        Continue
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
