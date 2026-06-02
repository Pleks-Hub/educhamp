import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  User,
  AlertTriangle,
} from "lucide-react";

export function StudentBillingDelegation() {
  const [parentEmail, setParentEmail] = useState("");
  const [parentName, setParentName] = useState("");
  const [sending, setSending] = useState(false);

  const { data: delegations, isLoading } = trpc.payment.getMyBillingDelegations.useQuery();
  const createDelegation = trpc.payment.createBillingDelegation.useMutation();
  const utils = trpc.useUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentEmail.trim()) return;

    setSending(true);
    try {
      await createDelegation.mutateAsync({
        parentEmail: parentEmail.trim(),
        parentName: parentName.trim() || undefined,
      });
      toast.success("Request sent! Your parent/guardian will receive an email.");
      setParentEmail("");
      setParentName("");
      utils.payment.getMyBillingDelegations.invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send request");
    } finally {
      setSending(false);
    }
  };

  const STATUS_DISPLAY: Record<string, { label: string; icon: React.ElementType; class: string }> = {
    pending: { label: "Pending", icon: Clock, class: "bg-amber-50 text-amber-700 border-amber-200" },
    accepted: { label: "Accepted", icon: CheckCircle2, class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { label: "Declined", icon: XCircle, class: "bg-red-50 text-red-600 border-red-200" },
    expired: { label: "Expired", icon: AlertTriangle, class: "bg-slate-50 text-slate-500 border-slate-200" },
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-indigo-500" />
            Request parent/guardian billing
          </CardTitle>
          <CardDescription>
            Since you're under 18, a parent or guardian needs to set up billing for your account. Enter their email and we'll send them a request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parentEmail" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Parent/guardian email
              </Label>
              <Input
                id="parentEmail"
                type="email"
                placeholder="parent@example.com"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentName" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Parent/guardian name (optional)
              </Label>
              <Input
                id="parentName"
                type="text"
                placeholder="Jane Doe"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={sending || !parentEmail.trim()} className="w-full gap-2">
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending request...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send billing request
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Previous requests */}
      {delegations && delegations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Previous requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {delegations.map((d: any) => {
              const status = STATUS_DISPLAY[d.status] ?? STATUS_DISPLAY.pending;
              const StatusIcon = status.icon;
              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {d.parentName || d.parentEmail}
                    </p>
                    {d.parentName && (
                      <p className="text-xs text-muted-foreground truncate">{d.parentEmail}</p>
                    )}
                  </div>
                  <Badge variant="outline" className={`flex items-center gap-1 text-xs shrink-0 ${status.class}`}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
