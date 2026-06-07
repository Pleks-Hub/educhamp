import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Plus, CheckCircle2, Clock, AlertTriangle, Trash2, Pencil,
  Calendar, Repeat, Timer, ThumbsUp, ThumbsDown, ListTodo,
  Camera, Image as ImageIcon, MessageSquare
} from "lucide-react";

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

export function ChildTasksPanel({ childId, childName }: ChildTasksPanelProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | TaskType>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
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
      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Pending" value={stats.pending} icon={Clock} color="text-amber-500" />
          <StatCard label="In Progress" value={stats.inProgress} icon={Timer} color="text-blue-500" />
          <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} color="text-green-500" />
          <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} color="text-red-500" />
        </div>
      )}

      {/* Filters + Create */}
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

        <Button size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New Task
        </Button>
      </div>

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
              onEdit={() => setEditingTask(task)}
              onDelete={() => {
                if (confirm(`Delete "${task.title}"?`)) deleteTask.mutate({ taskId: task.id });
              }}
              onConfirm={(completionId, confirmed) =>
                confirmCompletion.mutate({ completionId, confirmed })
              }
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <TaskFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(data) => createTask.mutate({ ...data, studentId: childId })}
        title={`New Task for ${childName}`}
        isLoading={createTask.isPending}
      />

      {/* Edit Dialog */}
      {editingTask && (
        <TaskFormDialog
          open={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={(data) => updateTask.mutate({ taskId: editingTask.id, ...data })}
          title={`Edit Task`}
          initialData={editingTask}
          isLoading={updateTask.isPending}
        />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

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

function TaskCard({ task, onEdit, onDelete, onConfirm }: {
  task: any;
  onEdit: () => void;
  onDelete: () => void;
  onConfirm: (completionId: number, confirmed: boolean) => void;
}) {
  const StatusIcon = STATUS_ICONS[task.status] ?? Clock;
  const pendingCompletions = task.completions?.filter((c: any) => c.parentConfirmed === null) ?? [];

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
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
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {task.status.replace("_", " ")}
              </span>
              {task.dueDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
              {task.category && (
                <span className="capitalize">{task.category}</span>
              )}
              {task.rewardXp > 0 && (
                <span className="text-amber-600 font-medium">+{task.rewardXp} XP</span>
              )}
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
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <p className="font-medium">Marked done {new Date(c.completedAt).toLocaleString()}</p>
                    {c.note && <p className="text-muted-foreground mt-0.5">"{c.note}"</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50" onClick={() => onConfirm(c.id, true)}>
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
              {isLoading ? "Saving..." : initialData ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
