/**
 * CourseWelcome — shown the very first time a student enters a course
 * (i.e. when hasDiagnosticForActiveCourse === false).
 *
 * The entire page is a single call-to-action: "Take the Placement Test Now."
 * Clicking anywhere on the page navigates to /diagnostic.
 * A collapsible unit list lets students preview the course topics first.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  GraduationCap,
  Lightbulb,
  Target,
  Trophy,
} from "lucide-react";

const SUBJECT_LABELS: Record<string, string> = {
  math: "Mathematics",
  english: "English Language Arts",
  science: "Science",
  social_studies: "Social Studies",
  language: "World Languages",
  business: "Business & Finance",
  test_prep: "Test Preparation",
  other: "",
};

const SUBJECT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  math: Target,
  english: BookOpen,
  science: Lightbulb,
  social_studies: GraduationCap,
  language: BookOpen,
  business: Trophy,
  test_prep: ClipboardList,
  other: BookOpen,
};

const SUBJECT_COLORS: Record<string, { bg: string; text: string; accent: string; unitBg: string }> = {
  math:          { bg: "from-blue-50 to-indigo-50",   text: "text-blue-700",   accent: "bg-blue-100 text-blue-800 border-blue-200",     unitBg: "bg-blue-50 border-blue-100" },
  english:       { bg: "from-purple-50 to-violet-50", text: "text-purple-700", accent: "bg-purple-100 text-purple-800 border-purple-200", unitBg: "bg-purple-50 border-purple-100" },
  science:       { bg: "from-green-50 to-emerald-50", text: "text-green-700",  accent: "bg-green-100 text-green-800 border-green-200",    unitBg: "bg-green-50 border-green-100" },
  social_studies:{ bg: "from-amber-50 to-yellow-50",  text: "text-amber-700",  accent: "bg-amber-100 text-amber-800 border-amber-200",    unitBg: "bg-amber-50 border-amber-100" },
  language:      { bg: "from-pink-50 to-rose-50",     text: "text-pink-700",   accent: "bg-pink-100 text-pink-800 border-pink-200",       unitBg: "bg-pink-50 border-pink-100" },
  business:      { bg: "from-teal-50 to-cyan-50",     text: "text-teal-700",   accent: "bg-teal-100 text-teal-800 border-teal-200",       unitBg: "bg-teal-50 border-teal-100" },
  test_prep:     { bg: "from-orange-50 to-amber-50",  text: "text-orange-700", accent: "bg-orange-100 text-orange-800 border-orange-200", unitBg: "bg-orange-50 border-orange-100" },
  other:         { bg: "from-slate-50 to-gray-50",    text: "text-slate-700",  accent: "bg-slate-100 text-slate-800 border-slate-200",    unitBg: "bg-slate-50 border-slate-100" },
};

export default function CourseWelcome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [unitsOpen, setUnitsOpen] = useState(false);

  const { data: dashboard, isLoading } = trpc.progress.getDashboard.useQuery(undefined, {
    enabled: !!user,
  });

  // If the student has already taken the diagnostic, redirect to curriculum
  useEffect(() => {
    if (!isLoading && dashboard?.hasDiagnosticForActiveCourse) {
      setLocation("/curriculum");
    }
  }, [isLoading, dashboard, setLocation]);

  const courseTitle       = dashboard?.courseTitle       ?? "Your Course";
  const courseSubject     = dashboard?.courseSubject     ?? "other";
  const courseDescription = dashboard?.courseDescription ?? "";
  const courseGradeLevel  = dashboard?.courseGradeLevel  ?? "";
  const totalUnits        = dashboard?.totalUnits        ?? 0;
  const units             = (dashboard?.units ?? []) as { unitNumber: number; title: string; description?: string }[];

  const subjectLabel = SUBJECT_LABELS[courseSubject] ?? courseSubject;
  const colors       = SUBJECT_COLORS[courseSubject] ?? SUBJECT_COLORS.other;
  const SubjectIcon  = SUBJECT_ICONS[courseSubject]  ?? BookOpen;
  const gradeLabel   =
    courseGradeLevel === "AP"
      ? "AP / Advanced"
      : courseGradeLevel
      ? `Grade ${courseGradeLevel}`
      : "";

  function goToDiagnostic() {
    setLocation("/diagnostic");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-6">
          <Skeleton className="h-10 w-2/3 mx-auto" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    // The entire page is clickable — any click goes to /diagnostic
    <div
      className="min-h-screen cursor-pointer select-none page-enter"
      onClick={goToDiagnostic}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && goToDiagnostic()}
      aria-label="Take the placement test now"
    >
      {/* Background gradient */}
      <div className={`min-h-screen bg-gradient-to-br ${colors.bg} flex flex-col items-center justify-center p-6`}>
        <div className="w-full max-w-2xl space-y-8">

          {/* Course identity */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {gradeLabel && (
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {gradeLabel}
                </Badge>
              )}
              {subjectLabel && (
                <Badge className={`text-sm px-3 py-1 border ${colors.accent}`} variant="outline">
                  {subjectLabel}
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-white shadow-sm border">
                <SubjectIcon className={`h-7 w-7 ${colors.text}`} />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Welcome to <span className={colors.text}>{courseTitle}</span>
            </h1>
            {courseDescription && (
              <p className="text-muted-foreground text-base leading-relaxed max-w-xl mx-auto">
                {courseDescription}
              </p>
            )}
            {totalUnits > 0 && (
              <p className="text-sm text-muted-foreground">
                {totalUnits} units · Katy ISD · TEKS-aligned
              </p>
            )}
          </div>

          {/* Collapsible unit preview */}
          {units.length > 0 && (
            <div
              className="bg-white rounded-2xl border shadow-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
                onClick={() => setUnitsOpen((v) => !v)}
                aria-expanded={unitsOpen}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className={`h-5 w-5 ${colors.text}`} />
                  <span className="font-semibold text-foreground">
                    Preview the {units.length} units you will study
                  </span>
                </div>
                {unitsOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {unitsOpen && (
                <div className="border-t divide-y">
                  {units.map((unit) => (
                    <div
                      key={unit.unitNumber}
                      className={`flex items-start gap-3 px-6 py-3 ${colors.unitBg}`}
                    >
                      <span
                        className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${colors.accent} border`}
                      >
                        {unit.unitNumber}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{unit.title}</p>
                        {unit.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                            {unit.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Why the placement test */}
          <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-lg">
                  Your first step: the Placement Diagnostic
                </h2>
                <p className="text-sm text-muted-foreground">
                  30 questions · approximately 60 minutes
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Before you dive into {courseTitle}, EduChamp needs to understand where you are
              starting from. The placement diagnostic is a short assessment that maps your
              existing knowledge against every unit in this course. Without it, the system
              cannot unlock the right lessons or personalise your learning path.
            </p>

            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                The diagnostic will:
              </p>
              {[
                "Identify which concepts you already know well",
                "Reveal gaps that need attention before you progress",
                "Recommend your personalised starting point in the curriculum",
                "Unlock the appropriate units so you learn in the right order",
                "Give your teacher and parent an accurate baseline of your skills",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 leading-relaxed">
              <strong>Why is this required?</strong> Skipping the placement test means the
              system cannot personalise your experience. Every student starts at a different
              point — the diagnostic ensures you are neither bored by content you already
              know nor overwhelmed by content you are not ready for.
            </div>
          </div>

          {/* Primary CTA */}
          <div className="text-center space-y-3">
            <Button
              size="lg"
              className="w-full max-w-sm gap-2 text-base h-14 shadow-md hover:shadow-lg transition-shadow"
              onClick={(e) => { e.stopPropagation(); goToDiagnostic(); }}
            >
              <ClipboardList className="h-5 w-5" />
              Take the Placement Test Now
              <ArrowRight className="h-5 w-5" />
            </Button>
            <p className="text-xs text-muted-foreground">
              Tap anywhere on this page to begin — you can pause and resume at any time.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
