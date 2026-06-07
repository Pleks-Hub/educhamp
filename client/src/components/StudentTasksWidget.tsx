import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CheckCircle2, Clock, AlertTriangle, ListTodo, Calendar, Repeat, Timer
} from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export function StudentTasksWidget() {
  const { data: summary, isLoading } = trpc.parentTasks.getMyTaskSummary.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const [confirmTaskId, setConfirmTaskId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const utils = trpc.useUtils();

  const markComplete = trpc.parentTasks.markComplete.useMutation({
    onSuccess: () => {
      toast.success("Task marked as done! Waiting for parent confirmation.");
      setConfirmTaskId(null);
      setNote("");
      utils.parentTasks.getMyTaskSummary.invalidate();
      utils.parentTasks.getMyTasks.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading || !summary || summary.totalActive === 0) return null;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-primary" />
          My Tasks
          {summary.totalActive > 0 && (
            <Badge variant="secondary" className="text-[10px] ml-auto">
              {summary.totalActive} active
            </Badge>
          )}
        </CardTitle>
        {(summary.overdue > 0 || summary.dueSoon > 0) && (
          <div className="flex gap-2 mt-1">
            {summary.overdue > 0 && (
              <span className="text-[11px] text-red-500 flex items-center gap-0.5">
                <AlertTriangle className="h-3 w-3" /> {summary.overdue} overdue
              </span>
            )}
            {summary.dueSoon > 0 && (
              <span className="text-[11px] text-amber-500 flex items-center gap-0.5">
                <Clock className="h-3 w-3" /> {summary.dueSoon} due soon
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {summary.tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {task.taskType === "recurring" && <Repeat className="h-3 w-3 text-muted-foreground shrink-0" />}
                {task.taskType === "time_bound" && <Timer className="h-3 w-3 text-muted-foreground shrink-0" />}
                <p className="text-sm font-medium truncate">{task.title}</p>
                <Badge variant="outline" className={`text-[9px] shrink-0 ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                {task.dueDate && (
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-2.5 w-2.5" />
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
                {task.category && <span className="capitalize">{task.category}</span>}
                {task.rewardXp && task.rewardXp > 0 && (
                  <span className="text-amber-600 font-medium">+{task.rewardXp} XP</span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={() => setConfirmTaskId(task.id)}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" /> Done
            </Button>
          </div>
        ))}

        {summary.totalActive > 5 && (
          <a href="/my-tasks" className="text-xs text-primary hover:underline block text-center pt-1">
            View all {summary.totalActive} tasks →
          </a>
        )}
      </CardContent>

      {/* Confirm completion dialog */}
      <Dialog open={confirmTaskId !== null} onOpenChange={(o) => !o && setConfirmTaskId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark Task as Done</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your parent will be notified and can confirm your completion.
            </p>
            <Textarea
              placeholder="Add a note (optional)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmTaskId(null)}>Cancel</Button>
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
    </Card>
  );
}
