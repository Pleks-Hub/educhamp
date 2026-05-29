import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  RotateCcw,
  Timer,
  XCircle,
  ChevronDown,
  ChevronUp,
  History,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { NavTooltip } from "@/components/NavTooltip";
import { DIAGNOSTIC_TOOLTIPS } from "@/lib/tooltipContent";

type ChoiceItem = { label: string; text: string };

type DiagnosticQuestion = {
  id: number;
  questionId: string;
  questionText: string;
  questionType: "multiple_choice" | "short_answer";
  choices: ChoiceItem[] | null;
  mapsToUnit: string;
  difficulty: "easy" | "medium" | "hard";
};

function parseChoices(raw: unknown): ChoiceItem[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as ChoiceItem[]; } catch { return []; }
  }
  if (Array.isArray(raw)) return raw as ChoiceItem[];
  return [];
}

type GradedAnswer = {
  questionId: string;
  answer: string;
  correct: boolean;
  questionText: string;
  questionType: string;
  choices: ChoiceItem[] | null;
  mapsToUnit: string;
  correctAnswer: string;
  explanation: string;
};

type UnitResult = {
  unitNumber: number;
  unitTitle: string;
  correct: number;
  total: number;
  status: "likely_mastered" | "partial_understanding" | "needs_instruction";
  recommendation: string;
};

type DiagnosticResult = {
  overallScore: number;
  prerequisiteScore: number;
  unitResults: UnitResult[];
  placementRecommendation: string;
  gradedAnswers: GradedAnswer[];
};

const TIMER_DURATION = 60 * 60; // 60 minutes in seconds

function getCooldownRemaining(completedAt: Date | string | null | undefined, cooldownDays = 7): number {
  if (!completedAt) return 0;
  const completed = new Date(completedAt).getTime();
  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
  const remaining = completed + cooldownMs - Date.now();
  return Math.max(0, remaining);
}

function formatCooldown(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((ms % (60 * 60 * 1000)) / 60000);
  return `${hours}h ${mins}m`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Question Review Card ─────────────────────────────────────────────────────

function QuestionReviewCard({ answer, index, prereqLabel }: { answer: GradedAnswer; index: number; prereqLabel: string }) {
  const [expanded, setExpanded] = useState(!answer.correct);
  const choices = parseChoices(answer.choices);

  // Find the text for a choice label
  const choiceText = (label: string) =>
    choices.find((c) => c.label === label)?.text ?? label;

  return (
    <Card
      className={`border transition-all ${
        answer.correct
          ? "border-green-200 bg-green-50/40"
          : "border-red-200 bg-red-50/40"
      }`}
    >
      <CardContent className="p-0">
        {/* Header row */}
        <button
          className="w-full flex items-start gap-3 p-4 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="shrink-0 mt-0.5">
            {answer.correct ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">{answer.questionId}</span>
              <Badge
                variant="outline"
                className={`text-[10px] h-4 px-1.5 ${
                  answer.mapsToUnit === "prerequisite"
                    ? "border-purple-200 text-purple-700"
                    : "border-blue-200 text-blue-700"
                }`}
              >
                {answer.mapsToUnit === "prerequisite" ? prereqLabel : `Unit ${answer.mapsToUnit}`}
              </Badge>
            </div>
            <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
              {answer.questionText}
            </p>
          </div>
          <div className="shrink-0 ml-2 mt-0.5 text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
            {/* Choices (if MC) */}
            {choices.length > 0 && (
              <div className="space-y-1.5">
                {choices.map((c) => {
                  const isCorrect = c.label === answer.correctAnswer;
                  const isSelected = c.label === answer.answer;
                  return (
                    <div
                      key={c.label}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${
                        isCorrect
                          ? "bg-green-100 border border-green-300 text-green-900"
                          : isSelected && !isCorrect
                          ? "bg-red-100 border border-red-300 text-red-900"
                          : "bg-muted/30 border border-transparent text-muted-foreground"
                      }`}
                    >
                      <span className="font-bold w-5 shrink-0">{c.label}.</span>
                      <span className="flex-1">{c.text}</span>
                      {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                      {isSelected && !isCorrect && <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Short answer */}
            {choices.length === 0 && (
              <div className="space-y-2">
                <div className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  answer.correct ? "bg-green-100 border border-green-300 text-green-900" : "bg-red-100 border border-red-300 text-red-900"
                }`}>
                  {answer.correct ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="font-medium">Your answer:</span>
                  <span>{answer.answer || <em className="opacity-60">No answer given</em>}</span>
                </div>
                {!answer.correct && (
                  <div className="px-3 py-2 rounded-lg text-sm flex items-center gap-2 bg-green-100 border border-green-300 text-green-900">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium">Correct answer:</span>
                    <span className="font-semibold">{answer.correctAnswer}</span>
                  </div>
                )}
              </div>
            )}

            {/* Explanation / worked solution */}
            {answer.explanation && (
              <div className="px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs font-semibold text-blue-800 mb-1">Worked Solution</p>
                <p className="text-xs text-blue-900 leading-relaxed whitespace-pre-wrap">{answer.explanation}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Diagnostic() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Auto-redirect Pre-K through Grade 2 to the visual/audio early diagnostic
  useEffect(() => {
    if (!user) return;
    const earlyGrades = ["Pre-K", "Kindergarten", "Grade 1", "Grade 2"];
    if (earlyGrades.includes(user.grade ?? "")) {
      setLocation("/diagnostic/early");
    }
  }, [user, setLocation]);

  // Test state
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [extraMinutes, setExtraMinutes] = useState(15);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Review state
  const [reviewFilter, setReviewFilter] = useState<"all" | "correct" | "wrong">("all");
  const [reviewUnit, setReviewUnit] = useState<string>("all");

  // Retest: generate a unique seed per session so each attempt gets different questions
  const [sessionSeed] = useState(() => Date.now().toString() + Math.random().toString(36).slice(2));

  // Get the active course so the diagnostic uses course-specific questions
  const { data: dashboard } = trpc.progress.getDashboard.useQuery(undefined, { enabled: !!user });
  const activeCourseId = dashboard?.activeCourseId;

  const { data: questions, isLoading } = trpc.diagnostic.getQuestions.useQuery(
    { seed: sessionSeed, courseId: activeCourseId },
    { enabled: started && activeCourseId !== undefined }
  );
  const courseTitle = dashboard?.courseTitle ?? "Course";
  const courseSubject = dashboard?.courseSubject ?? "other";
  const unitCount = dashboard?.units?.length ?? 8;
  // Derive a subject-appropriate label for prerequisite/foundational questions
  const prereqLabel = (() => {
    const s = courseSubject.toLowerCase();
    if (s === "math") return "Foundational Math";
    if (s === "ela" || s === "english") return "Reading Foundations";
    if (s === "science") return "Science Basics";
    if (s === "social_studies" || s === "social studies" || s === "socialstudies") return "Social Studies Foundations";
    if (s === "technology") return "Technology Basics";
    if (s === "spanish" || s === "language") return "Language Foundations";
    return "Foundational Skills";
  })();
  const { data: existingAttempt } = trpc.diagnostic.getLatestAttempt.useQuery(
    activeCourseId ? { courseId: activeCourseId } : undefined,
    { enabled: !!user && activeCourseId !== undefined }
  );
  const { data: allAttempts } = trpc.diagnostic.getAllAttempts.useQuery(undefined, {
    enabled: !!user,
  });

  const submitMutation = trpc.diagnostic.submitDiagnostic.useMutation({
    onSuccess: (data) => {
      setTimerRunning(false);
      setResult(data as DiagnosticResult);
    },
    onError: (err) => {
      toast.error("Submission error: " + err.message);
    },
  });

  // Timer tick
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            setTimerRunning(false);
            setShowTimeUpDialog(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  // Start timer when questions load
  useEffect(() => {
    if (started && questions && questions.length > 0 && !timerRunning && timeLeft === TIMER_DURATION) {
      setTimerRunning(true);
    }
  }, [started, questions]);

  const handleSubmit = useCallback(() => {
    if (!questions) return;
    const answerArray = (questions as DiagnosticQuestion[]).map((q) => ({
      questionId: q.questionId,
      answer: answers[q.questionId] ?? "",
    }));
    submitMutation.mutate({ answers: answerArray, courseId: activeCourseId });
  }, [questions, answers, submitMutation]);

  const handleExtendTime = () => {
    setTimeLeft((t) => t + extraMinutes * 60);
    setTimerRunning(true);
    setShowTimeUpDialog(false);
    setShowExtendDialog(false);
    toast.success(`${extraMinutes} minutes added. Keep going!`);
  };

  const handleSubmitAnyway = () => {
    setShowTimeUpDialog(false);
    handleSubmit();
  };

  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">Sign in to take the diagnostic</h2>
          <Button onClick={() => { window.location.href = getLoginUrl(); }}>Sign in</Button>
        </div>
      </div>
    );
  }

  // ── Show existing result ──────────────────────────────────────────────────
  if (existingAttempt && !started && !result) {
    const attempt = existingAttempt as any;
    const attempts = (allAttempts ?? []) as any[];
    const attemptCount = attempts.length;
    const cooldownDays = (attempt as any).cooldownDays ?? dashboard?.diagnosticCooldownDays ?? 7;
    const cooldownMs = getCooldownRemaining(attempt.completedAt, cooldownDays);
    const onCooldown = cooldownMs > 0;
    // Find first actionable unit for Start Learning CTA
    const firstActionableUnit = dashboard?.units?.find(
      (u: any) => u.status === "in_progress" || u.status === "quiz_unlocked"
    ) ?? dashboard?.units?.[0];

    return (
      <div className="p-6 space-y-6 page-enter max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Placement Diagnostic</h1>
            <p className="text-muted-foreground text-sm mt-1">{courseTitle} · 30 Questions</p>
          </div>
          {attemptCount > 1 && (
            <Badge variant="outline" className="gap-1.5 text-xs shrink-0">
              <History className="h-3 w-3" />
              {attemptCount} attempts
            </Badge>
          )}
        </div>

        {/* Latest attempt summary */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {attemptCount > 1 ? `Attempt ${attemptCount} — Latest Result` : "Diagnostic Completed"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Overall Score</p>
                <p className="text-2xl font-bold text-foreground">{attempt.overallScore}%</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Prerequisite Skills</p>
                <p className="text-2xl font-bold text-foreground">{attempt.prerequisiteScore}/6</p>
              </div>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm font-semibold text-foreground mb-1">Placement Recommendation</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{attempt.placementRecommendation}</p>
            </div>
            {/* Start Learning CTA */}
            {firstActionableUnit && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-green-800">Ready to start learning?</p>
                  <p className="text-xs text-green-700 mt-0.5">Your placement is set — jump straight into your first unit.</p>
                </div>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white gap-2 shrink-0"
                  onClick={() => setLocation(`/curriculum/unit/${firstActionableUnit.unitNumber}`)}
                >
                  <BookOpen className="h-4 w-4" />
                  Start Learning
                </Button>
              </div>
            )}
            <div className="flex gap-3">
              <Button onClick={() => setLocation("/curriculum")} className="flex-1">
                Go to Curriculum
              </Button>
              {onCooldown ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/50 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>Retake available in <strong>{formatCooldown(cooldownMs)}</strong></span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => { setStarted(true); setAnswers({}); setCurrentIndex(0); setTimeLeft(TIMER_DURATION); }}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  {attemptCount > 0 ? "Retest (New Questions)" : "Retake"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attempt history (only shown when >1 attempt) */}
        {attemptCount > 1 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Score History
            </h2>
            <div className="space-y-2">
              {attempts.map((a: any, idx: number) => {
                const isLatest = idx === 0;
                const scoreColor = a.overallScore >= 70 ? "text-green-600" : a.overallScore >= 50 ? "text-amber-600" : "text-red-500";
                return (
                  <div key={a.id} className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${isLatest ? "border-primary/30 bg-primary/5" : ""}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isLatest ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {attemptCount - idx}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Attempt {attemptCount - idx}
                        {isLatest && <span className="ml-2 text-xs text-primary font-normal">(latest)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-lg font-bold ${scoreColor}`}>{a.overallScore}%</p>
                      <p className="text-xs text-muted-foreground">prereq {a.prerequisiteScore}/6</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Results page ──────────────────────────────────────────────────────────
  if (result) {
    // Find first actionable unit for Start Learning CTA on fresh results
    const firstActionableUnitResult = dashboard?.units?.find(
      (u: any) => u.status === "in_progress" || u.status === "quiz_unlocked"
    ) ?? dashboard?.units?.[0];
    const filteredAnswers = result.gradedAnswers.filter((a) => {
      if (reviewFilter === "correct" && !a.correct) return false;
      if (reviewFilter === "wrong" && a.correct) return false;
      if (reviewUnit !== "all" && a.mapsToUnit !== reviewUnit) return false;
      return true;
    });

    const correctCount = result.gradedAnswers.filter((a) => a.correct).length;
    const wrongCount = result.gradedAnswers.length - correctCount;
    const unitOptions = Array.from(new Set(result.gradedAnswers.map((a) => a.mapsToUnit))).sort();

    return (
      <div className="p-6 space-y-6 page-enter max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Diagnostic Results</h1>
          <p className="text-muted-foreground text-sm mt-1">Completed {new Date().toLocaleDateString()}</p>
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{result.overallScore}%</p>
              <p className="text-xs text-muted-foreground mt-1">Overall Score</p>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{correctCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Correct</p>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-500">{wrongCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Incorrect</p>
            </CardContent>
          </Card>
        </div>

        {/* Placement Recommendation */}
        <Card className="border border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Placement Recommendation
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.placementRecommendation}</p>
          </CardContent>
        </Card>

        {/* Unit Breakdown — student-driven learning path: every unit is clickable */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Unit Breakdown</h2>
            <p className="text-xs text-muted-foreground">Click any unit to start there</p>
          </div>
          <div className="space-y-2">
            {result.unitResults.map((ur) => (
              <div
                key={ur.unitNumber}
                className={`flex items-center gap-3 p-3 rounded-lg border bg-card transition-all duration-150 cursor-pointer group ${
                  ur.status === "likely_mastered" ? "hover:border-green-300 hover:bg-green-50/30" :
                  ur.status === "partial_understanding" ? "hover:border-yellow-300 hover:bg-yellow-50/30" :
                  "hover:border-red-300 hover:bg-red-50/30"
                }`}
                onClick={() => {
                  if (ur.status === "likely_mastered") {
                    setLocation(`/curriculum/unit/${ur.unitNumber}/quiz`);
                  } else {
                    setLocation(`/curriculum/unit/${ur.unitNumber}`);
                  }
                }}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  ur.status === "likely_mastered" ? "bg-green-100 text-green-700" :
                  ur.status === "partial_understanding" ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {ur.unitNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{ur.unitTitle}</p>
                  <p className="text-xs text-muted-foreground">{ur.correct}/{ur.total} correct · {ur.recommendation}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-xs ${
                    ur.status === "likely_mastered" ? "bg-green-100 text-green-700 border-green-200" :
                    ur.status === "partial_understanding" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                    "bg-red-100 text-red-700 border-red-200"
                  }`}>
                    {ur.status === "likely_mastered" ? "Mastered" :
                     ur.status === "partial_understanding" ? "Partial" : "Needs Work"}
                  </Badge>
                  <Button
                    size="sm"
                    variant={ur.status === "likely_mastered" ? "outline" : "default"}
                    className={`text-xs h-7 px-2.5 gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                      ur.status === "likely_mastered" ? "" :
                      ur.status === "partial_understanding" ? "bg-yellow-600 hover:bg-yellow-700 text-white" :
                      "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (ur.status === "likely_mastered") {
                        setLocation(`/curriculum/unit/${ur.unitNumber}/quiz`);
                      } else {
                        setLocation(`/curriculum/unit/${ur.unitNumber}`);
                      }
                    }}
                  >
                    {ur.status === "likely_mastered" ? (
                      <><BookOpen className="h-3 w-3" />Review</>
                    ) : (
                      <><ArrowRight className="h-3 w-3" />Start Here</>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Question Review */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-base font-semibold">Question Review ({result.gradedAnswers.length} questions)</h2>
            <div className="flex gap-2 flex-wrap">
              {/* Filter by result */}
              <div className="flex rounded-lg border overflow-hidden text-xs">
                {(["all", "correct", "wrong"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setReviewFilter(f)}
                    className={`px-3 py-1.5 capitalize transition-colors ${
                      reviewFilter === f
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {f === "all" ? `All (${result.gradedAnswers.length})` :
                     f === "correct" ? `✓ Correct (${correctCount})` :
                     `✗ Wrong (${wrongCount})`}
                  </button>
                ))}
              </div>
              {/* Filter by unit */}
              <select
                value={reviewUnit}
                onChange={(e) => setReviewUnit(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border bg-background text-foreground"
              >
                <option value="all">All Units</option>
                {unitOptions.map((u) => (
                  <option key={u} value={u}>
                    {u === "prerequisite" ? prereqLabel : `Unit ${u}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredAnswers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No questions match this filter.</p>
          ) : (
            <div className="space-y-3">
              {filteredAnswers.map((a, idx) => (
                <QuestionReviewCard key={a.questionId} answer={a} index={idx} prereqLabel={prereqLabel} />
              ))}
            </div>
          )}
        </div>

        {/* Start Learning CTA on fresh results */}
        {firstActionableUnitResult && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-green-800">Your placement is complete!</p>
              <p className="text-xs text-green-700 mt-0.5">Jump straight into your first personalised unit now.</p>
            </div>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white gap-2 shrink-0"
              onClick={() => setLocation(`/curriculum/unit/${firstActionableUnitResult.unitNumber}`)}
            >
              <BookOpen className="h-4 w-4" />
              Start Learning
            </Button>
          </div>
        )}
        <div className="flex gap-3">
          <Button onClick={() => setLocation("/curriculum")} className="flex-1">
            Go to Curriculum
          </Button>
          <Button variant="outline" onClick={() => setLocation("/tutor")} className="gap-2">
            Open AI Tutor
          </Button>
        </div>
      </div>
    );
  }

  // ── Start screen ──────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="p-6 space-y-6 page-enter max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Placement Diagnostic</h1>
          <p className="text-muted-foreground text-sm mt-1">{courseTitle} · Katy ISD</p>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">30-Question Diagnostic Assessment</h2>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-3.5 w-3.5" />
                  60 minutes · You may request extra time if needed
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>This diagnostic will:</p>
              <ul className="space-y-1.5 ml-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  Assess prerequisite skills ({prereqLabel.toLowerCase()})
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  Test concepts across all {unitCount} {courseTitle} units
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  Recommend your personalized starting point
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  Unlock appropriate units in the curriculum
                </li>
              </ul>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <Timer className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>You have <strong>60 minutes</strong>. If you need more time when the timer expires, you can request an extension before submitting.</span>
            </div>

            <NavTooltip content={DIAGNOSTIC_TOOLTIPS.startTest} side="top">
              <Button onClick={() => setStarted(true)} className="w-full gap-2" size="lg">
                <ArrowRight className="h-4 w-4" />
                Begin Diagnostic
              </Button>
            </NavTooltip>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Loading questions ─────────────────────────────────────────────────────
  if (isLoading || !questions) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const currentQ = questions[currentIndex] as DiagnosticQuestion;
  const totalQ = questions.length;
  const progressPct = (currentIndex / totalQ) * 100;
  const currentAnswer = answers[currentQ.questionId] ?? "";
  const answeredCount = Object.keys(answers).length;

  const handleNext = () => {
    if (currentIndex < totalQ - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const timerColor =
    timeLeft <= 300 ? "text-red-600" : timeLeft <= 600 ? "text-amber-600" : "text-foreground";

  // ── Test in progress ──────────────────────────────────────────────────────
  return (
    <>
      {/* Time Up Dialog */}
      <Dialog open={showTimeUpDialog} onOpenChange={setShowTimeUpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-amber-500" />
              Time is up!
            </DialogTitle>
            <DialogDescription>
              Your 60 minutes have elapsed. You can submit now with {answeredCount}/{totalQ} questions answered,
              or request additional time to finish.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">How much extra time do you need?</p>
            <div className="flex gap-2">
              {[10, 15, 20, 30].map((m) => (
                <button
                  key={m}
                  onClick={() => setExtraMinutes(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                    extraMinutes === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  +{m} min
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:flex-row flex-col">
            <Button variant="outline" onClick={handleSubmitAnyway} disabled={submitMutation.isPending} className="flex-1">
              {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Now"}
            </Button>
            <Button onClick={handleExtendTime} className="flex-1 gap-2">
              <Clock className="h-4 w-4" />
              Add {extraMinutes} Minutes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="p-6 space-y-5 page-enter max-w-2xl">
        {/* Header with timer */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-foreground">Placement Diagnostic</h1>
            <p className="text-xs text-muted-foreground">
              Question {currentIndex + 1} of {totalQ} · {answeredCount} answered
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {currentQ.mapsToUnit === "prerequisite" ? prereqLabel : `Unit ${currentQ.mapsToUnit}`}
            </Badge>
            {/* Timer */}
            <div
              className={`flex items-center gap-1.5 font-mono text-sm font-semibold px-2.5 py-1.5 rounded-lg border ${
                timeLeft <= 300
                  ? "bg-red-50 border-red-200 text-red-700"
                  : timeLeft <= 600
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-muted/40 border-border text-foreground"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatTime(timeLeft)}
            </div>
            <button
              onClick={() => setShowTimeUpDialog(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors hidden sm:inline"
            >
              Need more time?
            </button>
          </div>
        </div>

        {/* Progress */}
        <Progress value={progressPct} className="h-1.5" />

        {/* Question Card */}
        <Card className="border shadow-sm">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start gap-3">
              <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                {currentIndex + 1}
              </span>
              <p className="text-base font-medium text-foreground leading-relaxed">
                {currentQ.questionText}
              </p>
            </div>

            {currentQ.questionType === "multiple_choice" && (
              <RadioGroup
                value={currentAnswer}
                onValueChange={(val) => setAnswers((prev) => ({ ...prev, [currentQ.questionId]: val }))}
                className="space-y-2"
              >
                {parseChoices(currentQ.choices).map((choice, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      currentAnswer === choice.label
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                    onClick={() => setAnswers((prev) => ({ ...prev, [currentQ.questionId]: choice.label }))}
                  >
                    <RadioGroupItem value={choice.label} id={`choice-${idx}`} />
                    <Label htmlFor={`choice-${idx}`} className="cursor-pointer text-sm flex-1">
                      <span className="font-semibold text-muted-foreground mr-2">{choice.label}.</span>
                      {choice.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQ.questionType === "short_answer" && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Your answer:</Label>
                <Input
                  value={currentAnswer}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQ.questionId]: e.target.value }))}
                  placeholder="Type your answer here..."
                  className="text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                  autoFocus
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          {/* Question dots */}
          <div className="flex gap-1 flex-wrap justify-center max-w-xs">
            {questions.slice(Math.max(0, currentIndex - 3), Math.min(totalQ, currentIndex + 4)).map((_, relIdx) => {
              const absIdx = Math.max(0, currentIndex - 3) + relIdx;
              const q = questions[absIdx] as DiagnosticQuestion;
              const hasAnswer = !!answers[q.questionId];
              return (
                <button
                  key={absIdx}
                  onClick={() => setCurrentIndex(absIdx)}
                  className={`h-6 w-6 rounded text-xs font-medium transition-all ${
                    absIdx === currentIndex
                      ? "bg-primary text-primary-foreground"
                      : hasAnswer
                      ? "bg-green-100 text-green-700"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {absIdx + 1}
                </button>
              );
            })}
          </div>

          <NavTooltip
            content={currentIndex === totalQ - 1 ? DIAGNOSTIC_TOOLTIPS.submitAnswer : { title: "Next Question", description: "Move to the next question. Your current answer is saved automatically." }}
            side="top"
          >
            <Button
              onClick={handleNext}
              disabled={!currentAnswer || submitMutation.isPending}
              className="gap-2"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : currentIndex === totalQ - 1 ? (
                <>Submit <CheckCircle2 className="h-4 w-4" /></>
              ) : (
                <>Next <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </NavTooltip>
        </div>

        {/* Answer progress dots */}
        <div className="flex flex-wrap gap-1 justify-center">
          {questions.map((q: DiagnosticQuestion, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              title={`Q${idx + 1}${answers[q.questionId] ? " ✓" : ""}`}
              className={`h-2 w-2 rounded-full transition-all ${
                idx === currentIndex ? "bg-primary scale-125" :
                answers[q.questionId] ? "bg-green-400" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
