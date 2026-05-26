import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type WorkedExample = { problem: string; steps: string[]; answer: string };
type Problem = { problem: string; answer: string; hint?: string };

export default function LessonDetail() {
  const { user } = useAuth();
  const params = useParams<{ unitNumber: string; lessonId: string }>();
  const unitNumber = parseInt(params.unitNumber ?? "1", 10);
  const lessonId = parseInt(params.lessonId ?? "0", 10);
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("explanation");
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());
  const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set());

  const { data: lesson, isLoading } = trpc.curriculum.getLesson.useQuery(
    { lessonId },
    { enabled: !isNaN(lessonId) }
  );

  const markComplete = trpc.progress.markLessonComplete.useMutation({
    onSuccess: () => {
      toast.success("Lesson completed! Great work.");
      setLocation(`/curriculum/unit/${unitNumber}`);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 page-enter">
        <Skeleton className="h-8 w-64" />
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

  const workedExamples = (lesson.workedExamples as unknown as WorkedExample[]) ?? [];
  const guidedProblems = (lesson.guidedProblems as unknown as Problem[]) ?? [];
  const independentProblems = (lesson.independentProblems as unknown as Problem[]) ?? [];
  const misconceptions = (lesson.misconceptions as string[]) ?? [];

  const toggleAnswer = (idx: number) => {
    setRevealedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleHint = (idx: number) => {
    setRevealedHints((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

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
        <TabsList className="grid grid-cols-4 w-full">
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

        {/* Explanation */}
        <TabsContent value="explanation" className="mt-4 space-y-4">
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
                <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Common Misconceptions
                </CardTitle>
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

        {/* Worked Examples */}
        <TabsContent value="examples" className="mt-4 space-y-4">
          {workedExamples.length === 0 ? (
            <Card className="border">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No worked examples for this lesson yet.
              </CardContent>
            </Card>
          ) : (
            workedExamples.map((ex, idx) => (
              <Card key={idx} className="border">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="math-expr">{ex.problem}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="space-y-2">
                    {ex.steps.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-start gap-3">
                        <span className="text-xs text-muted-foreground font-medium mt-0.5 w-12 shrink-0">
                          Step {sIdx + 1}
                        </span>
                        <p className="text-sm text-foreground">{step}</p>
                      </div>
                    ))}
                    <div className="mt-3 pt-3 border-t flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Answer:</span>
                      <span className="text-sm font-bold text-primary math-expr">{ex.answer}</span>
                    </div>
                  </div>
                </CardContent>
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

        {/* Guided Practice */}
        <TabsContent value="guided" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Work through these problems. Use hints if you get stuck, then check your answer.
          </p>
          {guidedProblems.length === 0 ? (
            <Card className="border">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No guided problems for this lesson yet.
              </CardContent>
            </Card>
          ) : (
            guidedProblems.map((prob, idx) => (
              <Card key={idx} className="border">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="h-6 w-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-medium text-foreground math-expr">{prob.problem}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {prob.hint && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1.5"
                        onClick={() => toggleHint(idx)}
                      >
                        <Lightbulb className="h-3 w-3" />
                        {revealedHints.has(idx) ? "Hide Hint" : "Show Hint"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1.5"
                      onClick={() => toggleAnswer(idx)}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {revealedAnswers.has(idx) ? "Hide Answer" : "Check Answer"}
                    </Button>
                  </div>
                  {revealedHints.has(idx) && prob.hint && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-800">
                        <span className="font-semibold">Hint: </span>{prob.hint}
                      </p>
                    </div>
                  )}
                  {revealedAnswers.has(idx) && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-green-800">
                        <span className="font-semibold">Answer: </span>
                        <span className="math-expr">{prob.answer}</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
          <div className="flex justify-end">
            <Button onClick={() => setActiveTab("independent")} className="gap-2">
              Independent Practice
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* Independent Practice */}
        <TabsContent value="independent" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Try these on your own first. Reveal the answer only after you've attempted each problem.
          </p>
          {independentProblems.length === 0 ? (
            <Card className="border">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No independent problems for this lesson yet.
              </CardContent>
            </Card>
          ) : (
            independentProblems.map((prob, idx) => (
              <Card key={idx} className="border">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="h-6 w-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-medium text-foreground math-expr">{prob.problem}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 gap-1.5"
                    onClick={() => toggleAnswer(idx + 100)}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {revealedAnswers.has(idx + 100) ? "Hide Answer" : "Reveal Answer"}
                  </Button>
                  {revealedAnswers.has(idx + 100) && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-green-800">
                        <span className="font-semibold">Answer: </span>
                        <span className="math-expr">{prob.answer}</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}

          {user && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => markComplete.mutate({ lessonId: lesson.id, unitId: lesson.unitId, unitNumber })}
                disabled={markComplete.isPending}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete Lesson
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
