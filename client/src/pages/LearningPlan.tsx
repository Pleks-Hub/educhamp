import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Sparkles,
  BookOpen,
  Target,
  ChevronRight,
  Check,
  RefreshCw,
  Trash2,
  Edit2,
  Info,
} from "lucide-react";

const DAYS_OF_WEEK = [
  { id: "monday", label: "Mon", full: "Monday" },
  { id: "tuesday", label: "Tue", full: "Tuesday" },
  { id: "wednesday", label: "Wed", full: "Wednesday" },
  { id: "thursday", label: "Thu", full: "Thursday" },
  { id: "friday", label: "Fri", full: "Friday" },
  { id: "saturday", label: "Sat", full: "Saturday" },
  { id: "sunday", label: "Sun", full: "Sunday" },
];

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

type PlanBlock = {
  day: string;
  courseId: number;
  courseName: string;
  durationMinutes: number;
  priority: "high" | "medium" | "low";
  notes?: string;
};

// ─── Step 1: Setup Wizard ─────────────────────────────────────────────────────
function PlanSetupWizard({ onGenerate, isGenerating }: { onGenerate: (hours: number, days: string[]) => void; isGenerating: boolean }) {
  const [step, setStep] = useState(1);
  const [hoursPerWeek, setHoursPerWeek] = useState(5);
  const [selectedDays, setSelectedDays] = useState<string[]>(["monday", "tuesday", "wednesday", "thursday", "friday"]);

  const toggleDay = (dayId: string) => {
    setSelectedDays(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
              s < step ? "bg-green-500 text-white" :
              s === step ? "bg-primary text-primary-foreground shadow-md" :
              "bg-muted text-muted-foreground"
            }`}>
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">How much time can you study each week?</CardTitle>
            <CardDescription>
              Choose a realistic amount — you can always adjust later. Most students do well with 3-7 hours per week.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <span className="text-4xl font-bold text-primary">{hoursPerWeek}</span>
              <span className="text-lg text-muted-foreground ml-2">hours / week</span>
            </div>
            <Slider
              value={[hoursPerWeek]}
              onValueChange={([v]) => setHoursPerWeek(v)}
              min={1}
              max={20}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 hr (light)</span>
              <span>10 hrs (moderate)</span>
              <span>20 hrs (intensive)</span>
            </div>
            <Button onClick={() => setStep(2)} className="w-full" size="lg">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Which days work best for you?</CardTitle>
            <CardDescription>
              Pick the days you can consistently study. It's okay to start with fewer days and add more later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day.id}
                  onClick={() => toggleDay(day.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200 ${
                    selectedDays.includes(day.id)
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border hover:border-primary/50 text-muted-foreground"
                  }`}
                >
                  <span className="text-sm font-medium">{day.label}</span>
                  {selectedDays.includes(day.id) && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
            {selectedDays.length === 0 && (
              <p className="text-sm text-destructive text-center">Please select at least one day</p>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={selectedDays.length === 0}
                className="flex-1"
                size="lg"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Ready to create your plan!</CardTitle>
            <CardDescription>
              We'll build a personalized schedule based on your courses and progress. Courses where you need more practice will get more time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Study time:</span>
                <span className="font-medium">{hoursPerWeek} hours/week</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Days:</span>
                <span className="font-medium">
                  {selectedDays.map(d => DAYS_OF_WEEK.find(day => day.id === d)?.label).join(", ")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Per session:</span>
                <span className="font-medium">
                  ~{Math.round((hoursPerWeek * 60) / selectedDays.length)} min
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Back
              </Button>
              <Button
                onClick={() => onGenerate(hoursPerWeek, selectedDays)}
                disabled={isGenerating}
                className="flex-1"
                size="lg"
              >
                {isGenerating ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Create My Plan</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Plan View ────────────────────────────────────────────────────────────────
function PlanView({ plan, blocks, onEdit, onDelete, onRegenerate }: {
  plan: { id: number; title: string | null; hoursPerWeek: number; preferredDays: string[]; createdAt: Date | string | number };
  blocks: PlanBlock[];
  onEdit: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
}) {
  // Group blocks by day
  const blocksByDay = useMemo(() => {
    const grouped: Record<string, PlanBlock[]> = {};
    for (const day of DAYS_OF_WEEK) {
      const dayBlocks = blocks.filter(b => b.day === day.id);
      if (dayBlocks.length > 0) {
        grouped[day.id] = dayBlocks;
      }
    }
    return grouped;
  }, [blocks]);

  const totalMinutes = blocks.reduce((sum, b) => sum + b.durationMinutes, 0);

  return (
    <div className="space-y-6">
      {/* Plan header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{plan.title || "My Learning Plan"}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {plan.hoursPerWeek} hrs/week across {plan.preferredDays.length} days ({Math.round(totalMinutes / 60 * 10) / 10} hrs scheduled)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRegenerate}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800 dark:text-blue-200">
          This plan is a guide to help you stay on track. Courses with lower mastery get more time. You can always adjust or regenerate it as your skills improve.
        </p>
      </div>

      {/* Weekly schedule */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DAYS_OF_WEEK.map(day => {
          const dayBlocks = blocksByDay[day.id];
          if (!dayBlocks) return null;
          return (
            <Card key={day.id} className="overflow-hidden">
              <CardHeader className="py-3 px-4 bg-muted/30">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  {day.full}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {dayBlocks.map((block, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-background border border-border/50">
                    <div className="shrink-0 mt-0.5">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{block.courseName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{block.durationMinutes} min</span>
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[block.priority]}`}>
                          {block.priority}
                        </Badge>
                      </div>
                      {block.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{block.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Target className="h-3 w-3" /> Priority:
        </span>
        <Badge variant="secondary" className={`text-[10px] ${PRIORITY_COLORS.high}`}>High = needs practice</Badge>
        <Badge variant="secondary" className={`text-[10px] ${PRIORITY_COLORS.medium}`}>Medium = improving</Badge>
        <Badge variant="secondary" className={`text-[10px] ${PRIORITY_COLORS.low}`}>Low = doing well</Badge>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LearningPlanPage() {
  const { data: activePlan, isLoading } = trpc.learningPlan.getActive.useQuery();
  const generateMutation = trpc.learningPlan.generate.useMutation();
  const createMutation = trpc.learningPlan.create.useMutation();
  const deleteMutation = trpc.learningPlan.delete.useMutation();
  const utils = trpc.useUtils();

  const [showWizard, setShowWizard] = useState(false);
  const [generatedBlocks, setGeneratedBlocks] = useState<PlanBlock[] | null>(null);
  const [wizardParams, setWizardParams] = useState<{ hours: number; days: string[] } | null>(null);

  const handleGenerate = async (hours: number, days: string[]) => {
    try {
      const result = await generateMutation.mutateAsync({ hoursPerWeek: hours, preferredDays: days });
      setGeneratedBlocks(result.blocks);
      setWizardParams({ hours, days });
      // Auto-save the plan
      await createMutation.mutateAsync({
        title: "My Learning Plan",
        hoursPerWeek: hours,
        preferredDays: days,
        schedule: result.blocks,
      });
      utils.learningPlan.getActive.invalidate();
      setShowWizard(false);
      setGeneratedBlocks(null);
      toast.success("Learning plan created! Your parent can now see your schedule.");
    } catch {
      toast.error("Failed to create plan. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!activePlan) return;
    try {
      await deleteMutation.mutateAsync({ planId: activePlan.id });
      utils.learningPlan.getActive.invalidate();
      toast.success("Plan deleted");
    } catch {
      toast.error("Failed to delete plan");
    }
  };

  const handleRegenerate = () => {
    setShowWizard(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto page-enter">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          Learning Plan
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organize your study time across courses. Your parent can see this plan to help support you.
        </p>
      </div>

      {/* Show wizard or plan */}
      {!activePlan && !showWizard && (
        <Card className="border-dashed border-2 border-primary/30">
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No learning plan yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Create a personalized study schedule to stay organized and make steady progress across all your courses. It only takes a minute!
            </p>
            <Button onClick={() => setShowWizard(true)} size="lg">
              <Sparkles className="h-4 w-4 mr-2" /> Create My Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {showWizard && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setShowWizard(false)} className="mb-4">
            ← Back to plan
          </Button>
          <PlanSetupWizard onGenerate={handleGenerate} isGenerating={generateMutation.isPending || createMutation.isPending} />
        </div>
      )}

      {activePlan && !showWizard && (
        <PlanView
          plan={activePlan}
          blocks={(activePlan.schedule as unknown as PlanBlock[]) || []}
          onEdit={() => setShowWizard(true)}
          onDelete={handleDelete}
          onRegenerate={handleRegenerate}
        />
      )}
    </div>
  );
}
