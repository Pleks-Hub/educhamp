import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Footprints, ChevronLeft, ChevronRight, RefreshCw, Filter, X, Eye, LogIn, LogOut, ArrowRightLeft } from "lucide-react";

const PAGE_SIZE = 30;

const ACTION_STYLES: Record<string, { label: string; color: string; icon: typeof Eye }> = {
  page_visit: { label: "Page Visit", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300", icon: Eye },
  session_start: { label: "Session Start", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", icon: LogIn },
  session_end: { label: "Session End", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", icon: LogOut },
  session_switch: { label: "User Switch", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: ArrowRightLeft },
};

export function ImpersonationAuditTrailTab() {
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [adminSearch, setAdminSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const { data, isLoading, refetch, isFetching } = trpc.admin.getImpersonationAuditLog.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    let rows = data.rows;
    if (actionFilter) rows = rows.filter(r => r.action === actionFilter);
    if (adminSearch) rows = rows.filter(r => r.adminName.toLowerCase().includes(adminSearch.toLowerCase()));
    if (userSearch) rows = rows.filter(r => r.impersonatedUserName.toLowerCase().includes(userSearch.toLowerCase()));
    return rows;
  }, [data?.rows, actionFilter, adminSearch, userSearch]);

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);
  const hasFilters = actionFilter || adminSearch || userSearch;

  const clearFilters = () => {
    setActionFilter("");
    setAdminSearch("");
    setUserSearch("");
    setPage(0);
  };

  const formatTime = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    return d.toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };

  const formatPath = (path: string | null) => {
    if (!path) return "—";
    // Shorten long paths
    if (path.length > 40) return path.slice(0, 37) + "...";
    return path;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Footprints className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Impersonation Audit Trail</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Track admin activity during user impersonation sessions
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[140px] max-w-[200px]">
              <Input
                placeholder="Filter by admin..."
                value={adminSearch}
                onChange={(e) => { setAdminSearch(e.target.value); setPage(0); }}
                className="h-8 text-xs pl-3"
              />
            </div>
            <div className="relative flex-1 min-w-[140px] max-w-[200px]">
              <Input
                placeholder="Filter by user..."
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setPage(0); }}
                className="h-8 text-xs pl-3"
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <Filter className="h-3 w-3 mr-1 opacity-50" />
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="page_visit">Page Visits</SelectItem>
                <SelectItem value="session_start">Session Starts</SelectItem>
                <SelectItem value="session_end">Session Ends</SelectItem>
                <SelectItem value="session_switch">User Switches</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
            <div className="ml-auto text-xs text-muted-foreground self-center">
              {data?.total ?? 0} total entries
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Footprints className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No audit entries found</p>
              <p className="text-xs mt-1">Impersonation activity will appear here once admins start viewing user accounts.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs w-[140px]">Time</TableHead>
                    <TableHead className="text-xs w-[120px]">Admin</TableHead>
                    <TableHead className="text-xs w-[120px]">Viewed User</TableHead>
                    <TableHead className="text-xs w-[110px]">Action</TableHead>
                    <TableHead className="text-xs">Path / Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => {
                    const style = ACTION_STYLES[row.action] ?? ACTION_STYLES.page_visit;
                    const Icon = style.icon;
                    return (
                      <TableRow key={row.id} className="hover:bg-muted/20">
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {formatTime(row.createdAt)}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{row.adminName}</TableCell>
                        <TableCell className="text-xs">{row.impersonatedUserName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-[10px] gap-1 ${style.color}`}>
                            <Icon className="h-3 w-3" />
                            {style.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {formatPath(row.path)}
                          {row.details && typeof row.details === "string" && row.details !== "{}" && (
                            <span className="ml-2 text-[10px] opacity-60">{row.details}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
