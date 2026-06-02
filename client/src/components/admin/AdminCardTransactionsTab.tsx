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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CreditCard,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  AlertTriangle,
  Shield,
  Loader2,
  Search,
  Receipt,
  Eye,
  Ban,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_SIZE = 25;

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  trialing: "bg-blue-100 text-blue-700 border-blue-200",
  past_due: "bg-amber-100 text-amber-700 border-amber-200",
  canceled: "bg-red-100 text-red-600 border-red-200",
  free: "bg-slate-100 text-slate-600 border-slate-200",
};

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  "checkout.session.completed": { label: "Checkout", color: "bg-emerald-100 text-emerald-700" },
  "invoice.paid": { label: "Invoice Paid", color: "bg-emerald-100 text-emerald-700" },
  "invoice.payment_failed": { label: "Payment Failed", color: "bg-red-100 text-red-700" },
  "customer.subscription.created": { label: "Sub Created", color: "bg-blue-100 text-blue-700" },
  "customer.subscription.updated": { label: "Sub Updated", color: "bg-indigo-100 text-indigo-700" },
  "customer.subscription.deleted": { label: "Sub Deleted", color: "bg-red-100 text-red-700" },
  "admin.subscription.suspended": { label: "Admin Suspend", color: "bg-amber-100 text-amber-700" },
  "admin.subscription.resumed": { label: "Admin Resume", color: "bg-emerald-100 text-emerald-700" },
  "admin.subscription.created_manual": { label: "Admin Create", color: "bg-blue-100 text-blue-700" },
  "admin.card.deleted": { label: "Card Deleted", color: "bg-red-100 text-red-700" },
  "free_plan.activated": { label: "Free Activated", color: "bg-slate-100 text-slate-700" },
};

function getEventDisplay(event: string) {
  return EVENT_LABELS[event] ?? { label: event.replace(/\./g, " "), color: "bg-slate-100 text-slate-600" };
}

export function AdminCardTransactionsTab() {
  const [activeTab, setActiveTab] = useState("cards");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-5 w-5 text-indigo-500" />
        <h2 className="text-lg font-semibold">Card & Transaction Management</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cards" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Registered Cards
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Transaction Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-4">
          <CardsPanel />
        </TabsContent>
        <TabsContent value="transactions" className="mt-4">
          <TransactionsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Cards Panel ──────────────────────────────────────────────────────────────

function CardsPanel() {
  const [page, setPage] = useState(0);
  const [cardFilter, setCardFilter] = useState<string>("all");
  const [deleteDialog, setDeleteDialog] = useState<{ id: number; userName: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data, isLoading, refetch } = trpc.payment.admin.listCards.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    hasCard: cardFilter === "all" ? undefined : cardFilter === "with_card",
  });

  const deleteMutation = trpc.payment.admin.deleteCard.useMutation();

  async function handleDelete() {
    if (!deleteDialog) return;
    setDeleteLoading(true);
    try {
      await deleteMutation.mutateAsync({ subscriptionId: deleteDialog.id });
      toast.success(`Card removed for ${deleteDialog.userName}`);
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete card");
    } finally {
      setDeleteLoading(false);
      setDeleteDialog(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-muted-foreground">
            {data?.total ?? 0} registered subscription{(data?.total ?? 0) !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={cardFilter} onValueChange={(v) => { setCardFilter(v); setPage(0); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Card status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="with_card">With Card</SelectItem>
              <SelectItem value="no_card">No Card</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
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
              <TableHead>Card Brand</TableHead>
              <TableHead>Masked PAN</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading cards…
                </TableCell>
              </TableRow>
            ) : !data?.rows?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No cards found.
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((row: any) => (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{row.userName ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{row.userEmail ?? `User #${row.userId}`}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium capitalize">
                      {(row.planName ?? "—").replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.cardBrand ? (
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-sm capitalize">{row.cardBrand}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No card</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.cardLast4 ? (
                      <code className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded">
                        •••• •••• •••• {row.cardLast4}
                      </code>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.cardExpMonth && row.cardExpYear ? (
                      <span className="text-sm">
                        {String(row.cardExpMonth).padStart(2, "0")}/{row.cardExpYear}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`capitalize text-xs ${STATUS_COLORS[row.status] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {row.status?.replace("_", " ") ?? "—"}
                      </Badge>
                      {row.suspendedAt && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                          Suspended
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.cardLast4 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setDeleteDialog({ id: row.id, userName: row.userName ?? "User" })}
                            className="text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Remove Card
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Remove Card
            </DialogTitle>
            <DialogDescription>
              This will remove the card on file for <strong>{deleteDialog?.userName}</strong>. 
              The user will lose access until they add a new card. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Transactions Panel ───────────────────────────────────────────────────────

function TransactionsPanel() {
  const [page, setPage] = useState(0);
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [detailDialog, setDetailDialog] = useState<any>(null);

  const { data, isLoading, refetch } = trpc.payment.admin.listTransactions.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    event: eventFilter === "all" ? undefined : eventFilter,
  });

  const fmtDate = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleString() : "—";

  const fmtAmount = (cents: number | null | undefined) =>
    cents !== null && cents !== undefined
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
      : "—";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-muted-foreground">
            {data?.total ?? 0} transaction{(data?.total ?? 0) !== 1 ? "s" : ""} recorded
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={eventFilter} onValueChange={(v) => { setEventFilter(v); setPage(0); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="checkout.session.completed">Checkout</SelectItem>
              <SelectItem value="invoice.paid">Invoice Paid</SelectItem>
              <SelectItem value="invoice.payment_failed">Payment Failed</SelectItem>
              <SelectItem value="customer.subscription.created">Sub Created</SelectItem>
              <SelectItem value="customer.subscription.updated">Sub Updated</SelectItem>
              <SelectItem value="customer.subscription.deleted">Sub Deleted</SelectItem>
              <SelectItem value="admin.subscription.suspended">Admin Suspend</SelectItem>
              <SelectItem value="admin.subscription.resumed">Admin Resume</SelectItem>
              <SelectItem value="admin.card.deleted">Card Deleted</SelectItem>
              <SelectItem value="free_plan.activated">Free Activated</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Stripe ID</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading transactions…
                </TableCell>
              </TableRow>
            ) : !data?.rows?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((row: any) => {
                const evtDisplay = getEventDisplay(row.event);
                return (
                  <TableRow key={row.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(row.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{row.userName ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{row.userEmail ?? (row.userId ? `User #${row.userId}` : "System")}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${evtDisplay.color}`}>
                        {evtDisplay.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {fmtAmount(row.amountCents)}
                    </TableCell>
                    <TableCell>
                      {row.status ? (
                        <span className="text-xs capitalize text-muted-foreground">{row.status}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.stripeObjectId ? (
                        <code className="text-xs font-mono text-muted-foreground truncate max-w-[120px] block">
                          {row.stripeObjectId.length > 20
                            ? row.stripeObjectId.slice(0, 8) + "…" + row.stripeObjectId.slice(-8)
                            : row.stripeObjectId}
                        </code>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDetailDialog(row)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
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

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-500" />
              Transaction Detail
            </DialogTitle>
          </DialogHeader>
          {detailDialog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Event</p>
                  <p className="font-medium">{detailDialog.event}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{fmtDate(detailDialog.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">User</p>
                  <p className="font-medium">{detailDialog.userName ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{detailDialog.userEmail ?? ""}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-medium">{fmtAmount(detailDialog.amountCents)}</p>
                </div>
                {detailDialog.stripeEventId && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Stripe Event ID</p>
                    <code className="text-xs font-mono break-all">{detailDialog.stripeEventId}</code>
                  </div>
                )}
                {detailDialog.stripeObjectId && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Stripe Object ID</p>
                    <code className="text-xs font-mono break-all">{detailDialog.stripeObjectId}</code>
                  </div>
                )}
              </div>
              {detailDialog.metadata && Object.keys(detailDialog.metadata).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Metadata</p>
                  <pre className="bg-muted/50 rounded p-2 text-xs font-mono overflow-auto max-h-40">
                    {JSON.stringify(detailDialog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
