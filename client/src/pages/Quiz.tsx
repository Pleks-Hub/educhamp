import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { useCelebration } from "@/components/CelebrationOverlay";
import { useLocation, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Star,
  Timer,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { CourseContextBanner } from "@/components/CourseContextBanner";
import { FlagQuestionButton } from "@/components/FlagQuestionButton";
import { useExamTimer } from "@/hooks/useExamTimer";
import { ExamTimerBar } from "@/components/ExamTimerBar";
import { MathAnswerInput } from "@/components/MathAnswerInput";

type ChoiceItem = { label: string; text: string };

type QuizQuestion = {
  id: number;
  questionText: string;
  questionType: "multiple_choice" | "short_answer" | "open_response";
  choices: ChoiceItem[] | null;
  difficulty: "easy" | "medium" | "hard" | "challenge";
  skillTag?: string;
};

function parseChoices(raw: unknown): ChoiceItem[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as ChoiceItem[]; } catch { return []; }
  }
  if (Array.isArray(raw)) return raw as ChoiceItem[];
  return [];
}

type QuizResult = {
  score: number;
  correctCount: number;
  totalQuestions: number;
  masteryLabel: string;
  adaptivePath: string;
  results: Array<{
    questionId: number;
    questionText: string;
    yourAnswer: string;
    correctAnswer: string;
    correct: boolean;
    explanation: string;
    skillTag: string;
    difficulty: string;
  }>;
};

const DIFFICULTY_CONFIG = {
  easy: { label: "Easy", color: "bg-green-100 text-green-700 border-green-200" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  hard: { label: "Hard", color: "bg-orange-100 text-orange-700 border-orange-200" },
  challenge: { label: "Challenge", color: "bg-red-100 text-red-700 border-red-200" },
};

function getMasteryLabel(score: number): string {
  if (score < 60) return "Beginner";
  if (score < 75) return "Developing";
  if (score < 90) return "Approaching";
  if (score < 100) return "Mastered";
  return "Advanced";
}

function getMasteryColor(score: number): string {
  if (score < 60) return "text-red-600";
  if (score < 75) return "text-orange-600";
  if (score < 90) return "text-yellow-600";
  if (score < 100) return "text-green-600";
  return "text-blue-600";
}

export default function Quiz() {
  const { user } = useAuth();
  const params = useParams<{ unitNumber: string }>();
  const unitNumber = parseInt(params.unitNumber ?? "1", 10);
  const [, setLocation] = useLocation();

  const { celebrate } = useCelebration();

  // Young learner / parent-led mode detection
  const { data: personalization } = trpc.onboarding.getPersonalization.useQuery(undefined, { enabled: !!user });
  const isYoungLearner = ["Pre-K", "Kindergarten", "Grade 1", "Grade 2"].includes(user?.grade ?? "");
  const showReadAloud = isYoungLearner || !!(personalization as any)?.parentLedMode;

  const [started, setStarted] = useState(false);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // Per-question timing
  const [questionTimings, setQuestionTimings] = useState<{ questionId: number; seconds: number }[]>([]);
  const questionStartRef = useRef<number>(Date.now());

  // Fetch dashboard for timed exam settings, active course, and next unit after quiz completion
  const { data: dashboard } = trpc.progress.getDashboard.useQuery(undefined, { enabled: !!user });
  const activeCourseId = dashboard?.activeCourseId ?? undefined;

  const { data: unit } = trpc.curriculum.getUnit.useQuery(
    { unitNumber, courseId: activeCourseId },
    { enabled: !isNaN(unitNumber) && !!activeCourseId }
  );
  const { data: questions, isLoading } = trpc.quiz.getQuestions.useQuery(
    { unitId: unit?.id ?? 0 },
    { enabled: started && !!unit?.id }
  );

  const isTimedExam = dashboard?.isTimedExam ?? false;
  const timeLimitMinutes = dashboard?.timeLimitMinutes ?? null;

  // ── Auto-submit handler (called when timer expires) ──────────────────────
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const unitRef = useRef(unit);
  unitRef.current = unit;

  const handleAutoSubmit = useCallback(() => {
    if (!questionsRef.current || !unitRef.current) return;
    toast.warning("Time's up! Submitting your answers automatically.");
    const answerArray = (questionsRef.current as QuizQuestion[]).map((q) => ({
      questionId: q.id,
      answer: answersRef.current[String(q.id)] ?? "",
    }));
    submitMutation.mutate({
      unitNumber,
      unitId: unitRef.current.id,
      unitTitle: unitRef.current.title ?? "",
      answers: answerArray,
      isPracticeMode,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitNumber, isPracticeMode]);

  const examTimer = useExamTimer(
    isTimedExam ? timeLimitMinutes : null,
    handleAutoSubmit
  );

  // Start exam timer when quiz starts
  useEffect(() => {
    if (started && isTimedExam && timeLimitMinutes) {
      examTimer.start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, isTimedExam, timeLimitMinutes]);

  const submitMutation = trpc.quiz.submitQuiz.useMutation({
    onSuccess: (data) => {
      const result = data as unknown as QuizResult;
      setResult(result);
      examTimer.pause();
      // Trigger celebration based on score
      if (result.score === 100) {
        celebrate("quiz_perfect", "Perfect Score! 🏆");
      } else if (result.score >= 75) {
        celebrate("quiz_pass", `${result.score}% — Great Work! 🎉`);
      }
      toast.success("Quiz submitted! Results ready.");
    },
    onError: (err) => {
      toast.error("Submission error: " + err.message);
    },
  });

  // Elapsed time tracker (for non-timed quizzes)
  useEffect(() => {
    if (!started || result) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [started, result]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <Star className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">Sign in to take the quiz</h2>
          <Button onClick={() => { window.location.href = getLoginUrl(); }}>Sign in</Button>
        </div>
      </div>
    );
  }

  // Result screen
  if (result) {
    const resultWithPractice = result as QuizResult & { isPracticeMode?: boolean };
    const showPracticeBadge = resultWithPractice.isPracticeMode;
    return (
      <div className="p-6 space-y-6 page-enter max-w-3xl">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quiz Complete!</h1>
            <p className="text-muted-foreground text-sm mt-1">Unit {unitNumber}: {unit?.title}</p>
          </div>
          {showPracticeBadge && (
            <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
              <BookOpen className="h-3 w-3" /> Practice Mode
            </span>
          )}
        </div>

        {/* Score Banner */}
        <Card className={`border-2 ${result.score >= 90 ? "border-green-300 bg-green-50/50" : result.score >= 75 ? "border-yellow-300 bg-yellow-50/50" : "border-red-300 bg-red-50/50"}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-5xl font-bold text-foreground">{result.score}%</p>
                <p className={`text-lg font-semibold mt-1 ${getMasteryColor(result.score)}`}>
                  {getMasteryLabel(result.score)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.correctCount}/{result.totalQuestions} correct · {formatTime(elapsed)}
                </p>
              </div>
              <div className="text-right">
                {result.score >= 90 ? (
                  <Trophy className="h-16 w-16 text-amber-500 mx-auto" />
                ) : result.score >= 75 ? (
                  <Star className="h-16 w-16 text-yellow-500 mx-auto" />
                ) : (
                  <Zap className="h-16 w-16 text-blue-500 mx-auto" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Adaptive Path Message */}
        <Card className="border border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground mb-1">What's Next</p>
            <p className="text-sm text-muted-foreground">{result.adaptivePath}</p>
          </CardContent>
        </Card>

        {/* Time-per-question breakdown (shown when timings were recorded) */}
        {questionTimings.length > 0 && (
          <Card className="border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Time Per Question</p>
              </div>
              <div className="space-y-1.5">
                {result.results.map((r, idx) => {
                  const timing = questionTimings.find((t) => t.questionId === r.questionId);
                  const secs = timing?.seconds ?? 0;
                  const maxSecs = Math.max(...questionTimings.map((t) => t.seconds), 1);
                  const pct = Math.min((secs / maxSecs) * 100, 100);
                  return (
                    <div key={r.questionId} className="flex items-center gap-2 text-xs">
                      <span className="w-6 text-right text-muted-foreground font-mono">Q{idx + 1}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            r.correct ? "bg-green-400" : "bg-red-400"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-14 text-right text-muted-foreground">
                        {secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Total: {(() => { const t = questionTimings.reduce((s, x) => s + x.seconds, 0); return t >= 60 ? `${Math.floor(t / 60)}m ${t % 60}s` : `${t}s`; })()} · Avg: {questionTimings.length ? Math.round(questionTimings.reduce((s, x) => s + x.seconds, 0) / questionTimings.length) : 0}s/question
              </p>
            </CardContent>
          </Card>
        )}

        {/* Answer Review Toggle */}
        <Button variant="outline" size="sm" onClick={() => setShowAnswers(!showAnswers)}>
          {showAnswers ? "Hide" : "Review"} Answers
        </Button>

        {showAnswers && (
          <div className="space-y-2">
            {result.results.map((a, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${a.correct ? "border-green-200 bg-green-50/40" : "border-red-200 bg-red-50/40"}`}>
                <div className="flex items-start gap-2">
                  {a.correct ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-muted-foreground">{a.skillTag} · {a.difficulty}</p>
                    {!a.correct && (
                      <div className="mt-1 space-y-0.5">
                        <p className="text-xs text-muted-foreground">Your answer: <span className="font-medium text-red-700">{a.yourAnswer || "(blank)"}</span></p>
                        <p className="text-xs text-muted-foreground">Correct: <span className="font-medium text-green-700">{a.correctAnswer}</span></p>
                        {a.explanation && <p className="text-xs text-muted-foreground mt-1 italic">{a.explanation}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => setLocation(`/curriculum/unit/${unitNumber}`)} className="flex-1">
            Back to Unit
          </Button>
          {result.score < 75 && (
            <Button variant="outline" onClick={() => setLocation(`/tutor?unit=${unitNumber}`)}>
              Get Tutoring
            </Button>
          )}
          {result.score >= 75 && (() => {
            // Find the next unit in the course (by sortOrder/unitNumber)
            const allUnits = dashboard?.units ?? [];
            const currentIdx = allUnits.findIndex((u) => u.unitNumber === unitNumber);
            const nextUnit = currentIdx >= 0 ? allUnits[currentIdx + 1] : undefined;
            return nextUnit ? (
              <Button variant="outline" onClick={() => setLocation(`/curriculum/unit/${nextUnit.unitNumber}`)}>
                Next Unit: {nextUnit.title}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setLocation("/curriculum")}>
                View Curriculum
              </Button>
            );
          })()}
        </div>
      </div>
    );
  }

  // Start screen
  if (!started) {
    return (
      <div className="px-4 py-6 sm:p-6 space-y-6 page-enter max-w-2xl mx-auto">
        <CourseContextBanner />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => setLocation(`/curriculum/unit/${unitNumber}`)} className="hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Unit {unitNumber}
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Unit {unitNumber} Quiz</h1>
          <p className="text-muted-foreground text-sm mt-1">{unit?.title}</p>
        </div>

        {/* Timed Exam Warning Banner */}
        {isTimedExam && timeLimitMinutes && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
            <Timer className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Timed Exam</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                This is a timed exam. You have <strong>{timeLimitMinutes} minutes</strong> to complete all questions.
                The exam will auto-submit when time runs out.
              </p>
            </div>
          </div>
        )}

        <Card className="border shadow-sm">
          <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-2xl font-bold">15</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                {isTimedExam && timeLimitMinutes ? (
                  <>
                    <p className="text-2xl font-bold">{timeLimitMinutes}</p>
                    <p className="text-xs text-muted-foreground">Minutes (Timed)</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold">~20</p>
                    <p className="text-xs text-muted-foreground">Minutes</p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">Difficulty breakdown:</p>
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-2">
                {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => (
                  <div key={key} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs ${cfg.color}`}>
                    <span className="font-medium">{cfg.label}</span>
                    <span className="text-muted-foreground ml-auto">
                      {key === "easy" ? "4" : key === "medium" ? "5" : key === "hard" ? "4" : "2"} questions
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-sm">
              <p className="font-medium text-foreground mb-1">Mastery Thresholds</p>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• Below 60% → Remediation mode unlocked</li>
                <li>• 60–74% → Guided practice recommended</li>
                <li>• 75–89% → Next unit unlocked</li>
                <li>• 90%+ → Challenge content unlocked</li>
              </ul>
            </div>

            {/* Practice mode toggle — only shown for timed courses */}
            {isTimedExam && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20">
                <div>
                  <p className="text-sm font-medium text-foreground">Practice Mode</p>
                  <p className="text-xs text-muted-foreground">Timed, but won't affect your mastery score</p>
                </div>
                <button
                  onClick={() => setIsPracticeMode((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    isPracticeMode ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPracticeMode ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            )}

            <Button
              onClick={() => { questionStartRef.current = Date.now(); setStarted(true); }}
              className="w-full gap-2"
              size="lg"
              variant={isPracticeMode ? "outline" : "default"}
            >
              {isPracticeMode ? <BookOpen className="h-4 w-4" /> : isTimedExam ? <Timer className="h-4 w-4" /> : <Star className="h-4 w-4" />}
              {isPracticeMode ? "Start Practice (No Score Impact)" : isTimedExam ? "Start Timed Exam" : "Start Quiz"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !questions) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          <button onClick={() => setLocation(`/curriculum/unit/${unitNumber}`)} className="hover:text-foreground transition-colors">Unit {unitNumber}</button>
          <ChevronRight className="h-3 w-3" />
          <span>Quiz</span>
        </div>
        <Card className="border-2 border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
              <BookOpen className="h-6 w-6 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Quiz Coming Soon</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Quiz questions for this unit are being prepared by your teacher. Check back soon, or continue studying the lessons in the meantime.
            </p>
            <Button variant="outline" onClick={() => setLocation(`/curriculum/unit/${unitNumber}`)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Unit
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = questions[currentIndex] as QuizQuestion;
  const totalQ = questions.length;
  const progressPct = (currentIndex / totalQ) * 100;
  const currentAnswer = answers[String(currentQ.id)] ?? "";
  const diffConfig = DIFFICULTY_CONFIG[currentQ.difficulty] ?? DIFFICULTY_CONFIG.medium;

  // Record time spent on the current question before advancing
  const recordCurrentTiming = () => {
    if (!questions) return;
    const q = (questions as QuizQuestion[])[currentIndex];
    if (!q) return;
    const seconds = Math.round((Date.now() - questionStartRef.current) / 1000);
    setQuestionTimings((prev) => {
      const existing = prev.findIndex((t) => t.questionId === q.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { questionId: q.id, seconds: (updated[existing]?.seconds ?? 0) + seconds };
        return updated;
      }
      return [...prev, { questionId: q.id, seconds }];
    });
    questionStartRef.current = Date.now();
  };

  const handleNext = () => {
    recordCurrentTiming();
    if (currentIndex < totalQ - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      const answerArray = (questions as QuizQuestion[]).map((q) => ({
        questionId: q.id,
        answer: answers[String(q.id)] ?? "",
      }));
      submitMutation.mutate({ unitNumber, unitId: unit?.id ?? 0, unitTitle: unit?.title ?? "", answers: answerArray, questionTimings, isPracticeMode });
    }
  };

  return (
    <div className="px-4 py-6 sm:p-6 space-y-4 page-enter max-w-2xl mx-auto">
      {/* Exam Timer Bar (shown only for timed exams) */}
      {isTimedExam && (
        <ExamTimerBar
          formattedTime={examTimer.formattedTime}
          percentRemaining={examTimer.percentRemaining}
          status={examTimer.status}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-foreground">Unit {unitNumber} Quiz</h1>
          <p className="text-xs text-muted-foreground">Question {currentIndex + 1} of {totalQ}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Show elapsed time only for non-timed quizzes */}
          {!isTimedExam && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(elapsed)}
            </div>
          )}
          <Badge className={`text-xs ${diffConfig.color}`}>{diffConfig.label}</Badge>
        </div>
      </div>

      <Progress value={progressPct} className="h-1.5" />

      {/* Question */}
      <Card className="border shadow-sm">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start gap-3">
            <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
              {currentIndex + 1}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {currentQ.skillTag && <span className="text-xs font-mono text-muted-foreground">{currentQ.skillTag}</span>}
                <span className="text-xs text-muted-foreground capitalize">{currentQ.difficulty}</span>
              </div>
              <div className="flex items-center justify-between mb-1">
                {showReadAloud && currentQ.questionText ? (
                  <ReadAloudButton text={currentQ.questionText} className="" />
                ) : <span />}
                <FlagQuestionButton questionType="quiz" questionId={currentQ.id} />
              </div>
              <p className="text-base font-medium text-foreground leading-relaxed math-expr">
                {currentQ.questionText}
              </p>
            </div>
          </div>

          {currentQ.questionType === "multiple_choice" && parseChoices(currentQ.choices).length > 0 && (
            <RadioGroup
              value={currentAnswer}
              onValueChange={(val) => setAnswers((prev) => ({ ...prev, [String(currentQ.id)]: val }))}
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
                  onClick={() => setAnswers((prev) => ({ ...prev, [String(currentQ.id)]: choice.label }))}
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

          {/* Fallback: multiple_choice with empty/null choices — show text input */}
          {currentQ.questionType === "multiple_choice" && parseChoices(currentQ.choices).length === 0 && (
            <div className="space-y-2">
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                This question's answer choices are unavailable. Please type your answer below.
              </div>
              <MathAnswerInput
                id={`fallback-${currentQ.id}`}
                value={currentAnswer}
                onChange={(val) => setAnswers((prev) => ({ ...prev, [String(currentQ.id)]: val }))}
                onEnter={handleNext}
                label="Your answer:"
              />
            </div>
          )}

          {currentQ.questionType === "short_answer" && (
            <MathAnswerInput
              id={`short-answer-${currentQ.id}`}
              value={currentAnswer}
              onChange={(val) => setAnswers((prev) => ({ ...prev, [String(currentQ.id)]: val }))}
              onEnter={handleNext}
              label="Your answer:"
            />
          )}

          {currentQ.questionType === "open_response" && (
            <div className="space-y-2">
              <Label htmlFor={`open-response-${currentQ.id}`} className="text-sm text-muted-foreground">Write your response:</Label>
              <Textarea
                id={`open-response-${currentQ.id}`}
                value={currentAnswer}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [String(currentQ.id)]: e.target.value }))}
                placeholder="Write your full response here..."
                className="text-sm min-h-[120px] resize-y"
                rows={5}
              />
              <p className="text-xs text-muted-foreground">Show your work and explain your reasoning for full credit.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>

        {/* Dot progress */}
        <div className="flex gap-1">
          {(questions as QuizQuestion[]).map((q, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 w-2 rounded-full transition-all ${
                idx === currentIndex ? "bg-primary scale-125" :
                answers[String(q.id)] ? "bg-green-400" : "bg-muted"
              }`}
            />
          ))}
        </div>

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
      </div>
    </div>
  );
}
