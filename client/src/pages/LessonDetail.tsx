import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  Target,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { useCelebration } from "@/components/CelebrationOverlay";

// ─── Exact types from schema.ts ───────────────────────────────────────────────

type WorkedExample = {
  title: string;
  problem: string;
  steps: { step: string; explanation: string }[];
  answer: string;
};

type GuidedProblem = {
  problem: string;
  hint1: string;
  hint2: string;
  solution: string;
  explanation: string;
};

type IndependentProblem = {
  problem: string;
  solution: string;
  explanation: string;
};

// ─── Safe JSON parsers ────────────────────────────────────────────────────────

function parseWorkedExamples(raw: unknown): WorkedExample[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as WorkedExample[]; } catch { return []; }
  }
  if (Array.isArray(raw)) return raw as WorkedExample[];
  return [];
}

function parseGuidedProblems(raw: unknown): GuidedProblem[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as GuidedProblem[]; } catch { return []; }
  }
  if (Array.isArray(raw)) return raw as GuidedProblem[];
  return [];
}

function parseIndependentProblems(raw: unknown): IndependentProblem[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as IndependentProblem[]; } catch { return []; }
  }
  if (Array.isArray(raw)) return raw as IndependentProblem[];
  return [];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LessonDetail() {
  const { user } = useAuth();
  const params = useParams<{ unitNumber: string; lessonId: string }>();
  const unitNumber = parseInt(params.unitNumber ?? "1", 10);
  const lessonId = parseInt(params.lessonId ?? "0", 10);
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("explanation");

  // Worked examples: track expanded state
  const [expandedExamples, setExpandedExamples] = useState<Set<number>>(new Set([0]));

  // Guided practice: reveal hint1, hint2, solution per index
  const [guidedState, setGuidedState] = useState<
    Record<number, { hint1: boolean; hint2: boolean; solution: boolean }>
  >({});

  // Independent practice: student typed answer + revealed state per index
  const [studentAnswers, setStudentAnswers] = useState<Record<number, string>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Set<number>>(new Set());
  const [checkedAnswers, setCheckedAnswers] = useState<Record<number, "correct" | "wrong" | null>>({});

  const { celebrate } = useCelebration();

  // Young learner / parent-led mode detection
  const { data: personalization } = trpc.onboarding.getPersonalization.useQuery(undefined, { enabled: !!user });
  const isYoungLearner = ["Pre-K", "Kindergarten", "Grade 1", "Grade 2"].includes(user?.grade ?? "");
  const showReadAloud = isYoungLearner || !!(personalization as any)?.parentLedMode;

  const { data: lesson, isLoading } = trpc.curriculum.getLesson.useQuery(
    { lessonId },
    { enabled: !isNaN(lessonId) }
  );

  const markComplete = trpc.progress.markLessonComplete.useMutation({
    onSuccess: () => {
      celebrate("lesson_complete", "Lesson Complete! ⭐");
      toast.success("Lesson completed! Great work.");
      setTimeout(() => setLocation(`/curriculum/unit/${unitNumber}`), 2000);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 page-enter">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Lesson not found.</p>
        <Button variant="ghost" onClick={() => setLocation(`/curriculum/unit/${unitNumber}`)} className="mt-4">
          Back to Unit
        </Button>
      </div>
    );
  }

  const workedExamples = parseWorkedExamples(lesson.workedExamples);
  const guidedProblems = parseGuidedProblems(lesson.guidedProblems);
  const independentProblems = parseIndependentProblems(lesson.independentProblems);
  const misconceptions = (lesson.misconceptions as unknown as string[]) ?? [];

  // ── Helpers ──────────────────────────────────────────────────────────────

  const toggleExample = (idx: number) => {
    setExpandedExamples((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const getGuidedState = (idx: number) =>
    guidedState[idx] ?? { hint1: false, hint2: false, solution: false };

  const setGuidedField = (idx: number, field: "hint1" | "hint2" | "solution", val: boolean) => {
    setGuidedState((prev) => ({
      ...prev,
      [idx]: { ...getGuidedState(idx), [field]: val },
    }));
  };

  /**
   * Normalise an answer string for comparison:
   * - trim whitespace, lowercase
   * - remove all internal spaces ("x = 3" → "x=3")
   * - strip trailing .0 from decimals ("3.0" → "3")
   * - accept comma-separated values in any order ("2,3" == "3,2")
   */
  function normaliseAnswer(raw: string): string {
    return raw.trim().toLowerCase().replace(/\s+/g, "");
  }

  function answersMatch(student: string, correct: string): boolean {
    const s = normaliseAnswer(student);
    const c = normaliseAnswer(correct);
    if (s === c) return true;
    // Strip trailing .0 from both sides
    const stripDot0 = (v: string) => v.replace(/\.0+$/, "");
    if (stripDot0(s) === stripDot0(c)) return true;
    // Accept comma-separated values in any order (e.g. "2,3" vs "3,2")
    const sParts = s.split(",").map((p) => p.trim()).sort();
    const cParts = c.split(",").map((p) => p.trim()).sort();
    if (sParts.join(",") === cParts.join(",")) return true;
    // Accept "x=3" matching "3" when the correct answer is just a number
    const numericMatch = s.replace(/^[a-z]=/i, "");
    if (numericMatch === c || stripDot0(numericMatch) === stripDot0(c)) return true;
    return false;
  }

  const checkAnswer = (idx: number, solution: string) => {
    const student = studentAnswers[idx] ?? "";
    if (!student.trim()) { toast.error("Please type your answer first."); return; }
    const isCorrect = answersMatch(student, solution);
    setCheckedAnswers((prev) => ({ ...prev, [idx]: isCorrect ? "correct" : "wrong" }));
    if (isCorrect) {
      toast.success("Correct! Well done.");
    } else {
      toast.error("Not quite — review the solution to see the working.");
    }
  };

  const revealSolution = (idx: number) => {
    setRevealedSolutions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 page-enter max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <button onClick={() => setLocation("/curriculum")} className="hover:text-foreground transition-colors">
          Curriculum
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <button onClick={() => setLocation(`/curriculum/unit/${unitNumber}`)} className="hover:text-foreground transition-colors">
          Unit {unitNumber}
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Lesson {lesson.lessonNumber}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{lesson.title}</h1>
          {lesson.teksAlignment && (
            <p className="text-xs text-muted-foreground font-mono mt-1">{lesson.teksAlignment}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setLocation(`/tutor?unit=${unitNumber}&lesson=${lessonId}`)}
          >
            <Brain className="h-3.5 w-3.5" />
            Ask Tutor
          </Button>
          {user && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => markComplete.mutate({ lessonId: lesson.id, unitId: lesson.unitId, unitNumber })}
              disabled={markComplete.isPending}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark Complete
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
          <TabsTrigger value="explanation" className="text-xs">
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            Explanation
          </TabsTrigger>
          <TabsTrigger value="examples" className="text-xs">
            <Target className="h-3.5 w-3.5 mr-1.5" />
            Examples ({workedExamples.length})
          </TabsTrigger>
          <TabsTrigger value="guided" className="text-xs">
            <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
            Guided ({guidedProblems.length})
          </TabsTrigger>
          <TabsTrigger value="independent" className="text-xs">
            <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
            Practice ({independentProblems.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Explanation ─────────────────────────────────────────────────── */}
        <TabsContent value="explanation" className="mt-4 space-y-4">
          {/* Read-Aloud bar — shown for young learners and parent-led mode */}
          {showReadAloud && lesson.explanation && (
            <ReadAloudButton text={lesson.explanation} className="mb-2" />
          )}
          <Card className="border">
            <CardContent className="p-6">
              <div className="lesson-prose whitespace-pre-wrap text-sm leading-relaxed">
                {lesson.explanation}
              </div>
            </CardContent>
          </Card>

          {misconceptions.length > 0 && (
            <Card className="border border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Common Misconceptions
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-orange-700 border-orange-200 bg-orange-50 hover:bg-orange-100 hover:border-orange-300 shrink-0"
                    onClick={() => setLocation(`/tutor?unit=${unitNumber}&lesson=${lessonId}&mode=misconception_drill`)}
                  >
                    <Brain className="h-3.5 w-3.5" />
                    Practice on these
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <ul className="space-y-2">
                  {misconceptions.map((m, i) => (
                    <li key={i} className="text-sm text-amber-900 flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                      {m}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button onClick={() => setActiveTab("examples")} className="gap-2">
              View Worked Examples
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* ── Worked Examples ──────────────────────────────────────────────── */}
        <TabsContent value="examples" className="mt-4 space-y-4">
          {workedExamples.length === 0 ? (
            <Card className="border">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No worked examples for this lesson yet.
              </CardContent>
            </Card>
          ) : (
            workedExamples.map((ex, idx) => (
              <Card key={idx} className="border overflow-hidden">
                {/* Clickable header */}
                <button
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
                  onClick={() => toggleExample(idx)}
                >
                  <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {ex.title && (
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                        {ex.title}
                      </p>
                    )}
                    <p className="text-sm font-medium text-foreground">{ex.problem}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {expandedExamples.has(idx) ? "Hide" : "Show"} Solution
                  </Badge>
                </button>

                {/* Expanded steps */}
                {expandedExamples.has(idx) && (
                  <CardContent className="px-5 pb-5 pt-0 border-t">
                    <div className="space-y-3 mt-3">
                      {ex.steps.map((s, sIdx) => (
                        <div key={sIdx} className="flex gap-3">
                          <div className="shrink-0 mt-0.5">
                            <span className="h-5 w-5 rounded-full bg-muted text-muted-foreground text-[10px] flex items-center justify-center font-bold">
                              {sIdx + 1}
                            </span>
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <p className="text-sm font-semibold text-foreground">{s.step}</p>
                            {s.explanation && (
                              <p className="text-xs text-muted-foreground leading-relaxed">{s.explanation}</p>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Final answer */}
                      <div className="mt-4 pt-3 border-t flex items-center gap-3 bg-green-50/60 -mx-5 px-5 py-3 rounded-b-lg">
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        <span className="text-xs font-semibold text-muted-foreground">Answer:</span>
                        <span className="text-sm font-bold text-green-700">{ex.answer}</span>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
          <div className="flex justify-end">
            <Button onClick={() => setActiveTab("guided")} className="gap-2">
              Try Guided Practice
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* ── Guided Practice ──────────────────────────────────────────────── */}
        <TabsContent value="guided" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Work through each problem step by step. Use hints when stuck, then check the full solution with workings.
          </p>
          {guidedProblems.length === 0 ? (
            <Card className="border">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No guided problems for this lesson yet.
              </CardContent>
            </Card>
          ) : (
            guidedProblems.map((prob, idx) => {
              const gs = getGuidedState(idx);
              return (
                <Card key={idx} className="border">
                  <CardContent className="p-5 space-y-4">
                    {/* Problem */}
                    <div className="flex items-start gap-3">
                      <span className="h-6 w-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-medium text-foreground leading-relaxed">{prob.problem}</p>
                    </div>

                    {/* Hint buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1.5"
                        onClick={() => setGuidedField(idx, "hint1", !gs.hint1)}
                      >
                        <Lightbulb className="h-3 w-3" />
                        {gs.hint1 ? "Hide Hint 1" : "Hint 1"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1.5"
                        onClick={() => setGuidedField(idx, "hint2", !gs.hint2)}
                      >
                        <Lightbulb className="h-3 w-3 text-amber-500" />
                        {gs.hint2 ? "Hide Hint 2" : "Hint 2"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1.5"
                        onClick={() => setGuidedField(idx, "solution", !gs.solution)}
                      >
                        <Eye className="h-3 w-3 text-green-600" />
                        {gs.solution ? "Hide Solution" : "Show Full Solution"}
                      </Button>
                    </div>

                    {/* Hint 1 */}
                    {gs.hint1 && prob.hint1 && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-semibold text-blue-800 mb-1">Hint 1</p>
                        <p className="text-xs text-blue-900 leading-relaxed">{prob.hint1}</p>
                      </div>
                    )}

                    {/* Hint 2 */}
                    {gs.hint2 && prob.hint2 && (
                      <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="text-xs font-semibold text-indigo-800 mb-1">Hint 2</p>
                        <p className="text-xs text-indigo-900 leading-relaxed">{prob.hint2}</p>
                      </div>
                    )}

                    {/* Full solution with workings */}
                    {gs.solution && (
                      <div className="space-y-2">
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-xs font-semibold text-green-800 mb-1">Answer</p>
                          <p className="text-sm font-bold text-green-900">{prob.solution}</p>
                        </div>
                        {prob.explanation && (
                          <div className="p-3 bg-muted/40 rounded-lg border border-border">
                            <p className="text-xs font-semibold text-foreground mb-1">Worked Solution</p>
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{prob.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
          <div className="flex justify-end">
            <Button onClick={() => setActiveTab("independent")} className="gap-2">
              Independent Practice
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* ── Independent Practice ─────────────────────────────────────────── */}
        <TabsContent value="independent" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Solve each problem independently. Type your answer, then check it — or reveal the full worked solution.
          </p>

          {/* Answer format guidance banner */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1.5">
            <p className="font-semibold flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-blue-600" />
              Answer Format Tips
            </p>
            <ul className="space-y-1 pl-5 list-disc text-blue-700">
              <li>Spaces don’t matter — <span className="font-mono bg-blue-100 px-1 rounded">x = 3</span> and <span className="font-mono bg-blue-100 px-1 rounded">x=3</span> are both accepted.</li>
              <li>For equations, write the variable side first: <span className="font-mono bg-blue-100 px-1 rounded">x=5</span> or just the number <span className="font-mono bg-blue-100 px-1 rounded">5</span></li>
              <li>For multiple answers, separate with a comma: <span className="font-mono bg-blue-100 px-1 rounded">2,3</span> (order doesn’t matter)</li>
              <li>Fractions: use a slash — <span className="font-mono bg-blue-100 px-1 rounded">3/4</span>. Decimals: <span className="font-mono bg-blue-100 px-1 rounded">0.75</span></li>
            </ul>
          </div>

          {independentProblems.length === 0 ? (
            <Card className="border">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No independent problems for this lesson yet.
              </CardContent>
            </Card>
          ) : (
            independentProblems.map((prob, idx) => {
              const checked = checkedAnswers[idx];
              const revealed = revealedSolutions.has(idx);
              return (
                <Card
                  key={idx}
                  className={`border transition-all ${
                    checked === "correct"
                      ? "border-green-200 bg-green-50/30"
                      : checked === "wrong"
                      ? "border-red-200 bg-red-50/20"
                      : "border-border"
                  }`}
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Problem */}
                    <div className="flex items-start gap-3">
                      <span className={`h-6 w-6 rounded-full text-xs flex items-center justify-center font-bold shrink-0 mt-0.5 ${
                        checked === "correct"
                          ? "bg-green-100 text-green-700"
                          : checked === "wrong"
                          ? "bg-red-100 text-red-700"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {checked === "correct" ? "✓" : checked === "wrong" ? "✗" : idx + 1}
                      </span>
                      <p className="text-sm font-medium text-foreground leading-relaxed">{prob.problem}</p>
                    </div>

                    {/* Answer input */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Your answer:</Label>
                      <div className="flex gap-2">
                        <Input
                          value={studentAnswers[idx] ?? ""}
                          onChange={(e) => {
                            setStudentAnswers((prev) => ({ ...prev, [idx]: e.target.value }));
                            // Clear check state when editing
                            if (checkedAnswers[idx]) {
                              setCheckedAnswers((prev) => ({ ...prev, [idx]: null }));
                            }
                          }}
                          placeholder="Type your answer here..."
                          className={`text-sm flex-1 ${
                            checked === "correct"
                              ? "border-green-400 focus-visible:ring-green-400"
                              : checked === "wrong"
                              ? "border-red-400 focus-visible:ring-red-400"
                              : ""
                          }`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") checkAnswer(idx, prob.solution);
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => checkAnswer(idx, prob.solution)}
                          disabled={!studentAnswers[idx]?.trim()}
                          className="gap-1.5 shrink-0"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Check
                        </Button>
                      </div>
                    </div>

                    {/* Feedback */}
                    {checked === "correct" && (
                      <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Correct! Great work.
                      </div>
                    )}
                    {checked === "wrong" && (
                      <div className="flex items-center gap-2 text-red-700 text-sm">
                        <XCircle className="h-4 w-4 shrink-0" />
                        Not quite. Review the solution below to see the working.
                      </div>
                    )}

                    {/* Reveal solution button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1.5"
                      onClick={() => revealSolution(idx)}
                    >
                      {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {revealed ? "Hide Solution" : "Reveal Full Solution"}
                    </Button>

                    {/* Full solution */}
                    {revealed && (
                      <div className="space-y-2">
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-xs font-semibold text-green-800 mb-1">Answer</p>
                          <p className="text-sm font-bold text-green-900">{prob.solution}</p>
                        </div>
                        {prob.explanation && (
                          <div className="p-3 bg-muted/40 rounded-lg border border-border">
                            <p className="text-xs font-semibold text-foreground mb-1">Worked Solution</p>
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{prob.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}

          {user && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => markComplete.mutate({ lessonId: lesson.id, unitId: lesson.unitId, unitNumber })}
                disabled={markComplete.isPending}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Lesson Complete
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
