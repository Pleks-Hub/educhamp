/**
 * AdventureMap — /adventure-map
 * Visual learning path showing units as nodes on a winding adventure map.
 * Students can see completed, in-progress, and locked units at a glance.
 */
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Lock, Star, BookOpen, Map } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnitNode {
  id: number;
  unitNumber: number;
  title: string;
  description: string;
  status: "completed" | "in_progress" | "available" | "locked";
  masteryPercent: number;
  lessonCount: number;
  completedLessons: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdventureMap() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: dashboardData, isLoading: dashLoading, isError: unitsError } = trpc.progress.getDashboard.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30_000,
  });
  // Use dashboard.units which is already filtered to the active course
  const units = dashboardData?.units;
  const allProgress = dashboardData?.units;

  const isLoading = dashLoading;

  const unitNodes: UnitNode[] = useMemo(() => {
    if (!units) return [];

    return units.map((unit, idx) => {
      const progress = Array.isArray(allProgress) ? allProgress.find((p: any) => p.id === unit.id) : undefined;
      const lessonCount = (unit as any).lessonCount ?? 0;
      const completedLessons = progress?.lessonsCompleted ?? (progress as any)?.completedLessons ?? 0;
      const masteryPercent = lessonCount > 0 ? Math.round((completedLessons / lessonCount) * 100) : 0;

      let status: UnitNode["status"] = "locked";
      if (masteryPercent >= 80) {
        status = "completed";
      } else if (completedLessons > 0) {
        status = "in_progress";
      } else if (idx === 0) {
        status = "available";
      } else {
        // Available if previous unit has at least 1 completed lesson
        const prevUnit = units[idx - 1];
        const prevProgress = Array.isArray(allProgress) ? allProgress.find((p: any) => p.id === prevUnit?.id) : undefined;
        if ((prevProgress?.lessonsCompleted ?? (prevProgress as any)?.completedLessons ?? 0) > 0) {
          status = "available";
        }
      }

      return {
        id: unit.id,
        unitNumber: unit.unitNumber,
        title: unit.title,
        description: (unit as any).overview ?? (unit as any).description ?? "",
        status,
        masteryPercent,
        lessonCount,
        completedLessons,
      };
    });
  }, [units, allProgress]);

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Map className="w-6 h-6 text-emerald-500" aria-hidden="true" />
          Adventure Map
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your learning journey — complete units to unlock new adventures.
        </p>
      </div>

      {/* Path */}
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-emerald-400 via-indigo-400 to-slate-300 rounded-full" />

        <div className="space-y-4">
          {unitNodes.map((node, idx) => (
            <MapNode
              key={node.id}
              node={node}
              index={idx}
              onNavigate={() => {
                if (node.status !== "locked") {
                  setLocation(`/curriculum/unit/${node.unitNumber}`);
                }
              }}
            />
          ))}
        </div>

        {unitsError && (
          <div className="text-center py-16">
            <p className="text-destructive text-sm">Unable to load your adventure map. Please refresh the page.</p>
          </div>
        )}
        {unitNodes.length === 0 && !unitsError && (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" aria-hidden="true" />
            <p className="text-muted-foreground">No units found. Enrol in a course to begin your adventure!</p>
            <Button className="mt-4" onClick={() => setLocation("/courses")}>Browse Courses</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MapNode ──────────────────────────────────────────────────────────────────

function MapNode({ node, index, onNavigate }: { node: UnitNode; index: number; onNavigate: () => void }) {
  const isEven = index % 2 === 0;

  const statusConfig = {
    completed: {
      nodeClass: "bg-emerald-500 border-emerald-600 shadow-emerald-200",
      cardClass: "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20",
      icon: <CheckCircle2 className="w-5 h-5 text-white" />,
      label: "Completed",
      labelClass: "bg-emerald-100 text-emerald-700",
    },
    in_progress: {
      nodeClass: "bg-indigo-500 border-indigo-600 shadow-indigo-200",
      cardClass: "border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20",
      icon: <Star className="w-5 h-5 text-white" />,
      label: "In Progress",
      labelClass: "bg-indigo-100 text-indigo-700",
    },
    available: {
      nodeClass: "bg-amber-500 border-amber-600 shadow-amber-200",
      cardClass: "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20",
      icon: <BookOpen className="w-5 h-5 text-white" />,
      label: "Start",
      labelClass: "bg-amber-100 text-amber-700",
    },
    locked: {
      nodeClass: "bg-slate-300 border-slate-400",
      cardClass: "border-slate-200 bg-slate-50/50 dark:bg-slate-900/20 opacity-60",
      icon: <Lock className="w-5 h-5 text-white" />,
      label: "Locked",
      labelClass: "bg-slate-100 text-slate-500",
    },
  };

  const config = statusConfig[node.status];

  return (
    <div className={cn("flex items-start gap-4", isEven ? "flex-row" : "flex-row")}>
      {/* Node circle */}
      <div className={cn(
        "relative z-10 w-16 h-16 rounded-full border-4 flex items-center justify-center shrink-0 shadow-lg transition-transform",
        config.nodeClass,
        node.status !== "locked" && "cursor-pointer hover:scale-110",
      )}
        onClick={onNavigate}
        role={node.status !== "locked" ? "button" : undefined}
        tabIndex={node.status !== "locked" ? 0 : undefined}
        onKeyDown={(e) => e.key === "Enter" && onNavigate()}
        aria-label={`Unit ${node.unitNumber}: ${node.title}`}
      >
        <span className="text-lg font-bold text-white">{node.unitNumber}</span>
      </div>

      {/* Card */}
      <div
        className={cn(
          "flex-1 rounded-2xl border p-4 transition-all",
          config.cardClass,
          node.status !== "locked" && "cursor-pointer hover:shadow-md",
        )}
        onClick={onNavigate}
        role={node.status !== "locked" ? "button" : undefined}
        tabIndex={node.status !== "locked" ? 0 : undefined}
        onKeyDown={(e) => e.key === "Enter" && onNavigate()}
        aria-label={node.status !== "locked" ? `Go to Unit ${node.unitNumber}: ${node.title}` : undefined}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">{node.title}</h3>
              <Badge className={cn("text-[10px] px-1.5 py-0", config.labelClass)}>
                {config.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{node.description}</p>
          </div>
          {config.icon && (
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.nodeClass)} aria-hidden="true">
              {config.icon}
            </div>
          )}
        </div>

        {/* Progress bar */}
        {node.status !== "locked" && node.lessonCount > 0 && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{node.completedLessons} / {node.lessonCount} lessons</span>
              <span>{node.masteryPercent}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  node.status === "completed" ? "bg-emerald-500" :
                  node.status === "in_progress" ? "bg-indigo-500" : "bg-amber-500",
                )}
                style={{ width: `${node.masteryPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
