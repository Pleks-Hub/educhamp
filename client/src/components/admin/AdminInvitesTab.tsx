import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, RefreshCw, Loader2, Send, Clock, CheckCircle2, XCircle, Ban } from "lucide-react";

export function AdminInvitesTab() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: invites, isLoading, refetch } = trpc.admin.listAllInvites.useQuery();
  const resendInvite = trpc.admin.resendStudentInvite.useMutation({
    onSuccess: (data) => {
      toast.success(data.emailSent ? "Invite resent with email!" : "Invite token regenerated.");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = (invites ?? []).filter((inv) => {
    if (statusFilter === "all") return true;
    const isExpired = new Date(inv.expiresAt) < new Date() && inv.status === "pending";
    const computedStatus = inv.status === "accepted" ? "accepted" : isExpired ? "expired" : inv.status;
    return computedStatus === statusFilter;
  });

  const counts = {
    total: invites?.length ?? 0,
    pending: invites?.filter((i) => i.status === "pending" && new Date(i.expiresAt) >= new Date()).length ?? 0,
    expired: invites?.filter((i) => i.status === "pending" && new Date(i.expiresAt) < new Date()).length ?? 0,
    accepted: invites?.filter((i) => i.status === "accepted").length ?? 0,
    revoked: invites?.filter((i) => i.status === "revoked").length ?? 0,
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Student Invites</h2>
          <p className="text-sm text-muted-foreground">
            All invitations sent by parents to students. Manage and resend as needed.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{counts.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{counts.expired}</p>
              <p className="text-xs text-muted-foreground">Expired</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{counts.accepted}</p>
              <p className="text-xs text-muted-foreground">Accepted</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
              <Ban className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{counts.revoked}</p>
              <p className="text-xs text-muted-foreground">Revoked</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({counts.total})</SelectItem>
            <SelectItem value="pending">Pending ({counts.pending})</SelectItem>
            <SelectItem value="expired">Expired ({counts.expired})</SelectItem>
            <SelectItem value="accepted">Accepted ({counts.accepted})</SelectItem>
            <SelectItem value="revoked">Revoked ({counts.revoked})</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs">
          Showing {filtered.length} of {counts.total}
        </Badge>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Child</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No invites found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((inv) => {
                    const isExpired = new Date(inv.expiresAt) < new Date() && inv.status === "pending";
                    const computedStatus = inv.status === "accepted" ? "accepted" : isExpired ? "expired" : inv.status;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="text-sm font-medium">
                          {inv.childName || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {inv.childEmail || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {inv.childGrade || "—"}
                        </TableCell>
                        <TableCell>
                          {computedStatus === "pending" && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Pending</Badge>
                          )}
                          {computedStatus === "expired" && (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Expired</Badge>
                          )}
                          {computedStatus === "accepted" && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Accepted</Badge>
                          )}
                          {computedStatus === "revoked" && (
                            <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">Revoked</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(inv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(inv.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                        </TableCell>
                        <TableCell>
                          {(computedStatus === "pending" || computedStatus === "expired") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              disabled={resendInvite.isPending}
                              onClick={() => resendInvite.mutate({ inviteId: inv.id, origin: window.location.origin })}
                            >
                              {resendInvite.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              Resend
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
