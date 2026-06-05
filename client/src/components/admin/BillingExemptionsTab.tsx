import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ShieldBan, ShieldCheck, Plus, MoreHorizontal, XCircle, Clock,
  ChevronLeft, ChevronRight, Loader2, AlertTriangle, Infinity,
  Calendar, UserPlus, Ban, RefreshCw,
} from "lucide-react";

const PAGE_SIZE = 20;

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    expired: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    revoked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    enforcing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${styles[status] ?? ""}`}>
      {status === "active" && <ShieldCheck className="h-3 w-3 mr-1" />}
      {status === "enforcing" && <AlertTriangle className="h-3 w-3 mr-1" />}
      {status === "revoked" && <Ban className="h-3 w-3 mr-1" />}
      {status === "expired" && <Clock className="h-3 w-3 mr-1" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function BillingExemptionsTab() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [grantDialog, setGrantDialog] = useState(false);
  const [revokeDialog, setRevokeDialog] = useState<{ id: number; userName: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Grant form state
  const [grantForm, setGrantForm] = useState({
    userId: "",
    type: "perpetual" as "perpetual" | "time_limited",
    reason: "",
    endDate: "",
    enforcementDate: "",
  });

  // Revoke form state
  const [revokeForm, setRevokeForm] = useState({
    reason: "",
    enforcementDate: "",
  });

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.payment.admin.listExemptions.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const grantMutation = trpc.payment.admin.grantExemption.useMutation({
    onSuccess: () => {
      toast.success("Billing exemption granted successfully");
      setGrantDialog(false);
      setGrantForm({ userId: "", type: "perpetual", reason: "", endDate: "", enforcementDate: "" });
      utils.payment.admin.listExemptions.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeMutation = trpc.payment.admin.revokeExemption.useMutation({
    onSuccess: () => {
      toast.success("Exemption revoked — user will be notified");
      setRevokeDialog(null);
      setRevokeForm({ reason: "", enforcementDate: "" });
      utils.payment.admin.listExemptions.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function handleGrant() {
    if (!grantForm.userId || !grantForm.reason) {
      toast.error("User ID and reason are required");
      return;
    }
    grantMutation.mutate({
      userId: parseInt(grantForm.userId),
      type: grantForm.type,
      reason: grantForm.reason,
      endDate: grantForm.endDate ? new Date(grantForm.endDate) : undefined,
      enforcementDate: grantForm.enforcementDate ? new Date(grantForm.enforcementDate) : undefined,
    });
  }

  function handleRevoke() {
    if (!revokeDialog) return;
    revokeMutation.mutate({
      exemptionId: revokeDialog.id,
      reason: revokeForm.reason || undefined,
      enforcementDate: revokeForm.enforcementDate ? new Date(revokeForm.enforcementDate) : undefined,
    });
  }

  const activeCount = data?.rows.filter((r: any) => r.status === "active").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ShieldBan className="h-5 w-5 text-indigo-500" />
            Billing Exemptions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Grant free access to users without requiring billing or a card on file
          </p>
        </div>
        <Button onClick={() => setGrantDialog(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Grant Exemption
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="border-emerald-200 dark:border-emerald-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Active</span>
            </div>
            <p className="text-2xl font-bold mt-1">{data?.rows.filter((r: any) => r.status === "active").length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Enforcing</span>
            </div>
            <p className="text-2xl font-bold mt-1">{data?.rows.filter((r: any) => r.status === "enforcing").length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Revoked</span>
            </div>
            <p className="text-2xl font-bold mt-1">{data?.rows.filter((r: any) => r.status === "revoked").length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Expired</span>
            </div>
            <p className="text-2xl font-bold mt-1">{data?.rows.filter((r: any) => r.status === "expired").length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="enforcing">Enforcing</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => utils.payment.admin.listExemptions.invalidate()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Enforcement</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data?.rows.length ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No billing exemptions found
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((ex: any) => (
                <TableRow key={ex.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{ex.userName ?? `User #${ex.userId}`}</p>
                      <p className="text-xs text-muted-foreground">{ex.userEmail ?? ""}</p>
                      {ex.userAccountType && (
                        <Badge variant="outline" className="text-[10px] mt-0.5">{ex.userAccountType}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {ex.type === "perpetual" ? (
                        <><Infinity className="h-3 w-3 mr-1" />Perpetual</>
                      ) : (
                        <><Calendar className="h-3 w-3 mr-1" />Time-limited</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell><StatusBadge status={ex.status} /></TableCell>
                  <TableCell>
                    <p className="text-xs max-w-[180px] truncate" title={ex.reason}>{ex.reason}</p>
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(ex.startDate)}</TableCell>
                  <TableCell className="text-xs">{ex.type === "perpetual" ? "∞" : formatDate(ex.endDate)}</TableCell>
                  <TableCell className="text-xs">{formatDate(ex.enforcementDate)}</TableCell>
                  <TableCell>
                    {ex.status === "active" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setRevokeDialog({ id: ex.id, userName: ex.userName ?? `User #${ex.userId}` })}
                            className="text-red-600"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-2" />
                            Revoke & Enforce Billing
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
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
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.total)} of {data.total}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={(page + 1) * PAGE_SIZE >= data.total} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Grant Exemption Dialog */}
      <Dialog open={grantDialog} onOpenChange={setGrantDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-500" />
              Grant Billing Exemption
            </DialogTitle>
            <DialogDescription>
              Allow a user to access EduChamp without billing or a card on file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="exemptUserId">User ID</Label>
              <Input
                id="exemptUserId"
                type="number"
                placeholder="e.g. 42"
                value={grantForm.userId}
                onChange={(e) => setGrantForm({ ...grantForm, userId: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Find the user ID from the Users tab</p>
            </div>
            <div className="space-y-2">
              <Label>Exemption Type</Label>
              <Select value={grantForm.type} onValueChange={(v: any) => setGrantForm({ ...grantForm, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="perpetual">Perpetual (no expiration)</SelectItem>
                  <SelectItem value="time_limited">Time-limited (set end date)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {grantForm.type === "time_limited" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="exemptEndDate">End Date</Label>
                  <Input
                    id="exemptEndDate"
                    type="date"
                    value={grantForm.endDate}
                    onChange={(e) => setGrantForm({ ...grantForm, endDate: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">When the free access period ends</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exemptEnfDate">Enforcement Date (optional)</Label>
                  <Input
                    id="exemptEnfDate"
                    type="date"
                    value={grantForm.enforcementDate}
                    onChange={(e) => setGrantForm({ ...grantForm, enforcementDate: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Grace period after end date. If not set, billing is enforced immediately after end date.
                  </p>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="exemptReason">Reason</Label>
              <Textarea
                id="exemptReason"
                placeholder="e.g. Scholarship student, pilot program, school partnership..."
                value={grantForm.reason}
                onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialog(false)} disabled={grantMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleGrant} disabled={grantMutation.isPending}>
              {grantMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Grant Free Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Exemption Dialog */}
      <Dialog open={!!revokeDialog} onOpenChange={() => setRevokeDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Revoke Exemption & Enforce Billing
            </DialogTitle>
            <DialogDescription>
              Revoke free access for <strong>{revokeDialog?.userName}</strong>. They will be notified and required to set up billing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="revokeEnfDate">Enforcement Date</Label>
              <Input
                id="revokeEnfDate"
                type="date"
                value={revokeForm.enforcementDate}
                onChange={(e) => setRevokeForm({ ...revokeForm, enforcementDate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                When billing will be required. Leave empty to enforce immediately. Setting a future date gives the user time to set up billing.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="revokeReason">Reason (optional)</Label>
              <Textarea
                id="revokeReason"
                placeholder="e.g. Pilot program ended, scholarship expired..."
                value={revokeForm.reason}
                onChange={(e) => setRevokeForm({ ...revokeForm, reason: e.target.value })}
                rows={2}
              />
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-medium">What happens when you revoke:</p>
                  <ul className="mt-1 space-y-0.5 list-disc list-inside">
                    <li>User receives an email notification about billing enforcement</li>
                    <li>If enforcement date is set, user has until that date to set up billing</li>
                    <li>After enforcement date, access is gated until billing is configured</li>
                    <li>If no enforcement date, access is gated immediately</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialog(null)} disabled={revokeMutation.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={revokeMutation.isPending}>
              {revokeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Revoke & Notify User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
