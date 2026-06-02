import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  UserPlus,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
} from "lucide-react";

export function ParentBillingRequests() {
  const [processingToken, setProcessingToken] = useState<string | null>(null);

  const { data: requests, isLoading } = trpc.payment.getPendingBillingRequests.useQuery();
  const { data: slots } = trpc.payment.checkStudentSlots.useQuery();
  const acceptMutation = trpc.payment.acceptBillingDelegation.useMutation();
  const rejectMutation = trpc.payment.rejectBillingDelegation.useMutation();
  const utils = trpc.useUtils();

  const handleAccept = async (token: string) => {
    setProcessingToken(token);
    try {
      await acceptMutation.mutateAsync({ token });
      toast.success("Student added to your account!");
      utils.payment.getPendingBillingRequests.invalidate();
      utils.payment.checkStudentSlots.invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to accept request");
    } finally {
      setProcessingToken(null);
    }
  };

  const handleReject = async (token: string) => {
    setProcessingToken(token);
    try {
      await rejectMutation.mutateAsync({ token });
      toast.info("Request declined.");
      utils.payment.getPendingBillingRequests.invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to decline request");
    } finally {
      setProcessingToken(null);
    }
  };

  if (isLoading || !requests?.length) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-amber-600" />
          Student billing requests
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-xs ml-1">
            {requests.length} pending
          </Badge>
        </CardTitle>
        <CardDescription>
          Students have requested you to set up billing for their accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Slot info */}
        {slots && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg bg-background border px-3 py-2">
            <Users className="h-3.5 w-3.5" />
            <span>
              {slots.current} of {slots.max} student slots used
              {!slots.available && (
                <span className="text-amber-600 font-medium ml-1">
                  (upgrade plan for more)
                </span>
              )}
            </span>
          </div>
        )}

        {requests.map((req: any) => {
          const isProcessing = processingToken === req.token;
          const isExpired = new Date() > new Date(req.expiresAt);

          return (
            <div
              key={req.token}
              className="rounded-lg border bg-background p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {req.studentName ?? "A student"} is requesting billing access
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {req.studentEmail ?? "No email provided"}
                  </p>
                </div>
                {isExpired ? (
                  <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Expired
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>

              {!isExpired && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => handleAccept(req.token)}
                    disabled={isProcessing || (slots && !slots.available)}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => handleReject(req.token)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    Decline
                  </Button>
                </div>
              )}

              {slots && !slots.available && !isExpired && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Your plan supports up to {slots.max} students. Upgrade to accept more.
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
