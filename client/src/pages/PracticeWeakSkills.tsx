import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MathAnswerInput } from "@/components/MathAnswerInput";
import { AlertTriangle, ArrowLeft, CheckCircle2, XCircle, Target, Zap, Trophy, RotateCcw } from "lucide-react";
import { useCelebration } from "@/components/CelebrationOverlay";
import { toast } from "sonner";

type PracticeState = "select" | "quiz" | "results";

export default function PracticeWeakSkills() {
  const [state, setState] = useState<PracticeState>("select");
  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([]);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("mixed");
  const [questionCount, setQuestionCount] = useState(10);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showExplanation, setShowExplanation] = useState<number | null>(null);

  const { data: weakSkillsData, isLoading } = trpc.skillPractice.getWeakSkills.useQuery({
    threshold: 75,
  });

  const { data: questions, isLoading: questionsLoading } = trpc.skillPractice.getPracticeQuestions.useQuery(
    { unitIds: selectedUnitIds, count: questionCount, difficulty },
    { enabled: state === "quiz" && selectedUnitIds.length > 0 }
  );

  const { celebrate } = useCelebration();
  const celebratedRef = useRef(false);

  // Query review stats to detect when all reviews are done
  const reviewStatsQuery = trpc.skillPractice.getReviewStats.useQuery(undefined, {
    enabled: state === "results",
    staleTime: 0,
  });

  // Trigger celebration when all reviews are done after submitting practice
  useEffect(() => {
    if (
      state === "results" &&
      reviewStatsQuery.data &&
      reviewStatsQuery.data.dueNow === 0 &&
      reviewStatsQuery.data.totalScheduled > 0 &&
      !celebratedRef.current
    ) {
      celebratedRef.current = true;
      celebrate("reviews_complete", "All Reviews Done! 🎉");
    }
  }, [state, reviewStatsQuery.data, celebrate]);

  const submitMutation = trpc.skillPractice.submitPractice.useMutation({
    onSuccess: (data) => {
      setState("results");
      // Trigger celebration for great scores
      const pct = data.percentage ?? 0;
      if (pct === 100) {
        celebrate("quiz_perfect", "Perfect Practice!");
      } else if (pct >= 80) {
        celebrate("quiz_pass", "Great Practice!");
      }
      // Invalidate review stats so the effect above can detect all-done state
      reviewStatsQuery.refetch();
    },
    onError: () => {
      toast.error("Failed to submit practice. Please try again.");
    },
  });

  // Group weak skills by unit
  const skillsByUnit = useMemo(() => {
    if (!weakSkillsData?.weakSkills) return [];
    const map = new Map<number, { unitId: number; unitTitle: string; unitNumber: number; skills: typeof weakSkillsData.weakSkills }>();
    for (const skill of weakSkillsData.weakSkills) {
      if (!map.has(skill.unitId)) {
        map.set(skill.unitId, { unitId: skill.unitId, unitTitle: skill.unitTitle, unitNumber: skill.unitNumber, skills: [] });
      }
      map.get(skill.unitId)!.skills.push(skill);
    }
    return Array.from(map.values()).sort((a, b) => a.unitNumber - b.unitNumber);
  }, [weakSkillsData]);

  const toggleUnit = (unitId: number) => {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  const startPractice = () => {
    if (selectedUnitIds.length === 0) {
      toast.error("Please select at least one unit to practice.");
      return;
    }
    setAnswers({});
    setCurrentQuestion(0);
    setShowExplanation(null);
    setState("quiz");
  };

  const handleAnswer = (questionId: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = () => {
    if (!questions) return;
    const answerArray = questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] ?? "",
    }));
    submitMutation.mutate({ answers: answerArray });
  };

  const resetPractice = () => {
    setState("select");
    setSelectedUnitIds([]);
    setAnswers({});
    setCurrentQuestion(0);
    setShowExplanation(null);
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // ─── SELECT SKILLS STATE ──────────────────────────────────────────────────────
  if (state === "select") {
    const allMastered = weakSkillsData && weakSkillsData.weakSkills.length === 0;

    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Practice Weak Skills
          </h1>
          <p className="text-muted-foreground mt-1">
            Focus on skills below 75% mastery to improve your understanding.
          </p>
        </div>

        {/* Progress overview */}
        {weakSkillsData && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Skills Mastered: {weakSkillsData.masteredCount} / {weakSkillsData.totalSkills}
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round((weakSkillsData.masteredCount / Math.max(weakSkillsData.totalSkills, 1)) * 100)}%
                </span>
              </div>
              <Progress
                value={(weakSkillsData.masteredCount / Math.max(weakSkillsData.totalSkills, 1)) * 100}
                className="h-3"
              />
            </CardContent>
          </Card>
        )}

        {allMastered ? (
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CardContent className="pt-6 text-center">
              <Trophy className="h-12 w-12 mx-auto text-green-600 mb-3" />
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">All Skills Mastered!</h3>
              <p className="text-green-600 dark:text-green-400 mt-1">
                Congratulations! All your skills are at or above 75% mastery. Keep up the great work!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Unit selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Units to Practice</CardTitle>
                <CardDescription>
                  Choose units with weak skills. Questions will be drawn from these units.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {skillsByUnit.map((group) => (
                  <div
                    key={group.unitId}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedUnitIds.includes(group.unitId)
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleUnit(group.unitId)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">
                          Unit {group.unitNumber}: {group.unitTitle}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {group.skills.length} weak skill{group.skills.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {group.skills.map((skill) => (
                          <Badge
                            key={skill.skillId}
                            variant={skill.priority === "critical" ? "destructive" : skill.priority === "high" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {skill.score}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Practice settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Practice Settings</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Number of Questions</Label>
                  <Select value={String(questionCount)} onValueChange={(v) => setQuestionCount(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 questions</SelectItem>
                      <SelectItem value="10">10 questions</SelectItem>
                      <SelectItem value="15">15 questions</SelectItem>
                      <SelectItem value="20">20 questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mixed">Mixed (recommended)</SelectItem>
                      <SelectItem value="easy">Easy only</SelectItem>
                      <SelectItem value="medium">Medium only</SelectItem>
                      <SelectItem value="hard">Hard only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Button
              size="lg"
              className="w-full"
              onClick={startPractice}
              disabled={selectedUnitIds.length === 0}
            >
              <Zap className="h-4 w-4 mr-2" />
              Start Practice ({selectedUnitIds.length} unit{selectedUnitIds.length !== 1 ? "s" : ""} selected)
            </Button>
          </>
        )}
      </div>
    );
  }

  // ─── QUIZ STATE ───────────────────────────────────────────────────────────────
  if (state === "quiz") {
    if (questionsLoading || !questions) {
      return (
        <div className="container max-w-3xl py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }

    if (questions.length === 0) {
      return (
        <div className="container max-w-3xl py-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-3" />
          <h2 className="text-xl font-semibold">No Questions Available</h2>
          <p className="text-muted-foreground mt-1">
            No practice questions found for the selected units and difficulty. Try different settings.
          </p>
          <Button variant="outline" className="mt-4" onClick={resetPractice}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Selection
          </Button>
        </div>
      );
    }

    const q = questions[currentQuestion];
    const answeredCount = Object.keys(answers).length;
    const progress = (answeredCount / questions.length) * 100;

    return (
      <div className="container max-w-3xl py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={resetPractice}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Exit Practice
          </Button>
          <span className="text-sm text-muted-foreground">
            Question {currentQuestion + 1} of {questions.length}
          </span>
        </div>

        <Progress value={progress} className="h-2" />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="capitalize">{q.difficulty}</Badge>
              <Badge variant="secondary">{q.skillTag}</Badge>
            </div>
            <CardTitle className="text-lg mt-3">{q.questionText}</CardTitle>
          </CardHeader>
          <CardContent>
            {q.questionType === "multiple_choice" && q.choices ? (
              <RadioGroup
                value={answers[q.id] ?? ""}
                onValueChange={(val) => handleAnswer(q.id, val)}
                className="space-y-3"
              >
                {(q.choices as { label: string; text: string }[]).map((choice) => (
                  <div
                    key={choice.label}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <RadioGroupItem value={choice.label} id={`${q.id}-${choice.label}`} />
                    <Label htmlFor={`${q.id}-${choice.label}`} className="flex-1 cursor-pointer">
                      <span className="font-medium mr-2">{choice.label}.</span>
                      {choice.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <MathAnswerInput
                id={`practice-answer-${q.id}`}
                value={answers[q.id] ?? ""}
                onChange={(val) => handleAnswer(q.id, val)}
                label="Your answer:"
              />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            disabled={currentQuestion === 0}
            onClick={() => setCurrentQuestion((p) => p - 1)}
          >
            Previous
          </Button>
          {currentQuestion < questions.length - 1 ? (
            <Button onClick={() => setCurrentQuestion((p) => p + 1)}>
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending || answeredCount === 0}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Practice"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── RESULTS STATE ────────────────────────────────────────────────────────────
  if (state === "results" && submitMutation.data) {
    const { results, score, total, percentage = 0 } = submitMutation.data;

    return (
      <div className="container max-w-3xl py-8 space-y-6">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
            percentage >= 80 ? "bg-green-100 text-green-600" :
            percentage >= 60 ? "bg-amber-100 text-amber-600" :
            "bg-red-100 text-red-600"
          }`}>
            <span className="text-2xl font-bold">{percentage}%</span>
          </div>
          <h2 className="text-2xl font-bold">Practice Complete!</h2>
          <p className="text-muted-foreground">
            You got {score} out of {total} correct.
          </p>
        </div>

        <div className="space-y-3">
          {results.map((result, idx) => {
            const q = questions?.[idx];
            return (
              <Card key={result.questionId} className={result.correct ? "border-green-200" : "border-red-200"}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    {result.correct ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{q?.questionText}</p>
                      {!result.correct && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Correct answer: <span className="font-medium text-foreground">{result.correctAnswer}</span>
                        </p>
                      )}
                      {showExplanation === result.questionId ? (
                        <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                          {result.explanation}
                        </p>
                      ) : (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto mt-1"
                          onClick={() => setShowExplanation(result.questionId)}
                        >
                          Show explanation
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* All reviews done banner */}
        {reviewStatsQuery.data && reviewStatsQuery.data.dueNow === 0 && reviewStatsQuery.data.totalScheduled > 0 && (
          <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 dark:border-emerald-800">
            <CardContent className="pt-5 pb-5 text-center">
              <div className="text-3xl mb-2 animate-bounce">\u2705</div>
              <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-300">All Reviews Complete!</h3>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                You&apos;ve finished all your due reviews for today. Your spaced repetition schedule is up to date!
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={resetPractice}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Selection
          </Button>
          <Button className="flex-1" onClick={() => {
            setAnswers({});
            setCurrentQuestion(0);
            setShowExplanation(null);
            setState("quiz");
          }}>
            <RotateCcw className="h-4 w-4 mr-2" /> Practice Again
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
