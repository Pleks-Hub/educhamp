import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useExamTimer } from "@/hooks/useExamTimer";
import { ExamTimerBar } from "@/components/ExamTimerBar";
import { CourseContextBanner } from "@/components/CourseContextBanner";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Sparkles,
  Star,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChoiceItem = { label: string; text: string };

type ExamItem = {
  id: number;
  questionText: string;
  questionType: string;
  choices: ChoiceItem[] | null;
  skillTag: string;
  difficulty: "easy" | "medium" | "hard" | "challenge";
  unitId: number;
  unitTitle: string;
};

type SubmitResult = {
  questionId: number;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard" | "challenge";
  skillTag: string;
};

type Phase = "start" | "session" | "review" | "summary";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG = {
  easy: { label: "Easy", color: "bg-green-100 text-green-700 border-green-200" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  hard: { label: "Hard", color: "bg-orange-100 text-orange-700 border-orange-200" },
  challenge: { label: "Challenge", color: "bg-red-100 text-red-700 border-red-200" },
};

function parseChoices(raw: unknown): ChoiceItem[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as ChoiceItem[]; } catch { return []; }
  }
  if (Array.isArray(raw)) return raw as ChoiceItem[];
  return [];
}

function getScoreLabel(pct: number): { label: string; color: string; emoji: string } {
  if (pct >= 90) return { label: "Mastered", color: "text-emerald-600", emoji: "🏆" };
  if (pct >= 75) return { label: "Proficient", color: "text-blue-600", emoji: "⭐" };
  if (pct >= 60) return { label: "Approaching", color: "text-amber-600", emoji: "📈" };
  if (pct >= 40) return { label: "Developing", color: "text-orange-600", emoji: "📚" };
  return { label: "Needs Practice", color: "text-red-600", emoji: "💪" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuestionCard({
  item,
  index,
  total,
  answer,
  onAnswer,
  disabled,
}: {
  item: ExamItem;
  index: number;
  total: number;
  answer: string;
  onAnswer: (val: string) => void;
  disabled: boolean;
}) {
  const choices = parseChoices(item.choices);
  const isMultipleChoice = item.questionType === "multiple_choice" && choices.length > 0;
  const diffConfig = DIFFICULTY_CONFIG[item.difficulty] ?? DIFFICULTY_CONFIG.medium;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Question {index + 1} of {total}
          </span>
          <Badge variant="outline" className={`text-xs ${diffConfig.color}`}>
            {diffConfig.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground truncate max-w-[180px]">{item.unitTitle}</span>
          <ReadAloudButton text={item.questionText} />
        </div>
      </div>

      {/* Question text */}
      <p className="text-base font-medium leading-relaxed">{item.questionText}</p>

      {/* Answer input */}
      {isMultipleChoice ? (
        <RadioGroup
          value={answer}
          onValueChange={onAnswer}
          disabled={disabled}
          className="space-y-2"
        >
          {choices.map((c) => (
            <div
              key={c.label}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                ${answer === c.label
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/40"
                }
                ${disabled ? "opacity-60 cursor-not-allowed" : ""}
              `}
              onClick={() => !disabled && onAnswer(c.label)}
            >
              <RadioGroupItem value={c.label} id={`choice-${c.label}`} className="mt-0.5 shrink-0" />
              <Label htmlFor={`choice-${c.label}`} className="cursor-pointer leading-relaxed">
                <span className="font-semibold mr-2">{c.label}.</span>
                {c.text}
              </Label>
            </div>
          ))}
        </RadioGroup>
      ) : (
        <Input
          value={answer}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="Type your answer here…"
          disabled={disabled}
          className="text-sm"
        />
      )}
    </div>
  );
}

function ReviewCard({
  item,
  index,
  answer,
  result,
}: {
  item: ExamItem;
  index: number;
  answer: string;
  result: SubmitResult;
}) {
  const choices = parseChoices(item.choices);
  const isMultipleChoice = item.questionType === "multiple_choice" && choices.length > 0;
  const diffConfig = DIFFICULTY_CONFIG[item.difficulty] ?? DIFFICULTY_CONFIG.medium;

  // Find the full text for the correct answer label
  const correctChoiceText = isMultipleChoice
    ? choices.find((c) => c.label === result.correctAnswer)?.text
    : null;
  const yourChoiceText = isMultipleChoice
    ? choices.find((c) => c.label === answer)?.text
    : null;

  return (
    <Card className={`border-l-4 ${result.isCorrect ? "border-l-emerald-500" : "border-l-red-500"}`}>
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          {result.isCorrect ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs text-muted-foreground font-medium">Q{index + 1}</span>
              <Badge variant="outline" className={`text-xs ${diffConfig.color}`}>{diffConfig.label}</Badge>
              <span className="text-xs text-muted-foreground">{item.unitTitle}</span>
            </div>
            <p className="text-sm font-medium leading-snug">{item.questionText}</p>
          </div>
        </div>

        {/* Answer comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className={`rounded-md p-2 ${result.isCorrect ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
            <p className="text-xs font-semibold mb-0.5 text-muted-foreground">Your answer</p>
            <p className={`font-medium ${result.isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
              {answer || <span className="italic text-muted-foreground">No answer</span>}
              {yourChoiceText && <span className="font-normal ml-1 text-muted-foreground">— {yourChoiceText}</span>}
            </p>
          </div>
          {!result.isCorrect && (
            <div className="rounded-md p-2 bg-emerald-50 dark:bg-emerald-950/30">
              <p className="text-xs font-semibold mb-0.5 text-muted-foreground">Correct answer</p>
              <p className="font-medium text-emerald-700 dark:text-emerald-400">
                {result.correctAnswer}
                {correctChoiceText && <span className="font-normal ml-1 text-muted-foreground">— {correctChoiceText}</span>}
              </p>
            </div>
          )}
        </div>

        {/* Explanation */}
        {result.explanation && (
          <div className="rounded-md bg-muted/50 p-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Explanation: </span>
            {result.explanation}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExamPrep() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // ── Course context ─────────────────────────────────────────────────────────
  const { data: dashboard, isLoading: dashLoading } = trpc.progress.getDashboard.useQuery(
    undefined,
    { enabled: !!user }
  );
  const courseId = dashboard?.activeCourseId ?? 1;
  const courseTitle = dashboard?.courseTitle ?? "Your Course";

  // ── Phase state ────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("start");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<SubmitResult[]>([]);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [timeTakenSeconds, setTimeTakenSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  // ── Exam data ──────────────────────────────────────────────────────────────
  const { data: examData, isLoading: examLoading, error: examError, refetch } = trpc.examPrep.start.useQuery(
    { courseId },
    { enabled: !!user && phase === "session" && courseId > 0, retry: false }
  );

  const submitMutation = trpc.examPrep.submit.useMutation();

  // ── Timer ──────────────────────────────────────────────────────────────────
  const handleTimerExpire = useCallback(() => {
    toast.warning("Time's up! Submitting your answers…");
    handleSubmit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timer = useExamTimer(
    phase === "session" ? examData?.timeLimitMinutes ?? null : null,
    handleTimerExpire,
    false
  );

  // Start timer when exam data loads
  useEffect(() => {
    if (phase === "session" && examData && !examLoading) {
      timer.start();
      startTimeRef.current = Date.now();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, examData, examLoading]);

  // ── Items ──────────────────────────────────────────────────────────────────
  const items: ExamItem[] = useMemo(() => examData?.items ?? [], [examData]);
  const currentItem = items[currentIndex];

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleStart() {
    setPhase("session");
    setCurrentIndex(0);
    setAnswers({});
    setResults([]);
  }

  function handleAnswer(val: string) {
    if (!currentItem) return;
    setAnswers((prev) => ({ ...prev, [currentItem.id]: val }));
  }

  function handleNext() {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }

  async function handleSubmit() {
    if (submitMutation.isPending) return;
    timer.pause();
    const elapsed = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0;
    setTimeTakenSeconds(elapsed);

    const answerArray = items.map((item) => ({
      questionId: item.id,
      answer: answers[item.id] ?? "",
    }));

    try {
      const res = await submitMutation.mutateAsync({
        courseId,
        answers: answerArray,
        timeTakenSeconds: elapsed,
      });
      setResults(res.results);
      setScore(res.score);
      setTotal(res.total);
      setPercentage(res.percentage);
      setPhase("review");
    } catch {
      toast.error("Failed to submit. Please try again.");
      timer.start();
    }
  }

  function handleRetry() {
    setPhase("start");
    setCurrentIndex(0);
    setAnswers({});
    setResults([]);
    setScore(0);
    setTotal(0);
    setPercentage(0);
    timer.reset();
    startTimeRef.current = null;
  }

  // ── Unanswered count ───────────────────────────────────────────────────────
  const answeredCount = items.filter((item) => !!answers[item.id]).length;
  const unansweredCount = items.length - answeredCount;

  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <Sparkles className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">Sign in to use Exam Prep</h2>
          <p className="text-sm text-muted-foreground">
            Practice with official exam-style questions tailored to your course.
          </p>
          <Button onClick={() => { window.location.href = getLoginUrl(); }}>Sign in</Button>
        </div>
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (dashLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE: START
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === "start") {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        <CourseContextBanner />

        {/* Hero card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Exam Prep</h1>
                <p className="text-indigo-200 text-sm">{courseTitle}</p>
              </div>
            </div>
            <p className="text-indigo-100 text-sm leading-relaxed">
              Practice with official exam-style questions drawn from your course content.
              Answers are graded instantly with detailed explanations.
            </p>
          </div>
          <CardContent className="pt-5 pb-5 space-y-4">
            {/* Feature bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: BookOpen, label: "Curriculum-aligned questions", color: "text-blue-500" },
                { icon: Clock, label: "Timed session (optional)", color: "text-amber-500" },
                { icon: Zap, label: "Instant feedback & XP", color: "text-purple-500" },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleStart}
            >
              <Sparkles className="h-4 w-4" />
              Start Exam Prep Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE: SESSION (loading)
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === "session" && (examLoading || !examData)) {
    if (examError) {
      return (
        <div className="p-6 max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6 pb-6 text-center space-y-4">
              <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
              <h2 className="font-semibold text-lg">No Exam Template Found</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {examError.message || "No exam questions are available for your course yet. Please check back later."}
              </p>
              <Button variant="outline" onClick={() => setPhase("start")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading your exam questions…</span>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE: SESSION (active)
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === "session" && examData && items.length > 0) {
    const progressPct = items.length > 0 ? Math.round((answeredCount / items.length) * 100) : 0;

    return (
      <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]">
        {/* Sticky header */}
        <div className="shrink-0 border-b bg-background px-4 py-3">
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <span className="font-semibold text-sm">Exam Prep</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">— {courseTitle}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {answeredCount}/{items.length} answered
                </span>
                {examData.timeLimitMinutes && (
                  <ExamTimerBar
                    formattedTime={timer.formattedTime}
                    percentRemaining={timer.percentRemaining}
                    status={timer.status}
                    className="w-36 hidden sm:flex"
                  />
                )}
              </div>
            </div>
            {/* Progress bar */}
            <Progress value={progressPct} className="h-1.5" />
            {/* Mobile timer */}
            {examData.timeLimitMinutes && (
              <ExamTimerBar
                formattedTime={timer.formattedTime}
                percentRemaining={timer.percentRemaining}
                status={timer.status}
                className="sm:hidden"
              />
            )}
          </div>
        </div>

        {/* Thin bank warning */}
        {examData.thinBankWarning && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
            <p className="text-xs text-amber-700 dark:text-amber-400 text-center max-w-3xl mx-auto">
              {examData.studentNote}
            </p>
          </div>
        )}

        {/* Scrollable question area */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="max-w-3xl mx-auto">
            {/* Question navigator dots */}
            <div className="flex flex-wrap gap-1.5 mb-5">
              {items.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-6 w-6 rounded-full text-xs font-medium transition-all border
                    ${i === currentIndex
                      ? "bg-indigo-600 text-white border-indigo-600 scale-110"
                      : answers[item.id]
                      ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700"
                      : "bg-muted text-muted-foreground border-border hover:border-indigo-300"
                    }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {/* Current question */}
            <Card>
              <CardContent className="pt-5 pb-5">
                {currentItem && (
                  <QuestionCard
                    item={currentItem}
                    index={currentIndex}
                    total={items.length}
                    answer={answers[currentItem.id] ?? ""}
                    onAnswer={handleAnswer}
                    disabled={submitMutation.isPending}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t bg-background px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentIndex === 0 || submitMutation.isPending}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              {currentIndex < items.length - 1 ? (
                <Button
                  size="sm"
                  onClick={handleNext}
                  disabled={submitMutation.isPending}
                  className="gap-1"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    if (unansweredCount > 0) {
                      toast.warning(`You have ${unansweredCount} unanswered question${unansweredCount > 1 ? "s" : ""}. Submit anyway?`, {
                        action: {
                          label: "Submit",
                          onClick: handleSubmit,
                        },
                      });
                    } else {
                      handleSubmit();
                    }
                  }}
                  disabled={submitMutation.isPending}
                  className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {submitMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                  ) : (
                    <>Submit Exam<ChevronRight className="h-4 w-4" /></>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE: REVIEW (per-question feedback)
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === "review") {
    const scoreInfo = getScoreLabel(percentage);
    const resultMap = new Map(results.map((r) => [r.questionId, r]));

    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
        {/* Score banner */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-5 text-white">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-indigo-200 text-sm mb-1">Exam Prep Complete</p>
                <h2 className="text-2xl font-bold">{scoreInfo.emoji} {score}/{total} correct</h2>
                <p className={`text-sm font-semibold mt-1 ${scoreInfo.color.replace("text-", "text-white/90 ")}`}>
                  {percentage}% — {scoreInfo.label}
                </p>
              </div>
              <div className="text-right">
                <p className="text-indigo-200 text-xs">Time taken</p>
                <p className="text-white font-semibold">
                  {Math.floor(timeTakenSeconds / 60)}m {timeTakenSeconds % 60}s
                </p>
              </div>
            </div>
            <Progress
              value={percentage}
              className="mt-3 h-2 bg-white/20 [&>div]:bg-white"
            />
          </div>
        </Card>

        {/* Per-question review */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Question Review
          </h3>
          {items.map((item, i) => {
            const result = resultMap.get(item.id);
            if (!result) return null;
            return (
              <ReviewCard
                key={item.id}
                item={item}
                index={i}
                answer={answers[item.id] ?? ""}
                result={result}
              />
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => setPhase("summary")}
          >
            <Star className="h-4 w-4" />
            View Summary
          </Button>
          <Button
            className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleRetry}
          >
            <Sparkles className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE: SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === "summary") {
    const scoreInfo = getScoreLabel(percentage);

    // Group results by skill tag
    const bySkill: Record<string, { correct: number; total: number }> = {};
    for (const r of results) {
      if (!bySkill[r.skillTag]) bySkill[r.skillTag] = { correct: 0, total: 0 };
      bySkill[r.skillTag].total++;
      if (r.isCorrect) bySkill[r.skillTag].correct++;
    }

    // Group results by difficulty
    const byDiff: Record<string, { correct: number; total: number }> = {};
    for (const r of results) {
      if (!byDiff[r.difficulty]) byDiff[r.difficulty] = { correct: 0, total: 0 };
      byDiff[r.difficulty].total++;
      if (r.isCorrect) byDiff[r.difficulty].correct++;
    }

    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
        {/* Trophy card */}
        <Card className="text-center overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white">
            <Trophy className="h-12 w-12 mx-auto mb-2 text-yellow-300" />
            <h2 className="text-2xl font-bold">{scoreInfo.emoji} {percentage}%</h2>
            <p className="text-indigo-200 text-sm mt-1">{scoreInfo.label} — {score} of {total} correct</p>
          </div>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">{examData?.studentNote}</p>
          </CardContent>
        </Card>

        {/* By difficulty */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Performance by Difficulty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(["easy", "medium", "hard", "challenge"] as const).map((diff) => {
              const stats = byDiff[diff];
              if (!stats) return null;
              const pct = Math.round((stats.correct / stats.total) * 100);
              const cfg = DIFFICULTY_CONFIG[diff];
              return (
                <div key={diff} className="flex items-center gap-3">
                  <Badge variant="outline" className={`text-xs w-20 justify-center shrink-0 ${cfg.color}`}>
                    {cfg.label}
                  </Badge>
                  <Progress value={pct} className="flex-1 h-2" />
                  <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                    {stats.correct}/{stats.total} ({pct}%)
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* By skill */}
        {Object.keys(bySkill).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Performance by Skill</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(bySkill)
                .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
                .map(([tag, stats]) => {
                  const pct = Math.round((stats.correct / stats.total) * 100);
                  return (
                    <div key={tag} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-28 shrink-0 truncate">{tag}</span>
                      <Progress value={pct} className="flex-1 h-2" />
                      <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                        {stats.correct}/{stats.total} ({pct}%)
                      </span>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => setPhase("review")}
          >
            <BookOpen className="h-4 w-4" />
            Review Answers
          </Button>
          <Button
            className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleRetry}
          >
            <Sparkles className="h-4 w-4" />
            New Session
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-2 text-muted-foreground"
          onClick={() => setLocation("/tutor?mode=exam_prep")}
        >
          <Sparkles className="h-4 w-4" />
          Continue with AI Tutor in Exam Prep mode
        </Button>
      </div>
    );
  }

  return null;
}
