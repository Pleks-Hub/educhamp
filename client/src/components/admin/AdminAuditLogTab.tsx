import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function AdminAuditLogTab() {
  const { data: log, isLoading } = trpc.admin.getAuditLog.useQuery({ limit: 200 });
  const actionColors: Record<string, string> = {
    "user.role_change": "text-blue-600", "user.account_type_change": "text-violet-600",
    "user.course_enroll": "text-emerald-600", "course.update": "text-orange-600",
    "setting.update": "text-pink-600", "cms.publish": "text-green-600",
    "cms.draft": "text-amber-600", "rbac.createRole": "text-indigo-600",
    "rbac.assignRole": "text-cyan-600", "user.status_change": "text-red-600",
    "user.delete": "text-red-700",
  };
  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Audit Log</h2>
        <Badge variant="secondary">{(log ?? []).length} entries</Badge>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(log ?? []).length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No audit log entries yet.</TableCell></TableRow>
            ) : (log ?? []).map((entry: any) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <span className={`text-sm font-mono ${actionColors[entry.action] ?? "text-foreground"}`}>{entry.action}</span>
                </TableCell>
                <TableCell className="text-sm">{entry.targetType ?? "—"} {entry.targetId ? `#${entry.targetId}` : ""}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                  {entry.details ? JSON.stringify(entry.details) : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default AdminAuditLogTab;
