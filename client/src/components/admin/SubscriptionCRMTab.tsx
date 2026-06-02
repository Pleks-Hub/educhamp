import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CreditCard,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pause,
  Play,
  XCircle,
  Trash2,
  AlertTriangle,
  Shield,
  Users,
  Loader2,
  Clock,
  UserPlus,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  trialing: "bg-blue-100 text-blue-700 border-blue-200",
  past_due: "bg-amber-100 text-amber-700 border-amber-200",
  canceled: "bg-red-100 text-red-600 border-red-200",
  unpaid: "bg-rose-100 text-rose-700 border-rose-200",
  incomplete: "bg-slate-100 text-slate-600 border-slate-200",
  free: "bg-slate-100 text-slate-600 border-slate-200",
};

const PLAN_COLORS: Record<string, string> = {
  free: "text-slate-600",
  family: "text-indigo-600",
  premium_family: "text-purple-600",
  isd_school: "text-blue-600",
};

const PAGE_SIZE = 25;

export function SubscriptionCRMTab() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [actionDialog, setActionDialog] = useState<{
    type: "suspend" | "resume" | "cancel" | "terminate";
    subId: number;
    userName: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [manualDialog, setManualDialog] = useState(false);
  const [manualForm, setManualForm] = useState({
    userId: "",
    planName: "free",
    billingPeriod: "monthly",
  });

  const { data, isLoading, refetch } = trpc.payment.admin.listSubscriptionsDetailed.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    planName: planFilter === "all" ? undefined : planFilter,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const { data: expiringCards } = trpc.payment.admin.getExpiringCards.useQuery(
    { withinDays: 30 },
    { staleTime: 5 * 60_000 }
  );

  const suspendMutation = trpc.payment.admin.suspendSubscription.useMutation();
  const resumeMutation = trpc.payment.admin.resumeSubscription.useMutation();
  const cancelMutation = trpc.payment.admin.cancelSubscription.useMutation();
  const updateStatusMutation = trpc.payment.admin.updateSubscriptionStatus.useMutation();
  const createManualMutation = trpc.payment.admin.createSubscriptionManual.useMutation();

  const fmtDate = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString() : "—";

  const fmtAmount = (cents: number | null | undefined) =>
    cents !== null && cents !== undefined
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
      : "—";

  async function handleAction() {
    if (!actionDialog) return;
    setActionLoading(true);
    try {
      switch (actionDialog.type) {
        case "suspend":
          await suspendMutation.mutateAsync({ id: actionDialog.subId });
          toast.success(`Subscription for ${actionDialog.userName} suspended.`);
          break;
        case "resume":
          await resumeMutation.mutateAsync({ id: actionDialog.subId });
          toast.success(`Subscription for ${actionDialog.userName} resumed.`);
          break;
        case "cancel":
          await cancelMutation.mutateAsync({ id: actionDialog.subId, immediate: false });
          toast.success(`Subscription for ${actionDialog.userName} will cancel at period end.`);
          break;
        case "terminate":
          await cancelMutation.mutateAsync({ id: actionDialog.subId, immediate: true });
          toast.success(`Subscription for ${actionDialog.userName} terminated immediately.`);
          break;
      }
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Action failed");
    } finally {
      setActionLoading(false);
      setActionDialog(null);
    }
  }

  async function handleCreateManual() {
    if (!manualForm.userId) {
      toast.error("User ID is required");
      return;
    }
    setActionLoading(true);
    try {
      await createManualMutation.mutateAsync({
        userId: parseInt(manualForm.userId, 10),
        planName: manualForm.planName as "free" | "family" | "premium_family",
        billingPeriod: manualForm.billingPeriod as "monthly" | "annual",
      });
      toast.success("Manual subscription created.");
      refetch();
      setManualDialog(false);
      setManualForm({ userId: "", planName: "free", billingPeriod: "monthly" });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create subscription");
    } finally {
      setActionLoading(false);
    }
  }

  const ACTION_CONFIG = {
    suspend: {
      title: "Suspend subscription",
      description: "This will immediately block the user's access. They will see a suspended overlay.",
      icon: Pause,
      color: "text-amber-600",
      buttonText: "Suspend",
      buttonClass: "bg-amber-600 hover:bg-amber-700",
    },
    resume: {
      title: "Resume subscription",
      description: "This will restore the user's access and clear the suspension.",
      icon: Play,
      color: "text-emerald-600",
      buttonText: "Resume",
      buttonClass: "bg-emerald-600 hover:bg-emerald-700",
    },
    cancel: {
      title: "Cancel at period end",
      description: "The user will retain access until the current billing period ends, then be canceled.",
      icon: XCircle,
      color: "text-red-500",
      buttonText: "Cancel at period end",
      buttonClass: "bg-red-600 hover:bg-red-700",
    },
    terminate: {
      title: "Terminate immediately",
      description: "This will immediately cancel the subscription and revoke access. This cannot be undone.",
      icon: Trash2,
      color: "text-red-700",
      buttonText: "Terminate now",
      buttonClass: "bg-red-700 hover:bg-red-800",
    },
  };

  return (
    <div className="space-y-4">
      {/* Expiring cards alert */}
      {expiringCards && expiringCards.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              {expiringCards.length} card{expiringCards.length > 1 ? "s" : ""} expiring within 30 days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {expiringCards.slice(0, 5).map((c: any) => (
                <div key={c.subscriptionId} className="flex items-center justify-between text-xs">
                  <span className="font-medium">{c.userName ?? `User #${c.userId}`}</span>
                  <span className="text-muted-foreground">
                    {c.cardBrand} ****{c.cardLast4} — expires {String(c.cardExpMonth).padStart(2, "0")}/{c.cardExpYear}
                  </span>
                </div>
              ))}
              {expiringCards.length > 5 && (
                <p className="text-xs text-amber-600">+ {expiringCards.length - 5} more</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold">Subscription Management</h2>
          {data?.total !== undefined && (
            <span className="text-sm text-muted-foreground">({data.total} total)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(0); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="family">Family</SelectItem>
              <SelectItem value="premium_family">Premium</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trialing">Trialing</SelectItem>
              <SelectItem value="past_due">Past Due</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setManualDialog(true)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Manual
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Card</TableHead>
              <TableHead>Period End</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading subscriptions…
                </TableCell>
              </TableRow>
            ) : !data?.rows?.length ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No subscriptions found.
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((s: any) => (
                <TableRow key={s.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{s.userName ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{s.userEmail ?? `User #${s.userId}`}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium capitalize ${PLAN_COLORS[s.planName] ?? ""}`}>
                      {s.planName.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell className="capitalize text-sm text-muted-foreground">
                    {s.billingPeriod}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {fmtAmount(s.amountCents)}
                  </TableCell>
                  <TableCell>
                    {s.cardLast4 ? (
                      <div className="text-xs">
                        <span className="capitalize">{s.cardBrand ?? "Card"}</span> ****{s.cardLast4}
                        {s.cardExpMonth && s.cardExpYear && (
                          <p className="text-muted-foreground">
                            {String(s.cardExpMonth).padStart(2, "0")}/{s.cardExpYear}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No card</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {fmtDate(s.currentPeriodEnd)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`capitalize ${STATUS_COLORS[s.status] ?? ""}`}
                      >
                        {s.status.replace("_", " ")}
                      </Badge>
                      {s.suspendedAt && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                          <Pause className="h-2.5 w-2.5 mr-0.5" />
                          Suspended
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!s.suspendedAt && s.status !== "canceled" && (
                          <DropdownMenuItem
                            onClick={() => setActionDialog({ type: "suspend", subId: s.id, userName: s.userName ?? "User" })}
                            className="text-amber-600"
                          >
                            <Pause className="h-3.5 w-3.5 mr-2" />
                            Suspend
                          </DropdownMenuItem>
                        )}
                        {s.suspendedAt && (
                          <DropdownMenuItem
                            onClick={() => setActionDialog({ type: "resume", subId: s.id, userName: s.userName ?? "User" })}
                            className="text-emerald-600"
                          >
                            <Play className="h-3.5 w-3.5 mr-2" />
                            Resume
                          </DropdownMenuItem>
                        )}
                        {s.status !== "canceled" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setActionDialog({ type: "cancel", subId: s.id, userName: s.userName ?? "User" })}
                              className="text-red-500"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-2" />
                              Cancel at period end
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setActionDialog({ type: "terminate", subId: s.id, userName: s.userName ?? "User" })}
                              className="text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Terminate immediately
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.total)} of{" "}
            {data.total}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={(page + 1) * PAGE_SIZE >= data.total}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Action Confirmation Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          {actionDialog && (() => {
            const cfg = ACTION_CONFIG[actionDialog.type];
            const Icon = cfg.icon;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${cfg.color}`} />
                    {cfg.title}
                  </DialogTitle>
                  <DialogDescription>
                    {cfg.description}
                    <br />
                    <strong className="text-foreground mt-2 block">
                      User: {actionDialog.userName}
                    </strong>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setActionDialog(null)} disabled={actionLoading}>
                    Cancel
                  </Button>
                  <Button
                    className={cfg.buttonClass + " text-white"}
                    onClick={handleAction}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {cfg.buttonText}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Manual Subscription Dialog */}
      <Dialog open={manualDialog} onOpenChange={setManualDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-500" />
              Create manual subscription
            </DialogTitle>
            <DialogDescription>
              Manually set up a subscription on a user's behalf.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="manualUserId">User ID</Label>
              <Input
                id="manualUserId"
                type="number"
                placeholder="e.g. 42"
                value={manualForm.userId}
                onChange={(e) => setManualForm({ ...manualForm, userId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={manualForm.planName} onValueChange={(v) => setManualForm({ ...manualForm, planName: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="family">Family ($19.99/mo)</SelectItem>
                  <SelectItem value="premium_family">Premium Family ($29.99/mo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Billing period</Label>
              <Select value={manualForm.billingPeriod} onValueChange={(v) => setManualForm({ ...manualForm, billingPeriod: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDialog(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleCreateManual} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
