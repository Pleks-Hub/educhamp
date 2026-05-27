import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Star,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { CourseContextBanner } from "@/components/CourseContextBanner";

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

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const { data: unit } = trpc.curriculum.getUnit.useQuery({ unitNumber }, { enabled: !isNaN(unitNumber) });
  const { data: questions, isLoading } = trpc.quiz.getQuestions.useQuery(
    { unitId: unit?.id ?? 0 },
    { enabled: started && !!unit?.id }
  );
  // Fetch dashboard to determine next unit after quiz completion
  const { data: dashboard } = trpc.progress.getDashboard.useQuery(undefined, { enabled: !!result });

  const submitMutation = trpc.quiz.submitQuiz.useMutation({
    onSuccess: (data) => {
      setResult(data as unknown as QuizResult);
      toast.success("Quiz submitted! Results ready.");
    },
    onError: (err) => {
      toast.error("Submission error: " + err.message);
    },
  });

  // Timer
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
    return (
      <div className="p-6 space-y-6 page-enter max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quiz Complete!</h1>
          <p className="text-muted-foreground text-sm mt-1">Unit {unitNumber}: {unit?.title}</p>
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

        <div className="flex gap-3">
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
      <div className="p-6 space-y-6 page-enter max-w-2xl">
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

        <Card className="border shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-2xl font-bold">15</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-2xl font-bold">~20</p>
                <p className="text-xs text-muted-foreground">Minutes</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">Difficulty breakdown:</p>
              <div className="grid grid-cols-2 gap-2">
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

            <Button onClick={() => setStarted(true)} className="w-full gap-2" size="lg">
              <Star className="h-4 w-4" />
              Start Quiz
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

  const currentQ = questions[currentIndex] as QuizQuestion;
  const totalQ = questions.length;
  const progressPct = (currentIndex / totalQ) * 100;
  const currentAnswer = answers[String(currentQ.id)] ?? "";
  const diffConfig = DIFFICULTY_CONFIG[currentQ.difficulty] ?? DIFFICULTY_CONFIG.easy;

  const handleNext = () => {
    if (currentIndex < totalQ - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      const answerArray = (questions as QuizQuestion[]).map((q) => ({
        questionId: q.id,
        answer: answers[String(q.id)] ?? "",
      }));
      submitMutation.mutate({ unitNumber, unitId: unit?.id ?? 0, unitTitle: unit?.title ?? "", answers: answerArray });
    }
  };

  return (
    <div className="p-6 space-y-6 page-enter max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-foreground">Unit {unitNumber} Quiz</h1>
          <p className="text-xs text-muted-foreground">Question {currentIndex + 1} of {totalQ}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formatTime(elapsed)}
          </div>
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
              <p className="text-base font-medium text-foreground leading-relaxed math-expr">
                {currentQ.questionText}
              </p>
            </div>
          </div>

          {currentQ.questionType === "multiple_choice" && (
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

          {currentQ.questionType === "short_answer" && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Your answer:</Label>
              <Input
                value={currentAnswer}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [String(currentQ.id)]: e.target.value }))}
                placeholder="Type your answer..."
                className="text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
              />
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
