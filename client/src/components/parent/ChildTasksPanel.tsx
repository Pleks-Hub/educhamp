import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Plus, CheckCircle2, Clock, AlertTriangle, Trash2, Pencil,
  Calendar, Repeat, Timer, ThumbsUp, ThumbsDown, ListTodo,
  Camera, Image as ImageIcon, MessageSquare, Zap, Archive,
  BookOpen, Dumbbell, Music, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChildTasksPanelProps {
  childId: number;
  childName: string;
}

type TaskType = "one_off" | "recurring" | "time_bound";
type Priority = "low" | "medium" | "high";
type StatusFilter = "all" | "pending" | "in_progress" | "completed" | "overdue" | "cancelled";

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  one_off: "One-off",
  recurring: "Recurring",
  time_bound: "Time-bound",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  in_progress: Timer,
  completed: CheckCircle2,
  overdue: AlertTriangle,
};

const CATEGORIES = ["chore", "homework", "exercise", "reading", "music", "other"];
const RECURRENCE_OPTIONS = ["daily", "weekly", "weekdays", "biweekly", "monthly"];

// ─── Quick-Add Templates ─────────────────────────────────────────────────────
const QUICK_TEMPLATES = [
  { icon: "🧹", label: "Clean Room", title: "Clean your room", category: "chore", taskType: "recurring" as TaskType, recurrenceRule: "daily", rewardXp: 30, priority: "medium" as Priority },
  { icon: "📚", label: "Homework", title: "Complete homework", category: "homework", taskType: "one_off" as TaskType, rewardXp: 50, priority: "high" as Priority },
  { icon: "📖", label: "Reading 30min", title: "Read for 30 minutes", category: "reading", taskType: "recurring" as TaskType, recurrenceRule: "daily", rewardXp: 40, priority: "medium" as Priority },
  { icon: "🏃", label: "Exercise", title: "Exercise for 20 minutes", category: "exercise", taskType: "recurring" as TaskType, recurrenceRule: "daily", rewardXp: 35, priority: "medium" as Priority },
  { icon: "🎵", label: "Music Practice", title: "Practice instrument for 20 minutes", category: "music", taskType: "recurring" as TaskType, recurrenceRule: "weekdays", rewardXp: 40, priority: "medium" as Priority },
  { icon: "🛏️", label: "Make Bed", title: "Make your bed", category: "chore", taskType: "recurring" as TaskType, recurrenceRule: "daily", rewardXp: 15, priority: "low" as Priority },
  { icon: "🍽️", label: "Set Table", title: "Set the dinner table", category: "chore", taskType: "recurring" as TaskType, recurrenceRule: "daily", rewardXp: 20, priority: "low" as Priority },
  { icon: "🐕", label: "Walk Dog", title: "Walk the dog", category: "chore", taskType: "recurring" as TaskType, recurrenceRule: "daily", rewardXp: 35, priority: "medium" as Priority },
];

// ─── Pie Chart (CSS-only) ────────────────────────────────────────────────────
function TaskStatusPie({ stats }: { stats: { pending: number; inProgress: number; completed: number; overdue: number } }) {
  const total = stats.pending + stats.inProgress + stats.completed + stats.overdue;
  if (total === 0) return null;

  const segments = [
    { label: "Pending", value: stats.pending, color: "#f59e0b" },
    { label: "In Progress", value: stats.inProgress, color: "#3b82f6" },
    { label: "Completed", value: stats.completed, color: "#10b981" },
    { label: "Overdue", value: stats.overdue, color: "#ef4444" },
  ].filter(s => s.value > 0);

  // Build conic-gradient
  let cumulative = 0;
  const gradientParts = segments.map(s => {
    const start = cumulative;
    const end = cumulative + (s.value / total) * 360;
    cumulative = end;
    return `${s.color} ${start}deg ${end}deg`;
  });

  return (
    <div className="flex items-center gap-4">
      <div
        className="w-16 h-16 rounded-full shrink-0"
        style={{ background: `conic-gradient(${gradientParts.join(", ")})` }}
      />
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-semibold">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function ChildTasksPanel({ childId, childName }: ChildTasksPanelProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | TaskType>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const utils = trpc.useUtils();

  const { data: tasks, isLoading } = trpc.parentTasks.list.useQuery(
    { studentId: childId, status: statusFilter, taskType: typeFilter },
    { refetchInterval: 30_000 }
  );

  const { data: stats } = trpc.parentTasks.getStats.useQuery({ studentId: childId });

  const createTask = trpc.parentTasks.create.useMutation({
    onSuccess: () => {
      toast.success("Task created!");
      setCreateOpen(false);
      utils.parentTasks.list.invalidate();
      utils.parentTasks.getStats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateTask = trpc.parentTasks.update.useMutation({
    onSuccess: () => {
      toast.success("Task updated!");
      setEditingTask(null);
      utils.parentTasks.list.invalidate();
      utils.parentTasks.getStats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteTask = trpc.parentTasks.delete.useMutation({
    onSuccess: () => {
      toast.success("Task deleted");
      utils.parentTasks.list.invalidate();
      utils.parentTasks.getStats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const confirmCompletion = trpc.parentTasks.confirmCompletion.useMutation({
    onSuccess: () => {
      toast.success("Completion reviewed!");
      utils.parentTasks.list.invalidate();
      utils.parentTasks.getStats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Bulk actions
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkConfirm = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const tasksToConfirm = (tasks ?? []).filter(t => selectedIds.has(t.id));
      let confirmed = 0;
      for (const task of tasksToConfirm) {
        const pending = task.completions?.filter((c: any) => c.parentConfirmed === null) ?? [];
        for (const c of pending) {
          await confirmCompletion.mutateAsync({ completionId: c.id, confirmed: true });
          confirmed++;
        }
      }
      toast.success(`Confirmed ${confirmed} completion${confirmed !== 1 ? "s" : ""}!`);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(e.message ?? "Bulk confirm failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Archive ${selectedIds.size} task(s)? They will be marked as cancelled.`)) return;
    setBulkLoading(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await updateTask.mutateAsync({ taskId: id, status: "cancelled" });
      }
      toast.success(`Archived ${selectedIds.size} task(s)`);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(e.message ?? "Bulk archive failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!tasks) return;
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map(t => t.id)));
    }
  };

  const pendingApprovalCount = useMemo(() => {
    return (tasks ?? []).reduce((acc, t) => acc + (t.completions?.filter((c: any) => c.parentConfirmed === null)?.length ?? 0), 0);
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Visual Status Overview */}
      {stats && (stats.pending + stats.inProgress + stats.completed + stats.overdue > 0) && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Task Overview</h3>
            {pendingApprovalCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                {pendingApprovalCount} awaiting review
              </Badge>
            )}
          </div>
          <TaskStatusPie stats={stats} />
        </Card>
      )}

      {/* Quick-Add Templates */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-500" /> Quick Add
        </h3>
        <div className="flex flex-wrap gap-2">
          {QUICK_TEMPLATES.map((t) => (
            <Button
              key={t.label}
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              disabled={createTask.isPending}
              onClick={() => createTask.mutate({
                studentId: childId,
                title: t.title,
                category: t.category,
                taskType: t.taskType,
                priority: t.priority,
                rewardXp: t.rewardXp,
                recurrenceRule: t.recurrenceRule as "daily" | "weekly" | "weekdays" | "biweekly" | "monthly" | undefined,
              })}
            >
              <span>{t.icon}</span> {t.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Filters + Bulk Actions + Create */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | TaskType)}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="one_off">One-off</SelectItem>
            <SelectItem value="recurring">Recurring</SelectItem>
            <SelectItem value="time_bound">Time-bound</SelectItem>
          </SelectContent>
        </Select>

        {/* Bulk action buttons */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-1 ml-2">
            <Badge variant="secondary" className="text-xs">{selectedIds.size} selected</Badge>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-600" onClick={handleBulkConfirm} disabled={bulkLoading}>
              <ThumbsUp className="h-3 w-3" /> Confirm All
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-muted-foreground" onClick={handleBulkArchive} disabled={bulkLoading}>
              <Archive className="h-3 w-3" /> Archive
            </Button>
          </div>
        )}

        <Button size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New Task
        </Button>
      </div>

      {/* Select All */}
      {tasks && tasks.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={selectedIds.size === tasks.length && tasks.length > 0}
            onCheckedChange={toggleSelectAll}
            className="h-3.5 w-3.5"
          />
          <span className="text-xs text-muted-foreground">Select all</span>
        </div>
      )}

      {/* Task List */}
      {!tasks || tasks.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <ListTodo className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No tasks yet</p>
          <p className="text-sm mt-1">Create tasks or chores for {childName} to complete.</p>
          <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Create First Task
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              selected={selectedIds.has(task.id)}
              onToggleSelect={() => toggleSelect(task.id)}
              onEdit={() => setEditingTask(task)}
              onDelete={() => {
                if (confirm(`Delete "${task.title}"?`)) deleteTask.mutate({ taskId: task.id });
              }}
              onConfirm={(completionId, confirmed, bonusXp) =>
                confirmCompletion.mutate({ completionId, confirmed, bonusXp })
              }
            />
          ))}
        </div>
      )}

      {/* Create Dialog — Step-by-Step Wizard */}
      <TaskWizardDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(data) => createTask.mutate({ ...data, studentId: childId })}
        title={`New Task for ${childName}`}
        isLoading={createTask.isPending}
      />

      {/* Edit Dialog — Full form */}
      {editingTask && (
        <TaskFormDialog
          open={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={(data) => updateTask.mutate({ taskId: editingTask.id, ...data })}
          title={`Edit: ${editingTask.title}`}
          initialData={editingTask}
          isLoading={updateTask.isPending}
        />
      )}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <div>
          <p className="text-lg font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}

// ─── Task Card ───────────────────────────────────────────────────────────────

function TaskCard({ task, selected, onToggleSelect, onEdit, onDelete, onConfirm }: {
  task: any;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConfirm: (completionId: number, confirmed: boolean, bonusXp?: number) => void;
}) {
  const StatusIcon = STATUS_ICONS[task.status] ?? Clock;
  const pendingCompletions = task.completions?.filter((c: any) => c.parentConfirmed === null) ?? [];

  return (
    <Card className={cn("overflow-hidden transition-all", selected && "ring-2 ring-primary/50")}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Checkbox
              checked={selected}
              onCheckedChange={onToggleSelect}
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm truncate">{task.title}</h4>
                <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[task.priority as Priority]}`}>
                  {task.priority}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {task.taskType === "one_off" && <Calendar className="h-2.5 w-2.5 mr-0.5" />}
                  {task.taskType === "recurring" && <Repeat className="h-2.5 w-2.5 mr-0.5" />}
                  {task.taskType === "time_bound" && <Timer className="h-2.5 w-2.5 mr-0.5" />}
                  {TASK_TYPE_LABELS[task.taskType as TaskType]}
                </Badge>
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <StatusIcon className="h-3 w-3" /> {task.status.replace("_", " ")}
                </span>
                {task.dueDate && (
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-3 w-3" /> {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
                {task.rewardXp > 0 && (
                  <span className="flex items-center gap-0.5 text-violet-600 font-medium">
                    <Sparkles className="h-3 w-3" /> {task.rewardXp} XP
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Pending completions awaiting review */}
        {pendingCompletions.length > 0 && (
          <div className="mt-3 border-t pt-3 space-y-2">
            <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Awaiting your review
            </p>
            {pendingCompletions.map((c: any) => (
              <div key={c.id} className="bg-amber-50 dark:bg-amber-900/10 rounded-lg px-3 py-2 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs">
                    <p className="font-medium">Marked done {new Date(c.completedAt).toLocaleString()}</p>
                    {c.note && <p className="text-muted-foreground mt-0.5">"{c.note}"</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={500}
                      placeholder="Bonus XP"
                      className="w-20 h-7 text-xs border rounded px-1.5 text-center"
                      id={`bonus-xp-${c.id}`}
                      defaultValue={0}
                    />
                    <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50" onClick={() => {
                      const el = document.getElementById(`bonus-xp-${c.id}`) as HTMLInputElement;
                      const bonus = Math.min(500, Math.max(0, Number(el?.value) || 0));
                      onConfirm(c.id, true, bonus > 0 ? bonus : undefined);
                    }}>
                      <ThumbsUp className="h-3 w-3 mr-1" /> Confirm
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => onConfirm(c.id, false)}>
                      <ThumbsDown className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
                {/* Proof image preview */}
                {c.proofImageUrl && (
                  <div className="mt-1">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                      <ImageIcon className="h-2.5 w-2.5" /> Photo proof:
                    </p>
                    <a href={c.proofImageUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={c.proofImageUrl}
                        alt="Task proof"
                        className="w-full max-w-[200px] h-24 object-cover rounded-md border hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Step-by-Step Task Wizard (simplified creation) ──────────────────────────

type WizardStep = "basics" | "schedule" | "rewards";

function TaskWizardDialog({ open, onClose, onSubmit, title, isLoading }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  title: string;
  isLoading: boolean;
}) {
  const [step, setStep] = useState<WizardStep>("basics");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    taskType: "one_off" as TaskType,
    priority: "medium" as Priority,
    dueDate: "",
    startDate: "",
    recurrenceRule: "",
    recurrenceDays: [] as string[],
    recurrenceEndDate: "",
    category: "",
    rewardXp: 50,
    requiresProof: false,
    encouragementNote: "",
  });

  const steps: { key: WizardStep; label: string }[] = [
    { key: "basics", label: "What & When" },
    { key: "schedule", label: "Schedule" },
    { key: "rewards", label: "Rewards" },
  ];

  const currentIdx = steps.findIndex(s => s.key === step);

  const canAdvance = () => {
    if (step === "basics") return formData.title.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (step === "basics") setStep("schedule");
    else if (step === "schedule") setStep("rewards");
  };

  const handleBack = () => {
    if (step === "schedule") setStep("basics");
    else if (step === "rewards") setStep("schedule");
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const payload: any = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      taskType: formData.taskType,
      priority: formData.priority,
      category: formData.category || undefined,
      rewardXp: formData.rewardXp,
      requiresProof: formData.requiresProof,
      encouragementNote: formData.encouragementNote.trim() || undefined,
    };
    if (formData.dueDate) payload.dueDate = new Date(formData.dueDate).toISOString();
    if (formData.startDate) payload.startDate = new Date(formData.startDate).toISOString();
    if (formData.taskType === "recurring") {
      if (formData.recurrenceRule) payload.recurrenceRule = formData.recurrenceRule;
      if (formData.recurrenceDays.length > 0) payload.recurrenceDays = formData.recurrenceDays;
      if (formData.recurrenceEndDate) payload.recurrenceEndDate = new Date(formData.recurrenceEndDate).toISOString();
    }
    onSubmit(payload);
    // Reset
    setFormData({ title: "", description: "", taskType: "one_off", priority: "medium", dueDate: "", startDate: "", recurrenceRule: "", recurrenceDays: [], recurrenceEndDate: "", category: "", rewardXp: 50, requiresProof: false, encouragementNote: "" });
    setStep("basics");
  };

  const dayOptions = [
    { key: "mon", label: "Mon" }, { key: "tue", label: "Tue" }, { key: "wed", label: "Wed" },
    { key: "thu", label: "Thu" }, { key: "fri", label: "Fri" }, { key: "sat", label: "Sat" }, { key: "sun", label: "Sun" },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setStep("basics"); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">Create a new task step by step</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                i <= currentIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {i + 1}
              </div>
              <span className={cn("text-xs", i <= currentIdx ? "font-medium" : "text-muted-foreground")}>{s.label}</span>
              {i < steps.length - 1 && <div className="w-6 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>

        {/* Step: Basics */}
        {step === "basics" && (
          <div className="space-y-4">
            <div>
              <Label>What needs to be done? *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Clean your room, Finish math homework"
                autoFocus
              />
            </div>
            <div>
              <Label>Details (optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Any extra instructions..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pick one..." /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData(p => ({ ...p, priority: v as Priority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Low</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="high">🔴 High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step: Schedule */}
        {step === "schedule" && (
          <div className="space-y-4">
            <div>
              <Label>How often?</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(["one_off", "recurring", "time_bound"] as TaskType[]).map(t => (
                  <Button
                    key={t}
                    type="button"
                    variant={formData.taskType === t ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setFormData(p => ({ ...p, taskType: t }))}
                  >
                    {t === "one_off" && <Calendar className="h-3 w-3 mr-1" />}
                    {t === "recurring" && <Repeat className="h-3 w-3 mr-1" />}
                    {t === "time_bound" && <Timer className="h-3 w-3 mr-1" />}
                    {TASK_TYPE_LABELS[t]}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>{formData.taskType === "time_bound" ? "End Date" : "Due Date"} (optional)</Label>
              <Input type="datetime-local" value={formData.dueDate} onChange={(e) => setFormData(p => ({ ...p, dueDate: e.target.value }))} />
            </div>

            {formData.taskType === "time_bound" && (
              <div>
                <Label>Start Date</Label>
                <Input type="datetime-local" value={formData.startDate} onChange={(e) => setFormData(p => ({ ...p, startDate: e.target.value }))} />
              </div>
            )}

            {formData.taskType === "recurring" && (
              <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                <div>
                  <Label>Frequency</Label>
                  <Select value={formData.recurrenceRule} onValueChange={(v) => setFormData(p => ({ ...p, recurrenceRule: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select frequency..." /></SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_OPTIONS.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Days (optional)</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {dayOptions.map(d => (
                      <Button
                        key={d.key}
                        type="button"
                        size="sm"
                        variant={formData.recurrenceDays.includes(d.key) ? "default" : "outline"}
                        className="h-7 text-xs px-2"
                        onClick={() => setFormData(p => ({
                          ...p,
                          recurrenceDays: p.recurrenceDays.includes(d.key)
                            ? p.recurrenceDays.filter((x: string) => x !== d.key)
                            : [...p.recurrenceDays, d.key],
                        }))}
                      >
                        {d.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Ends on (optional)</Label>
                  <Input type="datetime-local" value={formData.recurrenceEndDate} onChange={(e) => setFormData(p => ({ ...p, recurrenceEndDate: e.target.value }))} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Rewards */}
        {step === "rewards" && (
          <div className="space-y-4">
            <div>
              <Label>XP Reward</Label>
              <div className="flex items-center gap-3 mt-1">
                <Input
                  type="number"
                  min={0}
                  max={500}
                  value={formData.rewardXp}
                  onChange={(e) => setFormData(p => ({ ...p, rewardXp: parseInt(e.target.value) || 0 }))}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">XP (0–500)</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Typical: 15–50 XP for chores, 50–200 XP for homework</p>
            </div>

            <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5" /> Require Photo Proof
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Student must upload a photo before marking done</p>
                </div>
                <Switch
                  checked={formData.requiresProof}
                  onCheckedChange={(v) => setFormData(p => ({ ...p, requiresProof: v }))}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Encouragement Note (optional)
              </Label>
              <Textarea
                placeholder="Great job! You can do it!"
                value={formData.encouragementNote}
                onChange={(e) => setFormData(p => ({ ...p, encouragementNote: e.target.value }))}
                rows={2}
                className="mt-1 text-sm resize-none"
                maxLength={500}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" onClick={step === "basics" ? onClose : handleBack}>
            {step === "basics" ? "Cancel" : "← Back"}
          </Button>
          {step === "rewards" ? (
            <Button onClick={handleSubmit} disabled={isLoading || !canAdvance()}>
              {isLoading ? "Creating..." : "Create Task ✓"}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canAdvance()}>
              Next →
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Full Task Form Dialog (for editing) ─────────────────────────────────────

function TaskFormDialog({ open, onClose, onSubmit, title, initialData, isLoading }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  title: string;
  initialData?: any;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState(() => ({
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    taskType: (initialData?.taskType ?? "one_off") as TaskType,
    priority: (initialData?.priority ?? "medium") as Priority,
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().slice(0, 16) : "",
    startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().slice(0, 16) : "",
    recurrenceRule: initialData?.recurrenceRule ?? "",
    recurrenceDays: initialData?.recurrenceDays ?? [],
    recurrenceEndDate: initialData?.recurrenceEndDate ? new Date(initialData.recurrenceEndDate).toISOString().slice(0, 16) : "",
    category: initialData?.category ?? "",
    rewardXp: initialData?.rewardXp ?? 0,
    requiresProof: initialData?.requiresProof ?? false,
    encouragementNote: initialData?.encouragementNote ?? "",
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const payload: any = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      taskType: formData.taskType,
      priority: formData.priority,
      category: formData.category || undefined,
      rewardXp: formData.rewardXp,
      requiresProof: formData.requiresProof,
      encouragementNote: formData.encouragementNote.trim() || undefined,
    };
    if (formData.dueDate) payload.dueDate = new Date(formData.dueDate).toISOString();
    if (formData.startDate) payload.startDate = new Date(formData.startDate).toISOString();
    if (formData.taskType === "recurring") {
      if (formData.recurrenceRule) payload.recurrenceRule = formData.recurrenceRule;
      if (formData.recurrenceDays.length > 0) payload.recurrenceDays = formData.recurrenceDays;
      if (formData.recurrenceEndDate) payload.recurrenceEndDate = new Date(formData.recurrenceEndDate).toISOString();
    }
    onSubmit(payload);
  };

  const dayOptions = [
    { key: "mon", label: "Mon" }, { key: "tue", label: "Tue" }, { key: "wed", label: "Wed" },
    { key: "thu", label: "Thu" }, { key: "fri", label: "Fri" }, { key: "sat", label: "Sat" }, { key: "sun", label: "Sun" },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Clean your room" />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Optional details..." rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={formData.taskType} onValueChange={(v) => setFormData(p => ({ ...p, taskType: v as TaskType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_off">One-off</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                  <SelectItem value="time_bound">Time-bound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData(p => ({ ...p, priority: v as Priority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>XP Reward</Label>
              <Input type="number" min={0} max={500} value={formData.rewardXp} onChange={(e) => setFormData(p => ({ ...p, rewardXp: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>

          {/* Proof & Encouragement */}
          <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" /> Require Photo Proof
                </Label>
                <p className="text-[11px] text-muted-foreground">Student must upload a photo before marking done</p>
              </div>
              <Switch
                checked={formData.requiresProof}
                onCheckedChange={(v) => setFormData(p => ({ ...p, requiresProof: v }))}
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Encouragement Note
              </Label>
              <Textarea
                placeholder="Great job! You can do it! (shown to student on this task)"
                value={formData.encouragementNote}
                onChange={(e) => setFormData(p => ({ ...p, encouragementNote: e.target.value }))}
                rows={2}
                className="mt-1 text-sm resize-none"
                maxLength={500}
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <Label>{formData.taskType === "time_bound" ? "End Date" : "Due Date"}</Label>
            <Input type="datetime-local" value={formData.dueDate} onChange={(e) => setFormData(p => ({ ...p, dueDate: e.target.value }))} />
          </div>

          {/* Time-bound: start date */}
          {formData.taskType === "time_bound" && (
            <div>
              <Label>Start Date</Label>
              <Input type="datetime-local" value={formData.startDate} onChange={(e) => setFormData(p => ({ ...p, startDate: e.target.value }))} />
            </div>
          )}

          {/* Recurring options */}
          {formData.taskType === "recurring" && (
            <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
              <div>
                <Label>Frequency</Label>
                <Select value={formData.recurrenceRule} onValueChange={(v) => setFormData(p => ({ ...p, recurrenceRule: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select frequency..." /></SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_OPTIONS.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Days (optional)</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {dayOptions.map(d => (
                    <Button
                      key={d.key}
                      type="button"
                      size="sm"
                      variant={formData.recurrenceDays.includes(d.key) ? "default" : "outline"}
                      className="h-7 text-xs px-2"
                      onClick={() => setFormData(p => ({
                        ...p,
                        recurrenceDays: p.recurrenceDays.includes(d.key)
                          ? p.recurrenceDays.filter((x: string) => x !== d.key)
                          : [...p.recurrenceDays, d.key],
                      }))}
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Ends on (optional)</Label>
                <Input type="datetime-local" value={formData.recurrenceEndDate} onChange={(e) => setFormData(p => ({ ...p, recurrenceEndDate: e.target.value }))} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Update"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
