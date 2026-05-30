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
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  FileText,
  GraduationCap,
  Lock,
  Pencil,
  PlayCircle,
  RefreshCw,
  Star,
  Trophy,
} from "lucide-react";
import { CourseContextBanner } from "@/components/CourseContextBanner";
import { useState, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModeId = "relearn" | "tutorial" | "practice" | "exam_prep" | "diagnostic";

interface ModeConfig {
  id: ModeId;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  hoverBorder: string;
}

const MODES: ModeConfig[] = [
  {
    id: "relearn",
    label: "Relearn It",
    description: "Re-teach this concept from scratch",
    icon: RefreshCw,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    hoverBorder: "hover:border-blue-400",
  },
  {
    id: "tutorial",
    label: "Walk Me Through It",
    description: "Step-by-step with worked examples",
    icon: GraduationCap,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    hoverBorder: "hover:border-violet-400",
  },
  {
    id: "practice",
    label: "Practice Questions",
    description: "Adaptive questions at your level",
    icon: Pencil,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    hoverBorder: "hover:border-emerald-400",
  },
  {
    id: "exam_prep",
    label: "Exam Prep",
    description: "STAAR-style review for your current course",
    icon: FileText,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    hoverBorder: "hover:border-amber-400",
  },
  {
    id: "diagnostic",
    label: "Am I On Track?",
    description: "See how you compare to your class",
    icon: ClipboardList,
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    hoverBorder: "hover:border-rose-400",
  },
];

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

function diagnosticScoreColor(score: number) {
  if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
  if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-200";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Curriculum() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [lessonNavOpen, setLessonNavOpen] = useState(false);

  const { data: dashboard, isLoading } = trpc.progress.getDashboard.useQuery(undefined, { enabled: !!user });
  const activeCourseId = dashboard?.activeCourseId ?? 0;

  const { data: nextLesson } = trpc.courses.getNextLesson.useQuery(
    { courseId: activeCourseId },
    { enabled: !!activeCourseId }
  );

  const { data: eocInfo } = trpc.examPrep.getInfo.useQuery(
    { courseId: activeCourseId },
    { enabled: !!activeCourseId }
  );

  const { data: latestDiag } = trpc.diagnostic.getLatestAttempt.useQuery(
    { courseId: activeCourseId },
    { enabled: !!activeCourseId }
  );

  const { data: unitsWithLessons } = trpc.curriculum.getUnitsWithLessons.useQuery(
    { courseId: activeCourseId },
    { enabled: !!activeCourseId && lessonNavOpen }
  );

  const isYoungLearner = useMemo(() => {
    const grade = user?.grade ?? "";
    return ["Pre-K", "Kindergarten", "K", "1", "2"].includes(grade);
  }, [user?.grade]);

  // Filter modes for young learners: hide exam_prep (no EOC for Pre-K–2)
  const visibleModes = useMemo(() => {
    if (isYoungLearner) return MODES.filter((m) => m.id !== "exam_prep");
    return MODES;
  }, [isYoungLearner]);

  function handleModeSelect(modeId: ModeId) {
    if (modeId === "exam_prep") {
      setLocation("/exam-prep");
      return;
    }
    if (modeId === "diagnostic") {
      setLocation("/diagnostic");
      return;
    }
    // Relearn / Tutorial / Practice → open tutor with mode pre-selected
    const lessonParam = nextLesson ? `&lessonId=${nextLesson.lessonId}&unitId=${nextLesson.unitId}` : "";
    setLocation(`/tutor?mode=${modeId}${lessonParam}`);
  }

  function handleLessonSelect(lessonId: number, unitId: number, modeId: "relearn" | "tutorial") {
    setLocation(`/tutor?mode=${modeId}&lessonId=${lessonId}&unitId=${unitId}`);
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 page-enter">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
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

  const gradeLabel =
    courseGradeLevel === "AP" ? "AP / Advanced" : courseGradeLevel ? `Grade ${courseGradeLevel}` : "";
  const subjectLabel = SUBJECT_LABELS[courseSubject] ?? courseSubject;
  const teksLabel = courseTeksCode ? `${courseTeksCode}` : "Standards-aligned";
  const subtitleParts = [gradeLabel, subjectLabel, teksLabel].filter(Boolean);

  const diagScore = (latestDiag as any)?.overallScore ?? null;

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

      {/* ── Five-Mode Selector ── */}
      <section aria-label="Learning modes">
        <h2 className="text-base font-semibold text-foreground mb-3">How do you want to study today?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" role="list">
          {visibleModes.map((mode) => {
            const Icon = mode.icon;

            // Extra context per mode
            let extraContent: React.ReactNode = null;

            if ((mode.id === "relearn" || mode.id === "tutorial") && nextLesson) {
              extraContent = (
                <p className="text-xs font-medium text-foreground/70 mt-1 truncate">
                  Continue: {nextLesson.lessonTitle}
                </p>
              );
            }

            if (mode.id === "exam_prep") {
              if (eocInfo) {
                extraContent = (
                  <p className="text-xs font-medium text-foreground/70 mt-1 truncate">
                    {eocInfo.templateName} · {eocInfo.itemCount} items
                  </p>
                );
              } else {
                extraContent = (
                  <p className="text-xs text-muted-foreground mt-1">No EOC template for this course</p>
                );
              }
            }

            if (mode.id === "diagnostic") {
              if (diagScore !== null) {
                extraContent = (
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border mt-1 ${diagnosticScoreColor(diagScore)}`}>
                    {diagScore}% on track
                  </span>
                );
              } else {
                extraContent = (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-1">
                    Find out now →
                  </span>
                );
              }
            }

            return (
              <button
                key={mode.id}
                role="listitem"
                onClick={() => handleModeSelect(mode.id)}
                className={`group flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${mode.border} ${mode.hoverBorder} hover:shadow-md active:scale-[0.98] bg-card`}
                aria-label={`${mode.label}: ${mode.description}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${mode.bg}`}>
                    <Icon className={`h-5 w-5 ${mode.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{mode.label}</p>
                    <p className="text-xs text-muted-foreground leading-snug">{mode.description}</p>
                  </div>
                  <ArrowRight className={`h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors`} />
                </div>
                {extraContent && (
                  <div className="pl-12">
                    {extraContent}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Lesson Navigator (B2) ── */}
      {nextLesson && (
        <section className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  You are on Unit {nextLesson.unitNumber} — {nextLesson.unitTitle}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Lesson {nextLesson.lessonNumber}: {nextLesson.lessonTitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => handleLessonSelect(nextLesson.lessonId, nextLesson.unitId, "relearn")}
              >
                <PlayCircle className="h-3.5 w-3.5" />
                Start Lesson
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => setLessonNavOpen((v) => !v)}
                aria-expanded={lessonNavOpen}
                aria-controls="lesson-navigator-panel"
              >
                {lessonNavOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {lessonNavOpen ? "Hide" : "Browse"} lessons
              </Button>
            </div>
          </div>

          {/* Collapsible lesson list */}
          {lessonNavOpen && (
            <div id="lesson-navigator-panel" className="space-y-2 pt-1">
              {unitsWithLessons ? (
                unitsWithLessons.map((unit) => (
                  <div key={unit.id} className="space-y-1">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                      Unit {unit.unitNumber} · {unit.title}
                    </h3>
                    {unit.lessons.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-2">No lessons yet</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {unit.lessons.map((lesson) => {
                          const isCurrent = lesson.id === nextLesson.lessonId;
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => handleLessonSelect(lesson.id, unit.id, "relearn")}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                                isCurrent
                                  ? "bg-primary/10 text-primary font-medium border border-primary/20"
                                  : "hover:bg-muted/50 text-foreground/80"
                              }`}
                            >
                              <span className="shrink-0 w-5 text-center font-mono text-muted-foreground/60">
                                {lesson.lessonNumber}
                              </span>
                              <span className="truncate">{lesson.title}</span>
                              {isCurrent && <span className="ml-auto shrink-0 text-primary">← here</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="space-y-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 rounded-lg" />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Progress Summary ── */}
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

      {/* ── Units Grid ── */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Course Units</h2>
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
                        <><Star className="h-3 w-3" />Take Quiz</>
                      ) : unit.status === "completed" ? (
                        <><BookOpen className="h-3 w-3" />Review</>
                      ) : (
                        <><ArrowRight className="h-3 w-3" />Continue</>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
