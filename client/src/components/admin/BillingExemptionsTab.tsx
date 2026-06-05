import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ShieldBan, ShieldCheck, Plus, MoreHorizontal, XCircle, Clock,
  ChevronLeft, ChevronRight, Loader2, AlertTriangle, Infinity,
  Calendar, UserPlus, Ban, Upload, Search, Check, X,
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

// ─── User Search Combobox ────────────────────────────────────────────────────

function UserSearchInput({ value, onChange }: { value: { id: number; name: string; email: string } | null; onChange: (u: { id: number; name: string; email: string } | null) => void }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: results, isLoading } = trpc.admin.listUsers.useQuery(
    { limit: 8, offset: 0, search: debouncedSearch },
    { enabled: debouncedSearch.length >= 2 }
  );

  const users = results?.rows ?? [];

  return (
    <div className="relative">
      {value ? (
        <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-muted/30">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{value.name || `User #${value.id}`}</p>
            <p className="text-xs text-muted-foreground truncate">{value.email} · ID: {value.id}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { onChange(null); setSearch(""); }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => { if (search.length >= 2) setOpen(true); }}
              className="pl-9"
            />
          </div>
          {open && search.length >= 2 && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-52 overflow-y-auto">
              {isLoading ? (
                <div className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                </div>
              ) : users.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">No users found</div>
              ) : (
                users.map((u: any) => (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center gap-2"
                    onClick={() => {
                      onChange({ id: u.id, name: u.name ?? "", email: u.email ?? "" });
                      setSearch("");
                      setOpen(false);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name || `User #${u.id}`}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email ?? u.openId}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{u.accountType}</Badge>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Bulk Import Dialog ──────────────────────────────────────────────────────

function BulkImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState<{ userId?: number; email?: string; type: string; reason: string; endDate?: string }[]>([]);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const grantMutation = trpc.payment.admin.grantExemption.useMutation();

  function parseCsv(text: string) {
    setParseError("");
    const lines = text.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) {
      setParseError("CSV must have a header row and at least one data row");
      setParsed([]);
      return;
    }
    const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
    const hasUserId = headers.includes("userid") || headers.includes("user_id") || headers.includes("id");
    const hasEmail = headers.includes("email");
    if (!hasUserId && !hasEmail) {
      setParseError("CSV must have a 'userId' or 'email' column");
      setParsed([]);
      return;
    }
    const rows: typeof parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      const row: any = {};
      headers.forEach((h, idx) => {
        const val = cols[idx] ?? "";
        if (h === "userid" || h === "user_id" || h === "id") row.userId = parseInt(val) || undefined;
        else if (h === "email") row.email = val || undefined;
        else if (h === "type") row.type = val || "perpetual";
        else if (h === "reason") row.reason = val || "Bulk import";
        else if (h === "enddate" || h === "end_date") row.endDate = val || undefined;
      });
      if (!row.type) row.type = "perpetual";
      if (!row.reason) row.reason = "Bulk import — school partnership";
      rows.push(row);
    }
    setParsed(rows);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCsv(text);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setImporting(true);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of parsed) {
      try {
        await grantMutation.mutateAsync({
          userId: row.userId ?? 0,
          type: row.type as any,
          reason: row.reason,
          endDate: row.endDate ? new Date(row.endDate) : undefined,
        });
        success++;
      } catch (err: any) {
        failed++;
        errors.push(`Row ${row.userId ?? row.email}: ${err.message}`);
      }
    }
    setResults({ success, failed, errors });
    setImporting(false);
    utils.payment.admin.listExemptions.invalidate();
  }

  function handleClose() {
    setCsvText("");
    setParsed([]);
    setParseError("");
    setResults(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-indigo-500" />
            Bulk Import Exemptions
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file with user IDs or emails to grant billing exemptions in batch.
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-emerald-600">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">{results.success} granted</span>
              </div>
              {results.failed > 0 && (
                <div className="flex items-center gap-1.5 text-red-600">
                  <X className="h-4 w-4" />
                  <span className="text-sm font-medium">{results.failed} failed</span>
                </div>
              )}
            </div>
            {results.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                {results.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-700 dark:text-red-300">{e}</p>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>CSV Format</Label>
              <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                userId,type,reason,endDate<br />
                42,perpetual,Scholarship student,<br />
                55,time_limited,Pilot program,2026-09-01
              </div>
              <p className="text-xs text-muted-foreground">
                Required: <code>userId</code> (or <code>email</code>). Optional: <code>type</code> (perpetual/time_limited), <code>reason</code>, <code>endDate</code>
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Upload CSV
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            </div>

            <Textarea
              placeholder="Or paste CSV content here..."
              value={csvText}
              onChange={(e) => { setCsvText(e.target.value); parseCsv(e.target.value); }}
              rows={5}
              className="font-mono text-xs"
            />

            {parseError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {parseError}
              </p>
            )}

            {parsed.length > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 rounded-lg p-3">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  {parsed.length} exemption{parsed.length > 1 ? "s" : ""} ready to import
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleImport} disabled={parsed.length === 0 || importing}>
                {importing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Import {parsed.length} Exemption{parsed.length !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function BillingExemptionsTab() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [grantDialog, setGrantDialog] = useState(false);
  const [bulkDialog, setBulkDialog] = useState(false);
  const [revokeDialog, setRevokeDialog] = useState<{ id: number; userName: string } | null>(null);

  // Grant form state
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string; email: string } | null>(null);
  const [grantForm, setGrantForm] = useState({
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
      setSelectedUser(null);
      setGrantForm({ type: "perpetual", reason: "", endDate: "", enforcementDate: "" });
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
    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }
    if (!grantForm.reason) {
      toast.error("Reason is required");
      return;
    }
    grantMutation.mutate({
      userId: selectedUser.id,
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkDialog(true)} className="gap-1.5">
            <Upload className="h-4 w-4" />
            Bulk Import
          </Button>
          <Button onClick={() => setGrantDialog(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Grant Exemption
          </Button>
        </div>
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
        <Card className="border-gray-200 dark:border-gray-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Expired</span>
            </div>
            <p className="text-2xl font-bold mt-1">{data?.rows.filter((r: any) => r.status === "expired").length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40 h-8 text-xs">
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
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
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
            ) : !data || data.rows.length === 0 ? (
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
              <Label>Search User</Label>
              <UserSearchInput value={selectedUser} onChange={setSelectedUser} />
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
            <Button onClick={handleGrant} disabled={grantMutation.isPending || !selectedUser}>
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

      {/* Bulk Import Dialog */}
      <BulkImportDialog open={bulkDialog} onOpenChange={setBulkDialog} />
    </div>
  );
}
