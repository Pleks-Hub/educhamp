import { useState, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  CheckCircle2, Clock, AlertTriangle, ListTodo, Calendar, Repeat, Timer,
  Camera, Image as ImageIcon, Sparkles, Star, Trophy, MessageSquare,
  ChevronRight, Zap, PartyPopper, Upload, X
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isToday(date: Date | string | null): boolean {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isThisWeek(date: Date | string | null): boolean {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return d >= startOfWeek && d < endOfWeek;
}

function isOverdue(date: Date | string | null): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

function formatDueDate(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 0) return "Due earlier today";
    if (absDays === 1) return "1 day overdue";
    return `${absDays} days overdue`;
  }
  if (diffHours < 1) return "Due in less than 1 hour";
  if (diffHours < 24) return `Due in ${diffHours} hours`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays < 7) return `Due in ${diffDays} days`;
  return `Due ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

type TaskGroup = "overdue" | "today" | "this_week" | "upcoming" | "no_date";

function getTaskGroup(task: any): TaskGroup {
  if (task.status === "overdue" || (task.dueDate && isOverdue(task.dueDate) && task.status !== "completed")) return "overdue";
  if (task.dueDate && isToday(task.dueDate)) return "today";
  if (task.dueDate && isThisWeek(task.dueDate)) return "this_week";
  if (task.dueDate) return "upcoming";
  return "no_date";
}

const GROUP_CONFIG: Record<TaskGroup, { label: string; icon: any; color: string }> = {
  overdue: { label: "Overdue", icon: AlertTriangle, color: "text-red-500" },
  today: { label: "Today", icon: Zap, color: "text-amber-500" },
  this_week: { label: "This Week", icon: Calendar, color: "text-blue-500" },
  upcoming: { label: "Upcoming", icon: Clock, color: "text-muted-foreground" },
  no_date: { label: "Anytime", icon: ListTodo, color: "text-muted-foreground" },
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MyTasks() {
  const { user } = useAuth();
  const [completionDialog, setCompletionDialog] = useState<{ task: any } | null>(null);
  const [note, setNote] = useState("");
  const [proofBase64, setProofBase64] = useState<string | null>(null);
  const [proofMimeType, setProofMimeType] = useState<string>("image/jpeg");
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: tasks, isLoading } = trpc.parentTasks.getMyTasks.useQuery(
    { status: "all" },
    { refetchInterval: 30_000 }
  );

  const uploadProof = trpc.parentTasks.uploadProof.useMutation();

  const markComplete = trpc.parentTasks.markComplete.useMutation({
    onSuccess: () => {
      toast.success("Task submitted! Your parent will review it.", {
        icon: <PartyPopper className="h-4 w-4 text-amber-500" />,
      });
      closeDialog();
      utils.parentTasks.getMyTasks.invalidate();
      utils.parentTasks.getMyTaskSummary.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const closeDialog = useCallback(() => {
    setCompletionDialog(null);
    setNote("");
    setProofBase64(null);
    setProofMimeType("image/jpeg");
    setProofPreview(null);
    setIsUploading(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, or WebP image");
      return;
    }
    setProofMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setProofPreview(result);
      // Extract base64 data (remove data:image/xxx;base64, prefix)
      const base64 = result.split(",")[1];
      setProofBase64(base64);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }, []);

  const handleSubmitCompletion = useCallback(async () => {
    if (!completionDialog) return;
    const task = completionDialog.task;
    setIsUploading(true);

    try {
      let proofUrl: string | undefined;

      // Upload proof if provided
      if (proofBase64) {
        const result = await uploadProof.mutateAsync({
          taskId: task.id,
          imageBase64: proofBase64,
          mimeType: proofMimeType as "image/jpeg" | "image/png" | "image/webp",
        });
        proofUrl = result.proofUrl;
      }

      // Mark complete
      await markComplete.mutateAsync({
        taskId: task.id,
        note: note || undefined,
        proofImageUrl: proofUrl,
      });
    } catch {
      // Error handled by mutation onError
    } finally {
      setIsUploading(false);
    }
  }, [completionDialog, proofBase64, proofMimeType, note, uploadProof, markComplete]);

  // Group tasks by urgency
  const groupedTasks = useMemo(() => {
    if (!tasks) return null;
    const activeTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
    const completedTasks = tasks.filter((t) => t.status === "completed");

    const groups: Record<TaskGroup, typeof tasks> = {
      overdue: [],
      today: [],
      this_week: [],
      upcoming: [],
      no_date: [],
    };

    activeTasks.forEach((task) => {
      const group = getTaskGroup(task);
      groups[group].push(task);
    });

    return { groups, completedTasks, totalActive: activeTasks.length };
  }, [tasks]);

  // Calculate total earnable XP
  const totalEarnableXp = useMemo(() => {
    if (!tasks) return 0;
    return tasks
      .filter((t) => t.status !== "completed" && t.status !== "cancelled")
      .reduce((sum, t) => sum + (t.rewardXp ?? 0), 0);
  }, [tasks]);

  // Count tasks due today
  const todayCount = useMemo(() => {
    if (!groupedTasks) return 0;
    return groupedTasks.groups.today.length + groupedTasks.groups.overdue.length;
  }, [groupedTasks]);

  return (
    <div className="container max-w-2xl py-6 space-y-5">
      {/* Header with XP summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ListTodo className="h-6 w-6 text-primary" />
              My Tasks
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Complete tasks to earn XP and make your parent proud!
            </p>
          </div>
        </div>

        {/* XP & Stats Banner */}
        {groupedTasks && groupedTasks.totalActive > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/30">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Star className="h-5 w-5 fill-amber-400" />
              <span className="text-lg font-bold">{totalEarnableXp}</span>
              <span className="text-xs font-medium">XP available</span>
            </div>
            <div className="h-4 w-px bg-amber-300/50 dark:bg-amber-700/50" />
            {todayCount > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-medium">{todayCount} due today</span>
              </div>
            )}
            {groupedTasks.totalActive > 0 && (
              <div className="ml-auto text-xs text-muted-foreground">
                {groupedTasks.totalActive} active
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Groups */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : !groupedTasks || groupedTasks.totalActive === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <Trophy className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-semibold text-lg">All caught up!</p>
            <p className="text-sm text-muted-foreground mt-1">
              No pending tasks right now. Great job staying on top of things!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(["overdue", "today", "this_week", "upcoming", "no_date"] as TaskGroup[]).map((groupKey) => {
            const groupTasks = groupedTasks.groups[groupKey];
            if (groupTasks.length === 0) return null;
            const config = GROUP_CONFIG[groupKey];
            const GroupIcon = config.icon;

            return (
              <div key={groupKey} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <GroupIcon className={`h-4 w-4 ${config.color}`} />
                  <h2 className={`text-sm font-semibold ${config.color}`}>
                    {config.label}
                  </h2>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {groupTasks.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {groupTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onMarkDone={() => setCompletionDialog({ task })}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Completed tasks (collapsed) */}
          {groupedTasks.completedTasks.length > 0 && (
            <CompletedSection tasks={groupedTasks.completedTasks} />
          )}
        </div>
      )}

      {/* Completion Dialog — multi-step */}
      <Dialog open={completionDialog !== null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Mark as Done
            </DialogTitle>
          </DialogHeader>
          {completionDialog && (
            <div className="space-y-4">
              {/* Task info */}
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium text-sm">{completionDialog.task.title}</p>
                {completionDialog.task.rewardXp > 0 && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400" />
                    +{completionDialog.task.rewardXp} XP on approval
                  </p>
                )}
              </div>

              {/* Encouragement note from parent */}
              {completionDialog.task.encouragementNote && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 mb-0.5">
                        From {completionDialog.task.assignedBy}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        {completionDialog.task.encouragementNote}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Proof upload (if required or optional) */}
              <div className="space-y-2">
                <label className="text-xs font-medium flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  {completionDialog.task.requiresProof ? "Photo Proof (required)" : "Photo Proof (optional)"}
                </label>
                {proofPreview ? (
                  <div className="relative">
                    <img
                      src={proofPreview}
                      alt="Proof"
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => { setProofBase64(null); setProofPreview(null); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-primary"
                  >
                    <Upload className="h-5 w-5" />
                    <span className="text-xs font-medium">Tap to upload photo</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Optional note */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Add a note (optional)</label>
                <Textarea
                  placeholder="Tell your parent what you did..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={
                    isUploading ||
                    markComplete.isPending ||
                    (completionDialog.task.requiresProof && !proofBase64)
                  }
                  onClick={handleSubmitCompletion}
                >
                  {isUploading || markComplete.isPending ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Submit
                    </span>
                  )}
                </Button>
              </div>

              {completionDialog.task.requiresProof && !proofBase64 && (
                <p className="text-[11px] text-amber-600 text-center">
                  Photo proof is required for this task
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Task Card ───────────────────────────────────────────────────────────────

function TaskCard({ task, onMarkDone }: { task: any; onMarkDone: () => void }) {
  const hasPendingCompletion = task.completions?.some((c: any) => c.parentConfirmed === null);
  const wasRejected = task.completions?.some((c: any) => c.parentConfirmed === false);
  const wasConfirmed = task.completions?.some((c: any) => c.parentConfirmed === true);
  const latestCompletion = task.latestCompletion;

  // Determine visual state
  const getStatusConfig = () => {
    if (wasConfirmed) return { border: "border-green-200 dark:border-green-800", bg: "bg-green-50/50 dark:bg-green-950/20" };
    if (hasPendingCompletion) return { border: "border-amber-200 dark:border-amber-800", bg: "bg-amber-50/30 dark:bg-amber-950/20" };
    if (wasRejected && !hasPendingCompletion) return { border: "border-red-200 dark:border-red-800", bg: "bg-red-50/30 dark:bg-red-950/20" };
    if (task.status === "overdue") return { border: "border-red-200 dark:border-red-800", bg: "" };
    return { border: "", bg: "" };
  };

  const statusConfig = getStatusConfig();
  const canMarkDone = !wasConfirmed && !hasPendingCompletion && task.status !== "completed" && task.status !== "cancelled";

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-sm ${statusConfig.border} ${statusConfig.bg}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Left: Task info */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title row */}
            <div className="flex items-start gap-2">
              <h3 className="font-medium text-sm leading-tight">{task.title}</h3>
              {task.requiresProof && (
                <Badge variant="outline" className="text-[9px] shrink-0 border-purple-300 text-purple-600 dark:text-purple-400">
                  <Camera className="h-2 w-2 mr-0.5" /> Proof
                </Badge>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
            )}

            {/* Encouragement note */}
            {task.encouragementNote && (
              <div className="flex items-start gap-1.5 p-2 rounded-md bg-blue-50/80 dark:bg-blue-950/30">
                <MessageSquare className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-blue-700 dark:text-blue-300 line-clamp-2">
                  "{task.encouragementNote}"
                </p>
              </div>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap">
              {task.dueDate && (
                <span className={`text-[11px] flex items-center gap-0.5 ${
                  isOverdue(task.dueDate) && task.status !== "completed" ? "text-red-500 font-medium" : "text-muted-foreground"
                }`}>
                  <Calendar className="h-2.5 w-2.5" />
                  {formatDueDate(task.dueDate)}
                </span>
              )}
              {task.taskType === "recurring" && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1">
                  <Repeat className="h-2 w-2 mr-0.5" /> Recurring
                </Badge>
              )}
              {task.category && (
                <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">
                  {task.category}
                </Badge>
              )}
            </div>

            {/* Status indicators */}
            {hasPendingCompletion && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Clock className="h-3 w-3" />
                <span className="font-medium">Waiting for parent approval</span>
                {latestCompletion?.proofImageUrl && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1 ml-1">
                    <ImageIcon className="h-2 w-2 mr-0.5" /> Proof sent
                  </Badge>
                )}
              </div>
            )}
            {wasRejected && !hasPendingCompletion && !wasConfirmed && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="font-medium">Parent asked you to try again</span>
                </div>
                {latestCompletion?.parentNote && (
                  <p className="text-[11px] text-red-600/80 dark:text-red-400/80 pl-4.5 italic">
                    "{latestCompletion.parentNote}"
                  </p>
                )}
              </div>
            )}
            {wasConfirmed && (
              <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                <span className="font-medium">Confirmed by parent</span>
                {task.rewardXp > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium ml-1">
                    +{task.rewardXp} XP earned!
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: XP badge + action button */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* XP reward */}
            {task.rewardXp > 0 && !wasConfirmed && (
              <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                <Star className="h-3 w-3 fill-amber-400" />
                <span className="text-xs font-bold">+{task.rewardXp}</span>
              </div>
            )}

            {/* Action button — large, always visible */}
            {canMarkDone && (
              <Button
                size="sm"
                onClick={onMarkDone}
                className="h-9 px-3 text-xs font-semibold shadow-sm active:scale-[0.97] transition-transform"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                {wasRejected ? "Try Again" : "Done!"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Completed Section (collapsible) ─────────────────────────────────────────

function CompletedSection({ tasks }: { tasks: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const displayTasks = expanded ? tasks : tasks.slice(0, 3);

  return (
    <div className="space-y-2 pt-2 border-t">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left"
      >
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        Completed ({tasks.length})
        <ChevronRight className={`h-3.5 w-3.5 ml-auto transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
      {(expanded || tasks.length <= 3) && (
        <div className="space-y-1.5">
          {displayTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 p-2 rounded-lg opacity-60"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <span className="text-sm line-through truncate">{task.title}</span>
              {task.rewardXp > 0 && (
                <span className="text-[10px] text-amber-600 ml-auto shrink-0">+{task.rewardXp} XP</span>
              )}
            </div>
          ))}
          {!expanded && tasks.length > 3 && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-primary hover:underline pl-6"
            >
              Show {tasks.length - 3} more...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
