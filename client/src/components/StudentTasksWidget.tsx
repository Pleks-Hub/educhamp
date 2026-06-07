import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CheckCircle2, Clock, AlertTriangle, ListTodo, Calendar, Repeat, Timer,
  Star, Zap, Camera, Upload, X, PartyPopper, MessageSquare
} from "lucide-react";

export function StudentTasksWidget() {
  const { data: summary, isLoading } = trpc.parentTasks.getMyTaskSummary.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const [completionDialog, setCompletionDialog] = useState<{ task: any } | null>(null);
  const [note, setNote] = useState("");
  const [proofBase64, setProofBase64] = useState<string | null>(null);
  const [proofMimeType, setProofMimeType] = useState<string>("image/jpeg");
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const uploadProof = trpc.parentTasks.uploadProof.useMutation();

  const markComplete = trpc.parentTasks.markComplete.useMutation({
    onSuccess: () => {
      toast.success("Task submitted! Waiting for parent approval.", {
        icon: <PartyPopper className="h-4 w-4 text-amber-500" />,
      });
      closeDialog();
      utils.parentTasks.getMyTaskSummary.invalidate();
      utils.parentTasks.getMyTasks.invalidate();
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
      const base64 = result.split(",")[1];
      setProofBase64(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const handleSubmitCompletion = useCallback(async () => {
    if (!completionDialog) return;
    const task = completionDialog.task;
    setIsUploading(true);

    try {
      let proofUrl: string | undefined;
      if (proofBase64) {
        const result = await uploadProof.mutateAsync({
          taskId: task.id,
          imageBase64: proofBase64,
          mimeType: proofMimeType as "image/jpeg" | "image/png" | "image/webp",
        });
        proofUrl = result.proofUrl;
      }
      await markComplete.mutateAsync({
        taskId: task.id,
        note: note || undefined,
        proofImageUrl: proofUrl,
      });
    } catch {
      // handled by mutation onError
    } finally {
      setIsUploading(false);
    }
  }, [completionDialog, proofBase64, proofMimeType, note, uploadProof, markComplete]);

  if (isLoading || !summary || summary.totalActive === 0) return null;

  // Calculate total earnable XP from active tasks
  const totalEarnableXp = summary.tasks.reduce((sum: number, t: any) => sum + (t.rewardXp ?? 0), 0);

  return (
    <Card className="border shadow-sm overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-primary" />
          My Tasks
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {summary.totalActive} active
          </Badge>
        </CardTitle>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-1.5">
          {totalEarnableXp > 0 && (
            <span className="text-[11px] flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <Star className="h-3 w-3 fill-amber-400" />
              {totalEarnableXp} XP earnable
            </span>
          )}
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
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-1.5">
        {summary.tasks.map((task: any) => (
          <div
            key={task.id}
            className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {task.taskType === "recurring" && <Repeat className="h-3 w-3 text-muted-foreground shrink-0" />}
                {task.taskType === "time_bound" && <Timer className="h-3 w-3 text-muted-foreground shrink-0" />}
                <p className="text-sm font-medium truncate">{task.title}</p>
                {task.requiresProof && (
                  <Camera className="h-3 w-3 text-purple-500 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                {task.dueDate && (
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-2.5 w-2.5" />
                    {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                )}
                {task.rewardXp > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5 fill-amber-400" />+{task.rewardXp} XP
                  </span>
                )}
              </div>
            </div>
            {/* Always-visible Done button */}
            <Button
              size="sm"
              className="h-7 px-2.5 text-xs font-semibold shrink-0 active:scale-[0.97] transition-transform"
              onClick={() => setCompletionDialog({ task })}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" /> Done
            </Button>
          </div>
        ))}

        {summary.totalActive > 5 && (
          <a
            href="/my-tasks"
            className="text-xs text-primary hover:underline flex items-center justify-center gap-1 pt-2"
          >
            View all {summary.totalActive} tasks <Zap className="h-3 w-3" />
          </a>
        )}
      </CardContent>

      {/* Completion Dialog */}
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
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium text-sm">{completionDialog.task.title}</p>
                {completionDialog.task.rewardXp > 0 && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400" />
                    +{completionDialog.task.rewardXp} XP on approval
                  </p>
                )}
              </div>

              {/* Encouragement note */}
              {completionDialog.task.encouragementNote && (
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
                  <div className="flex items-start gap-1.5">
                    <MessageSquare className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-blue-700 dark:text-blue-300">
                      {completionDialog.task.encouragementNote}
                    </p>
                  </div>
                </div>
              )}

              {/* Proof upload */}
              <div className="space-y-2">
                <label className="text-xs font-medium flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  {completionDialog.task.requiresProof ? "Photo Proof (required)" : "Photo Proof (optional)"}
                </label>
                {proofPreview ? (
                  <div className="relative">
                    <img src={proofPreview} alt="Proof" className="w-full h-28 object-cover rounded-lg border" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-5 w-5"
                      onClick={() => { setProofBase64(null); setProofPreview(null); }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-[11px] font-medium">Tap to upload photo</span>
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

              {/* Note */}
              <Textarea
                placeholder="Add a note (optional)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />

              {/* Submit */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={closeDialog}>Cancel</Button>
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
                      <CheckCircle2 className="h-4 w-4" /> Submit
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
    </Card>
  );
}
