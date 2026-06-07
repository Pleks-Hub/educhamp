/**
 * SharedTasks — student page showing shared/delegated tasks from parents
 * that siblings can claim cooperatively.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Hand, CheckCircle2, Clock, Zap, Camera, Trophy,
  AlertCircle, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SharedTasks() {
  const { data: tasks, isLoading } = trpc.sharedTasks.listForStudent.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const utils = trpc.useUtils();

  const claimTask = trpc.sharedTasks.claim.useMutation({
    onSuccess: () => {
      toast.success("Task claimed! Complete it to earn XP.", { icon: "🙌" });
      utils.sharedTasks.listForStudent.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const completeTask = trpc.sharedTasks.complete.useMutation({
    onSuccess: () => {
      toast.success("Task submitted for parent approval!", { icon: "✅" });
      utils.sharedTasks.listForStudent.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [uploadingClaimId, setUploadingClaimId] = useState<number | null>(null);

  async function handleProofUpload(claimId: number, file: File) {
    setUploadingClaimId(claimId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      completeTask.mutate({ claimId, proofImageUrl: url });
    } catch (err) {
      toast.error("Failed to upload proof image");
    } finally {
      setUploadingClaimId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const available = tasks?.filter(t => !t.myClaim && !t.isFull) ?? [];
  const myClaimed = tasks?.filter(t => t.myClaim) ?? [];
  const full = tasks?.filter(t => !t.myClaim && t.isFull) ?? [];

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <Users className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Shared Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Cooperative tasks from your parent — claim them before your siblings do!
          </p>
        </div>
      </div>

      {/* Available to claim */}
      {available.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Hand className="h-4 w-4" />
            Available to Claim ({available.length})
          </h2>
          <div className="grid gap-3">
            {available.map(task => (
              <Card key={task.id} className="border-2 border-dashed border-violet-200 bg-violet-50/50 hover:border-violet-400 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="font-semibold text-foreground">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.category && (
                          <Badge variant="outline" className="text-xs">{task.category}</Badge>
                        )}
                        <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                          <Zap className="h-3 w-3 mr-1" />
                          {task.rewardXp} XP
                        </Badge>
                        {task.requiresProof && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                            <Camera className="h-3 w-3 mr-1" />
                            Proof required
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {task.claimCount}/{task.maxClaimants} claimed
                        </span>
                      </div>
                      {task.dueDate && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0 bg-violet-600 hover:bg-violet-700 text-white"
                      onClick={() => claimTask.mutate({ sharedTaskId: task.id })}
                      disabled={claimTask.isPending}
                    >
                      <Hand className="h-4 w-4 mr-1" />
                      Claim
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* My claimed tasks */}
      {myClaimed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            My Claimed Tasks ({myClaimed.length})
          </h2>
          <div className="grid gap-3">
            {myClaimed.map(task => {
              const claim = task.myClaim!;
              const isCompleted = !!claim.completedAt;
              const isConfirmed = claim.parentConfirmed === true;
              const isRejected = claim.parentConfirmed === false;

              return (
                <Card key={task.id} className={cn(
                  "border",
                  isConfirmed ? "border-green-200 bg-green-50/50" :
                  isRejected ? "border-red-200 bg-red-50/50" :
                  isCompleted ? "border-amber-200 bg-amber-50/50" :
                  "border-blue-200 bg-blue-50/50"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{task.title}</h3>
                          {isConfirmed && (
                            <Badge className="text-xs bg-green-100 text-green-700">
                              <Trophy className="h-3 w-3 mr-1" />
                              Confirmed
                            </Badge>
                          )}
                          {isRejected && (
                            <Badge className="text-xs bg-red-100 text-red-700">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Needs Redo
                            </Badge>
                          )}
                          {isCompleted && !isConfirmed && !isRejected && (
                            <Badge className="text-xs bg-amber-100 text-amber-700">
                              <Clock className="h-3 w-3 mr-1" />
                              Awaiting Approval
                            </Badge>
                          )}
                          {!isCompleted && (
                            <Badge className="text-xs bg-blue-100 text-blue-700">
                              In Progress
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                            <Zap className="h-3 w-3 mr-1" />
                            {task.rewardXp} XP
                          </Badge>
                        </div>
                      </div>

                      {/* Action buttons */}
                      {!isCompleted && (
                        <div className="flex flex-col gap-2 shrink-0">
                          {task.requiresProof ? (
                            <label className="cursor-pointer">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white pointer-events-none"
                                disabled={uploadingClaimId === claim.id}
                              >
                                {uploadingClaimId === claim.id ? (
                                  <>Uploading...</>
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4 mr-1" />
                                    Upload & Done
                                  </>
                                )}
                              </Button>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleProofUpload(claim.id, file);
                                }}
                              />
                            </label>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => completeTask.mutate({ claimId: claim.id })}
                              disabled={completeTask.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Done
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Fully claimed (by others) */}
      {full.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Users className="h-4 w-4" />
            Claimed by Others ({full.length})
          </h2>
          <div className="grid gap-3">
            {full.map(task => (
              <Card key={task.id} className="border border-muted bg-muted/30 opacity-60">
                <CardContent className="p-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">{task.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      Claimed by: {task.claimedBy.map(c => c.studentName).join(", ")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {(!tasks || tasks.length === 0) && (
        <Card className="border-2 border-dashed border-muted">
          <CardContent className="p-8 text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto">
              <Users className="h-7 w-7 text-violet-500" />
            </div>
            <p className="font-semibold text-foreground">No Shared Tasks Yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              When your parent posts shared tasks, they'll appear here. Be the first to claim them and earn bonus XP!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
