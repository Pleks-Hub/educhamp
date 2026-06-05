import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Lock,
  PlayCircle,
  Star,
  Sigma,
} from "lucide-react";
import { toast } from "sonner";

export default function UnitDetail() {
  const { user } = useAuth();
  const params = useParams<{ unitNumber: string }>();
  const unitNumber = parseInt(params.unitNumber ?? "1", 10);
  const [, setLocation] = useLocation();

  const { data: dashboard } = trpc.progress.getDashboard.useQuery(undefined, { enabled: !!user });
  const activeCourseId = dashboard?.activeCourseId ?? undefined;

  const { data: unit, isLoading: unitLoading } = trpc.curriculum.getUnit.useQuery(
    { unitNumber, courseId: activeCourseId },
    { enabled: !isNaN(unitNumber) && !!activeCourseId }
  );
  const { data: lessons, isLoading: lessonsLoading } = trpc.curriculum.getLessons.useQuery(
    { unitId: unit?.id ?? 0 },
    { enabled: !!unit?.id }
  );
  const { data: skills } = trpc.curriculum.getSkillsByUnit.useQuery(
    { unitNumber, courseId: activeCourseId },
    { enabled: !isNaN(unitNumber) && !!activeCourseId }
  );
  const { data: lessonProgress } = trpc.progress.getLessonProgress.useQuery(
    { unitId: unit?.id ?? 0 },
    { enabled: !!unit?.id && !!user }
  );

  const markComplete = trpc.progress.markLessonComplete.useMutation({
    onSuccess: () => toast.success("Lesson marked as complete!"),
  });

  if (unitLoading || lessonsLoading) {
    return (
      <div className="p-6 space-y-4 page-enter">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Unit not found.</p>
        <Button variant="ghost" onClick={() => setLocation("/curriculum")} className="mt-4">
          Back to Curriculum
        </Button>
      </div>
    );
  }

  const unitProgress = dashboard?.units.find((u) => u.unitNumber === unitNumber);
  const progressMap = new Map((lessonProgress ?? []).map((p) => [p.lessonId, p]));

  return (
    <div className="p-6 space-y-6 page-enter max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => setLocation("/curriculum")} className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Curriculum
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Unit {unit.unitNumber}</span>
      </div>

      {/* Unit Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">Unit {unit.unitNumber}</Badge>
              {unitProgress?.status === "quiz_unlocked" && (
                <Badge className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200">Quiz Ready</Badge>
              )}
              {unitProgress?.status === "completed" && (
                <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Completed</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground">{unit.title}</h1>
            {unit.teksAlignment && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">{unit.teksAlignment}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setLocation(`/tutor?unit=${unitNumber}`)}
            >
              <Brain className="h-3.5 w-3.5" />
              AI Tutor
            </Button>
            {(unitProgress?.status === "quiz_unlocked" || unitProgress?.status === "completed") && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setLocation(`/curriculum/unit/${unitNumber}/quiz`)}
              >
                <Star className="h-3.5 w-3.5" />
                Take Quiz
              </Button>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{unit.overview}</p>

        {unitProgress && unitProgress.totalLessons > 0 && (
          <div className="flex items-center gap-3">
            <Progress
              value={(Math.min(unitProgress.lessonsCompleted, unitProgress.totalLessons) / unitProgress.totalLessons) * 100}
              className="h-2 flex-1"
            />
            <span className="text-xs text-muted-foreground shrink-0">
              {Math.min(unitProgress.lessonsCompleted, unitProgress.totalLessons)}/{unitProgress.totalLessons} lessons
            </span>
          </div>
        )}
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lessons */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Lessons
          </h2>

          {(lessons ?? []).length === 0 ? (
            <Card className="border">
              <CardContent className="p-6 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Lessons coming soon for this unit.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(lessons ?? []).map((lesson, idx) => {
                const progress = progressMap.get(lesson.id);
                const isCompleted = progress?.completed ?? false;

                return (
                  <Card
                    key={lesson.id}
                    className={`border transition-all hover:shadow-sm cursor-pointer ${
                      isCompleted ? "border-green-200 bg-green-50/30" : "hover:border-primary/30"
                    }`}
                    onClick={() => setLocation(`/curriculum/unit/${unitNumber}/lesson/${lesson.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                          isCompleted ? "bg-green-100" : "bg-muted"
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            Lesson {lesson.lessonNumber}: {lesson.title}
                          </p>
                          {lesson.teksAlignment && (
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{lesson.teksAlignment}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!isCompleted && user && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                markComplete.mutate({
                                  lessonId: lesson.id,
                                  unitId: unit.id,
                                  unitNumber: unit.unitNumber,
                                });
                              }}
                            >
                              Mark Done
                            </Button>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Skills Sidebar */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Sigma className="h-4 w-4 text-primary" />
            Skills
          </h2>
          <div className="space-y-2">
            {(skills ?? []).map((skill) => {
              const mastery = dashboard?.mastery.find((m) => m.skillId === skill.skillId);
              const score = mastery?.score ?? 0;
              return (
                <Card key={skill.id} className="border">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-primary font-semibold">{skill.skillId}</p>
                        <p className="text-xs text-foreground mt-0.5 leading-tight">{skill.skillName}</p>
                      </div>
                      {score > 0 && (
                        <span className="text-xs font-bold text-muted-foreground shrink-0">{score}%</span>
                      )}
                    </div>
                    {score > 0 && (
                      <Progress value={score} className="h-1 mt-2" />
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {(skills ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">No skills mapped yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
