import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, ChevronLeft, ChevronRight, Activity, Filter, X } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 25;

const ACTION_COLORS: Record<string, string> = {
  "user.role_change": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "user.account_type_change": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "user.course_enroll": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "user.status_change": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "user.delete": "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  "course.update": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "setting.update": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "cms.publish": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "cms.draft": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "rbac.createRole": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "rbac.assignRole": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  user: "User",
  course: "Course",
  setting: "Setting",
  content: "Content",
  role: "Role",
};

export function AdminAuditLogTab() {
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Simple debounce via setTimeout
    const timeout = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0);
    }, 300);
    return () => clearTimeout(timeout);
  };

  const { data, isLoading, refetch, isFetching } = trpc.admin.getAuditLogPaginated.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    action: actionFilter || undefined,
    targetType: targetTypeFilter || undefined,
    search: debouncedSearch || undefined,
  }, {
    refetchInterval: 30_000, // Auto-refresh every 30s
  });

  const { data: distinctActions } = trpc.admin.getAuditLogDistinctActions.useQuery();

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const hasFilters = actionFilter || targetTypeFilter || debouncedSearch;

  const clearFilters = () => {
    setActionFilter("");
    setTargetTypeFilter("");
    setSearchTerm("");
    setDebouncedSearch("");
    setPage(0);
  };

  const formatDetails = (details: Record<string, unknown> | null) => {
    if (!details) return "—";
    const entries = Object.entries(details);
    if (entries.length === 0) return "—";
    return entries
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
      .join(" · ");
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Activity Feed</h2>
          <Badge variant="secondary" className="ml-2">{total} entries</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { refetch(); toast.success("Refreshed"); }}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search actions..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {(distinctActions ?? []).map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={targetTypeFilter} onValueChange={(v) => { setTargetTypeFilter(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All targets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All targets</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="course">Course</SelectItem>
                <SelectItem value="setting">Setting</SelectItem>
                <SelectItem value="content">Content</SelectItem>
                <SelectItem value="role">Role</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Action</TableHead>
              <TableHead className="w-[120px]">Target</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-[100px] text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                  {hasFilters ? "No entries match your filters." : "No audit log entries yet."}
                </TableCell>
              </TableRow>
            ) : entries.map((entry: any) => (
              <TableRow key={entry.id} className="group hover:bg-muted/50 transition-colors">
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`font-mono text-xs ${ACTION_COLORS[entry.action] ?? "bg-muted text-foreground"}`}
                  >
                    {entry.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {entry.targetType ? (
                    <span className="text-muted-foreground">
                      {TARGET_TYPE_LABELS[entry.targetType] ?? entry.targetType}
                      {entry.targetId ? <span className="ml-1 font-mono text-xs">#{entry.targetId}</span> : ""}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                  {formatDetails(entry.details)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground text-right whitespace-nowrap" title={new Date(entry.createdAt).toLocaleString()}>
                  {formatTimeAgo(entry.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAuditLogTab;
