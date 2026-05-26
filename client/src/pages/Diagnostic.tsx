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
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

type ChoiceItem = { label: string; text: string };

type DiagnosticQuestion = {
  id: number;
  questionId: string;
  questionText: string;
  questionType: "multiple_choice" | "short_answer";
  choices: ChoiceItem[] | null;
  mapsToUnit: string;
  difficulty: "easy" | "medium";
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

export default function Diagnostic() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  const { data: questions, isLoading } = trpc.diagnostic.getQuestions.useQuery(undefined, {
    enabled: started,
  });
  const { data: existingAttempt } = trpc.diagnostic.getLatestAttempt.useQuery(undefined, {
    enabled: !!user,
  });

  const submitMutation = trpc.diagnostic.submitDiagnostic.useMutation({
    onSuccess: (data) => {
      setResult(data as DiagnosticResult);
    },
    onError: (err) => {
      toast.error("Submission error: " + err.message);
    },
  });

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

  // Show existing result
  if (existingAttempt && !started && !result) {
    const attempt = existingAttempt as any;
    return (
      <div className="p-6 space-y-6 page-enter max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Placement Diagnostic</h1>
          <p className="text-muted-foreground text-sm mt-1">Algebra I · 30 Questions</p>
        </div>

        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Diagnostic Completed
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
            <div className="flex gap-3">
              <Button onClick={() => setLocation("/curriculum")} className="flex-1">
                Go to Curriculum
              </Button>
              <Button
                variant="outline"
                onClick={() => { setStarted(true); setAnswers({}); setCurrentIndex(0); }}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Retake
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show result after submission
  if (result) {
    return (
      <div className="p-6 space-y-6 page-enter max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Diagnostic Results</h1>
          <p className="text-muted-foreground text-sm mt-1">Completed {new Date().toLocaleDateString()}</p>
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{result.overallScore}%</p>
              <p className="text-sm text-muted-foreground mt-1">Overall Score</p>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{result.prerequisiteScore}/6</p>
              <p className="text-sm text-muted-foreground mt-1">Prerequisite Skills</p>
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

        {/* Unit Results */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Unit Breakdown</h2>
          <div className="space-y-2">
            {result.unitResults.map((ur) => (
              <div key={ur.unitNumber} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  ur.status === "likely_mastered" ? "bg-green-100 text-green-700" :
                  ur.status === "partial_understanding" ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {ur.unitNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{ur.unitTitle}</p>
                  <p className="text-xs text-muted-foreground">{ur.correct}/{ur.total} correct</p>
                </div>
                <Badge
                  className={`text-xs shrink-0 ${
                    ur.status === "likely_mastered" ? "bg-green-100 text-green-700 border-green-200" :
                    ur.status === "partial_understanding" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                    "bg-red-100 text-red-700 border-red-200"
                  }`}
                >
                  {ur.status === "likely_mastered" ? "Likely Mastered" :
                   ur.status === "partial_understanding" ? "Partial" : "Needs Work"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Answer Review */}
        <div className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnswers(!showAnswers)}
            className="gap-2"
          >
            {showAnswers ? "Hide" : "Review"} Answers
          </Button>
          {showAnswers && (
            <div className="space-y-2">
              {result.gradedAnswers.map((a, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${a.correct ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
                  <div className="flex items-start gap-2">
                    {a.correct ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-muted-foreground">{a.questionId}</p>
                      {!a.correct && (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs text-muted-foreground">Your answer: <span className="font-medium text-red-700">{a.answer}</span></p>
                          <p className="text-xs text-muted-foreground">Correct: <span className="font-medium text-green-700">{a.correctAnswer}</span></p>
                          {a.explanation && <p className="text-xs text-muted-foreground mt-1">{a.explanation}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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

  // Start screen
  if (!started) {
    return (
      <div className="p-6 space-y-6 page-enter max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Placement Diagnostic</h1>
          <p className="text-muted-foreground text-sm mt-1">Algebra I · Katy ISD</p>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">30-Question Diagnostic Assessment</h2>
                <p className="text-sm text-muted-foreground">~20–30 minutes</p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>This diagnostic will:</p>
              <ul className="space-y-1.5 ml-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  Assess prerequisite skills (pre-algebra foundations)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  Test concepts across all 12 Algebra I units
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

            <Button onClick={() => setStarted(true)} className="w-full gap-2" size="lg">
              <ArrowRight className="h-4 w-4" />
              Begin Diagnostic
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading questions
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
  const progressPct = ((currentIndex) / totalQ) * 100;
  const currentAnswer = answers[currentQ.questionId] ?? "";

  const handleNext = () => {
    if (currentIndex < totalQ - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      // Submit
      const answerArray = questions.map((q: DiagnosticQuestion) => ({
        questionId: q.questionId,
        answer: answers[q.questionId] ?? "",
      }));
      submitMutation.mutate({ answers: answerArray });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  return (
    <div className="p-6 space-y-6 page-enter max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Placement Diagnostic</h1>
          <p className="text-xs text-muted-foreground">
            Question {currentIndex + 1} of {totalQ}
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {currentQ.mapsToUnit === "prerequisite" ? "Prerequisites" : `Unit ${currentQ.mapsToUnit}`}
        </Badge>
      </div>

      {/* Progress */}
      <Progress value={progressPct} className="h-1.5" />

      {/* Question Card */}
      <Card className="border shadow-sm">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start gap-3">
            <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
              {currentIndex + 1}
            </span>
            <p className="text-base font-medium text-foreground leading-relaxed math-expr">
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
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex gap-1">
          {questions.slice(Math.max(0, currentIndex - 2), Math.min(totalQ, currentIndex + 3)).map((_, relIdx) => {
            const absIdx = Math.max(0, currentIndex - 2) + relIdx;
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

        <Button
          onClick={handleNext}
          disabled={!currentAnswer || submitMutation.isPending}
          className="gap-2"
        >
          {submitMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : currentIndex === totalQ - 1 ? (
            <>Submit<CheckCircle2 className="h-4 w-4" /></>
          ) : (
            <>Next<ArrowRight className="h-4 w-4" /></>
          )}
        </Button>
      </div>

      {/* Answer progress dots */}
      <div className="flex flex-wrap gap-1 justify-center">
        {questions.map((q: DiagnosticQuestion, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 w-2 rounded-full transition-all ${
              idx === currentIndex ? "bg-primary scale-125" :
              answers[q.questionId] ? "bg-green-400" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
