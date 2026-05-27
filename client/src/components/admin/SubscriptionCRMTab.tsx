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
import { CreditCard, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  trialing: "bg-blue-100 text-blue-700 border-blue-200",
  past_due: "bg-amber-100 text-amber-700 border-amber-200",
  canceled: "bg-red-100 text-red-600 border-red-200",
  unpaid: "bg-rose-100 text-rose-700 border-rose-200",
  incomplete: "bg-slate-100 text-slate-600 border-slate-200",
};

const PAGE_SIZE = 25;

export function SubscriptionCRMTab() {
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [page, setPage] = useState(0);

  const { data, isLoading } = trpc.payment.admin.listSubscriptions.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const fmtDate = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString() : "—";

  const fmtAmount = (cents: number | null | undefined) =>
    cents !== null && cents !== undefined
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
      : "—";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold">Subscriptions</h2>
          {data?.total !== undefined && (
            <span className="text-sm text-muted-foreground">({data.total} total)</span>
          )}
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-36">
            <SelectValue />
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
              <TableHead>Period End</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading subscriptions…
                </TableCell>
              </TableRow>
            ) : !data?.rows?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No subscriptions found.
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{(s as any).userName ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{(s as any).userEmail ?? `User #${s.userId}`}</p>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize text-sm">
                    {s.planName.replace("_", " ")}
                  </TableCell>
                  <TableCell className="capitalize text-sm text-muted-foreground">
                    {s.billingPeriod}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {fmtAmount(s.amountCents)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {fmtDate(s.currentPeriodEnd)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`capitalize ${STATUS_COLORS[s.status] ?? ""}`}
                    >
                      {s.status.replace("_", " ")}
                    </Badge>
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
    </div>
  );
}
