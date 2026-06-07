import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CheckCircle2, Clock, AlertTriangle, ListTodo, Calendar, Repeat, Timer,
  ThumbsUp, ThumbsDown, XCircle
} from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

type StatusFilter = "all" | "pending" | "in_progress" | "completed" | "overdue";

export default function MyTasks() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [confirmTaskId, setConfirmTaskId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const utils = trpc.useUtils();

  const { data: tasks, isLoading } = trpc.parentTasks.getMyTasks.useQuery(
    { status: statusFilter },
    { refetchInterval: 30_000 }
  );

  const markComplete = trpc.parentTasks.markComplete.useMutation({
    onSuccess: () => {
      toast.success("Task marked as done! Waiting for parent confirmation.");
      setConfirmTaskId(null);
      setNote("");
      utils.parentTasks.getMyTasks.invalidate();
      utils.parentTasks.getMyTaskSummary.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="container max-w-3xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListTodo className="h-6 w-6 text-primary" />
            My Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Tasks and chores assigned by your parent/guardian</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center text-muted-foreground">
            <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="font-medium text-lg">No tasks yet</p>
            <p className="text-sm mt-1">Your parent hasn't assigned any tasks yet. Check back later!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onMarkDone={() => setConfirmTaskId(task.id)}
            />
          ))}
        </div>
      )}

      {/* Confirm completion dialog */}
      <Dialog open={confirmTaskId !== null} onOpenChange={(o) => !o && setConfirmTaskId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark Task as Done</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your parent/guardian will be notified and can confirm your completion.
            </p>
            <Textarea
              placeholder="Add a note about what you did (optional)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setConfirmTaskId(null); setNote(""); }}>Cancel</Button>
              <Button
                size="sm"
                disabled={markComplete.isPending}
                onClick={() => confirmTaskId && markComplete.mutate({ taskId: confirmTaskId, note: note || undefined })}
              >
                {markComplete.isPending ? "Submitting..." : "Confirm Done"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskCard({ task, onMarkDone }: { task: any; onMarkDone: () => void }) {
  const isCompleted = task.status === "completed";
  const isOverdue = task.status === "overdue";
  const hasPendingCompletion = task.completions?.some((c: any) => c.parentConfirmed === null);
  const wasRejected = task.completions?.some((c: any) => c.parentConfirmed === false);
  const wasConfirmed = task.completions?.some((c: any) => c.parentConfirmed === true);

  return (
    <Card className={`overflow-hidden transition-all ${isOverdue ? "border-red-200 dark:border-red-800" : ""} ${isCompleted ? "opacity-70" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-sm">{task.title}</h3>
              <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[task.priority]}`}>
                {task.priority}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {task.taskType === "one_off" && <Calendar className="h-2.5 w-2.5 mr-0.5 inline" />}
                {task.taskType === "recurring" && <Repeat className="h-2.5 w-2.5 mr-0.5 inline" />}
                {task.taskType === "time_bound" && <Timer className="h-2.5 w-2.5 mr-0.5 inline" />}
                {task.taskType.replace("_", " ")}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="text-[10px]">
                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Overdue
                </Badge>
              )}
            </div>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1.5">{task.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {task.dueDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
              {task.category && <span className="capitalize">{task.category}</span>}
              {task.rewardXp > 0 && (
                <span className="text-amber-600 font-medium">+{task.rewardXp} XP</span>
              )}
            </div>

            {/* Completion status */}
            {hasPendingCompletion && (
              <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                <Clock className="h-3 w-3" /> Awaiting parent confirmation
              </div>
            )}
            {wasRejected && !hasPendingCompletion && !wasConfirmed && (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                <XCircle className="h-3 w-3" /> Parent requested redo
              </div>
            )}
            {wasConfirmed && (
              <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3 w-3" /> Confirmed by parent
              </div>
            )}
          </div>

          {/* Action button */}
          {!isCompleted && !hasPendingCompletion && (
            <Button size="sm" onClick={onMarkDone} className="shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Done
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
