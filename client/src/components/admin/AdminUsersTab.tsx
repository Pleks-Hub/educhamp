import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { UserDetailDialog } from "@/components/UserDetailPanel";
import {
  Users, BookOpen, Shield, ShieldOff, Search, Plus, Trash2, Eye, History,
  MoreHorizontal, UserPlus, UserMinus, AlertTriangle, CheckCircle2, Baby,
} from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS, SuppressionBadge } from "./adminHelpers";

/** Calculate age in full years from a date-of-birth string. Returns null if DOB is missing or invalid. */
function calcAgeFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

// ─── User Course Management Dialog ───────────────────────────────────────────
function UserCourseManagementDialog({ userId, onClose, courses }: { userId: number; onClose: () => void; courses: any[] }) {
  const { data: enrollments, isLoading, refetch } = trpc.admin.getUserEnrollments.useQuery({ userId });
  const enrollUser = trpc.admin.enrollUserInCourse.useMutation({
    onSuccess: () => { toast.success("Course added"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const removeUser = trpc.admin.removeStudentFromCourse.useMutation({
    onSuccess: () => { toast.success("Course removed permanently"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const suspendMut = trpc.admin.suspendEnrollment.useMutation({
    onSuccess: () => { toast.success("Enrollment suspended"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const unsuspendMut = trpc.admin.unsuspendEnrollment.useMutation({
    onSuccess: () => { toast.success("Enrollment reactivated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const enrolledIds = new Set((enrollments ?? []).map((e: any) => e.enrollment.courseId));
  const availableCourses = courses.filter((c: any) => c.isActive && !enrolledIds.has(c.id));

  const activeEnrollments = (enrollments ?? []).filter((e: any) => e.enrollment.isActive);
  const suspendedEnrollments = (enrollments ?? []).filter((e: any) => !e.enrollment.isActive);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Manage Courses for User #{userId}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          {/* Active enrollments */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Active Courses ({activeEnrollments.length})</h4>
            {isLoading ? (
              <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-10" />)}</div>
            ) : activeEnrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No active courses.</p>
            ) : (
              <div className="space-y-2">
                {activeEnrollments.map((e: any) => (
                  <div key={e.enrollment.courseId} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{e.course.title}</p>
                        {e.enrollment.isCurrent && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {e.course.subject} · Grade {e.course.gradeLevel} · Enrolled {new Date(e.enrollment.enrolledAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:text-amber-800"
                        onClick={() => suspendMut.mutate({ userId, courseId: e.enrollment.courseId })}
                        disabled={suspendMut.isPending}
                        title="Suspend (student loses access but progress is preserved)"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700"
                        onClick={() => removeUser.mutate({ userId, courseId: e.enrollment.courseId })}
                        disabled={removeUser.isPending}
                        title="Remove permanently"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suspended enrollments */}
          {suspendedEnrollments.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-amber-600 uppercase tracking-wide">Suspended ({suspendedEnrollments.length})</h4>
              <div className="space-y-2">
                {suspendedEnrollments.map((e: any) => (
                  <div key={e.enrollment.courseId} className="flex items-center justify-between p-2.5 rounded-lg border border-amber-200 bg-amber-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-amber-900">{e.course.title}</p>
                      <p className="text-xs text-amber-700">
                        {e.course.subject} · Grade {e.course.gradeLevel} · Suspended
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-800"
                        onClick={() => unsuspendMut.mutate({ userId, courseId: e.enrollment.courseId })}
                        disabled={unsuspendMut.isPending}
                        title="Reactivate enrollment"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700"
                        onClick={() => removeUser.mutate({ userId, courseId: e.enrollment.courseId })}
                        disabled={removeUser.isPending}
                        title="Remove permanently"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new course */}
          {availableCourses.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Add Course</h4>
              <div className="space-y-2">
                {availableCourses.map((c: any) => (
                  <button
                    key={c.id}
                    className="w-full text-left p-2.5 rounded-lg border hover:bg-muted/50 transition-colors flex items-center justify-between"
                    onClick={() => enrollUser.mutate({ userId, courseId: c.id })}
                    disabled={enrollUser.isPending}
                  >
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.subject} · Grade {c.gradeLevel}</p>
                    </div>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
export function AdminUsersTab() {
  const PAGE_SIZE = 50;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState<"all" | "coppa" | "underage-guardian">("all");
  const [page, setPage] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState<number | null>(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", accountType: "student" as const, role: "student" as const });

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: pageData, isLoading, refetch } = trpc.admin.listUsers.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    search: debouncedSearch || undefined,
  });
  const users = pageData?.rows ?? [];
  const totalUsers = pageData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  const { data: courses } = trpc.admin.listCourses.useQuery();
  const updateRole = trpc.admin.updateUserRole.useMutation({ onSuccess: () => { toast.success("Role updated"); refetch(); } });
  const updateAccountType = trpc.admin.updateUserAccountType.useMutation({ onSuccess: () => { toast.success("Account type updated"); refetch(); } });
  const updateStatus = trpc.admin.updateUserStatus.useMutation({ onSuccess: () => { toast.success("User status updated"); refetch(); } });
  const deleteUser = trpc.admin.deleteUser.useMutation({ onSuccess: () => { toast.success("User deleted"); refetch(); } });
  const createUser = trpc.admin.createUser.useMutation({
    onSuccess: () => { toast.success("User created"); setShowCreateDialog(false); setNewUser({ name: "", email: "", accountType: "student", role: "student" }); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const enrollUser = trpc.admin.enrollUserInCourse.useMutation({
    onSuccess: () => { toast.success("Enrolled in course"); setShowEnrollDialog(null); },
    onError: (e) => toast.error(e.message),
  });
  const impersonateUser = trpc.admin.impersonateUser.useMutation({
    onSuccess: ({ token, expiresAt }) => {
      sessionStorage.setItem("educhamp-impersonation-token", token);
      sessionStorage.setItem("educhamp-impersonation-expires", String(expiresAt));
      toast.success("Impersonation session started — navigating to app");
      setTimeout(() => { window.location.href = "/"; }, 800);
    },
    onError: (e) => toast.error(e.message),
  });
  const [showUserDetailDialog, setShowUserDetailDialog] = useState<{ id: number; role: string } | null>(null);

  // Bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<"status" | "assign-course" | "remove-course" | "suspend-course" | "password-reset" | null>(null);
  const [bulkStatusTarget, setBulkStatusTarget] = useState<"active" | "suspended" | "deactivated" | "deleted">("suspended");
  const [bulkCourseId, setBulkCourseId] = useState<number | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const bulkUpdateStatus = trpc.admin.bulkUpdateUserStatus.useMutation({
    onSuccess: (r) => { toast.success(`Bulk update: ${r.successCount} succeeded, ${r.failCount} failed.`); setSelectedUserIds(new Set()); setBulkAction(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const bulkAssignCourse = trpc.admin.bulkAssignCourse.useMutation({
    onSuccess: (r) => { toast.success(`Bulk assign: ${r.successCount} enrolled, ${r.failCount} failed.`); setSelectedUserIds(new Set()); setBulkAction(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const bulkRemoveCourse = trpc.admin.bulkRemoveCourse.useMutation({
    onSuccess: (r) => { toast.success(`Bulk remove: ${r.successCount} removed, ${r.failCount} failed.`); setSelectedUserIds(new Set()); setBulkAction(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const bulkSuspendCourse = trpc.admin.bulkSuspendCourses.useMutation({
    onSuccess: (r) => { toast.success(`Bulk suspend: ${r.suspended} suspended, ${r.skipped} skipped.`); setSelectedUserIds(new Set()); setBulkAction(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const forcePasswordReset = trpc.admin.forcePasswordReset.useMutation({
    onSuccess: (r) => { toast.success(`Password reset email sent to ${r.email}`); },
    onError: (e) => toast.error(e.message),
  });
  const bulkForcePasswordReset = trpc.admin.bulkForcePasswordReset.useMutation({
    onSuccess: (r) => { toast.success(`Reset emails sent: ${r.sent}, skipped: ${r.skipped}`); setSelectedUserIds(new Set()); setBulkAction(null); },
    onError: (e) => toast.error(e.message),
  });

  function toggleSelectUser(id: number) {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (selectedUserIds.size === filtered.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filtered.map((u: any) => u.id)));
    }
  }
  function executeBulkAction() {
    const ids = Array.from(selectedUserIds);
    if (bulkAction === "status") {
      bulkUpdateStatus.mutate({ userIds: ids, status: bulkStatusTarget });
    } else if (bulkAction === "assign-course" && bulkCourseId) {
      bulkAssignCourse.mutate({ userIds: ids, courseId: bulkCourseId });
    } else if (bulkAction === "remove-course" && bulkCourseId) {
      bulkRemoveCourse.mutate({ userIds: ids, courseId: bulkCourseId });
    } else if (bulkAction === "suspend-course" && bulkCourseId) {
      bulkSuspendCourse.mutate({ userIds: ids, courseIds: [bulkCourseId] });
    } else if (bulkAction === "password-reset") {
      bulkForcePasswordReset.mutate({ userIds: ids, origin: window.location.origin });
    }
    setShowBulkConfirm(false);
  }

  const filtered = useMemo(() => {
    return users.filter((u: any) => {
      const matchStatus = statusFilter === "all" || (u.status ?? "active") === statusFilter;
      const matchType = typeFilter === "all" || u.accountType === typeFilter;
      if (!matchStatus || !matchType) return false;
      if (ageFilter === "coppa") {
        const age = calcAgeFromDob(u.dateOfBirth);
        return age !== null && age < 13;
      }
      if (ageFilter === "underage-guardian") {
        if (u.accountType !== "parent") return false;
        const age = calcAgeFromDob(u.dateOfBirth);
        if (age === null) return false;
        // State-specific minimums: MS=21, AL/NE=19, default=18
        const state = (u.state ?? "").toUpperCase();
        const minAge = state === "MS" ? 21 : (state === "AL" || state === "NE") ? 19 : 18;
        return age < minAge;
      }
      return true;
    });
  }, [users, statusFilter, typeFilter, ageFilter]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-32 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-32 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="student">Students</SelectItem>
            <SelectItem value="parent">Parents</SelectItem>
            <SelectItem value="teacher">Teachers</SelectItem>
          </SelectContent>
        </Select>
        {/* Age filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setAgeFilter("all")}
            className={`h-7 px-2.5 rounded-full text-xs font-medium border transition-colors ${
              ageFilter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/50"
            }`}
          >All Ages</button>
          <button
            onClick={() => setAgeFilter("coppa")}
            className={`h-7 px-2.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
              ageFilter === "coppa"
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-background text-amber-600 border-amber-300 hover:border-amber-500"
            }`}
          ><Baby className="h-3 w-3" /> Under 13 (COPPA)</button>
          <button
            onClick={() => setAgeFilter("underage-guardian")}
            className={`h-7 px-2.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
              ageFilter === "underage-guardian"
                ? "bg-red-500 text-white border-red-500"
                : "bg-background text-red-600 border-red-300 hover:border-red-500"
            }`}
          ><AlertTriangle className="h-3 w-3" /> Underage Guardians</button>
        </div>
        <Badge variant="secondary">{totalUsers} total · showing {filtered.length}</Badge>
        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="ml-auto gap-1">
          <Plus className="h-4 w-4" /> Create User
        </Button>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedUserIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium text-primary">{selectedUserIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <div className="flex items-center gap-1.5">
              <Select value={bulkStatusTarget} onValueChange={(v: any) => setBulkStatusTarget(v)}>
                <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Set Active</SelectItem>
                  <SelectItem value="suspended">Set Suspended</SelectItem>
                  <SelectItem value="deactivated">Set Deactivated</SelectItem>
                  <SelectItem value="deleted">Set Deleted</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="h-7 text-xs" variant="outline"
                onClick={() => { setBulkAction("status"); setShowBulkConfirm(true); }}>
                Apply Status
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <Select value={bulkCourseId?.toString() ?? ""} onValueChange={(v) => setBulkCourseId(Number(v))}>
                <SelectTrigger className="h-7 w-40 text-xs"><SelectValue placeholder="Select course…" /></SelectTrigger>
                <SelectContent>
                  {(courses ?? []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-7 text-xs" variant="outline" disabled={!bulkCourseId}
                onClick={() => { setBulkAction("assign-course"); setShowBulkConfirm(true); }}>
                Assign
              </Button>
              <Button size="sm" className="h-7 text-xs" variant="outline" disabled={!bulkCourseId}
                onClick={() => { setBulkAction("remove-course"); setShowBulkConfirm(true); }}>
                Remove
              </Button>
              <Button size="sm" className="h-7 text-xs" variant="outline" disabled={!bulkCourseId}
                onClick={() => { setBulkAction("suspend-course"); setShowBulkConfirm(true); }}>
                Suspend
              </Button>
            </div>
            <Button size="sm" className="h-7 text-xs" variant="outline"
              onClick={() => { setBulkAction("password-reset"); setShowBulkConfirm(true); }}>
              Reset Passwords
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
              onClick={() => setSelectedUserIds(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selectedUserIds.size === filtered.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Name / Email</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="whitespace-nowrap">DOB / Age</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No users found.</TableCell></TableRow>
              ) : filtered.map((user: any) => {
                const age = calcAgeFromDob(user.dateOfBirth);
                const isCoppaAge = age !== null && age < 13;
                return (
                <TableRow key={user.id} data-selected={selectedUserIds.has(user.id)} className="data-[selected=true]:bg-primary/5">
                  <TableCell className="w-10">
                    <Checkbox
                      checked={selectedUserIds.has(user.id)}
                      onCheckedChange={() => toggleSelectUser(user.id)}
                      aria-label={`Select ${user.name ?? user.email}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{user.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{user.email ?? user.openId}</p>
                      {user.email && <SuppressionBadge email={user.email} onUnsuppress={refetch} />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select value={user.accountType} onValueChange={(v) => {
                      updateAccountType.mutate({ userId: user.id, accountType: v as any });
                    }}>
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "admin" ? "default" : "outline"}
                      className={`text-xs cursor-pointer select-none ${user.role === "admin" ? "bg-violet-600 hover:bg-violet-700" : "hover:bg-muted"}`}
                      onClick={() => {
                        if (user.role === "admin") {
                          updateRole.mutate({ userId: user.id, role: user.accountType as any });
                        } else {
                          updateRole.mutate({ userId: user.id, role: "admin" });
                        }
                      }}
                    >
                      {user.role === "admin" ? "✓ Admin" : "Grant Admin"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${STATUS_COLORS[user.status ?? "active"] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[user.status ?? "active"] ?? user.status}
                    </Badge>
                  </TableCell>
                  {/* DOB / Age column */}
                  <TableCell className="text-xs whitespace-nowrap">
                    {user.dateOfBirth ? (
                      <div className="flex items-center gap-1">
                        {isCoppaAge && <span title="Under 13 — COPPA applies"><Baby className="h-3 w-3 text-amber-500 shrink-0" /></span>}
                        <span className={isCoppaAge ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                          {new Date(user.dateOfBirth).toLocaleDateString()} · {age}y
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : <span className="text-muted-foreground/40">Never</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[110px] truncate" title={user.deviceInfo ?? ""}>
                    {user.deviceInfo ? user.deviceInfo.split(" ")[0] : <span className="text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => setShowUserDetailDialog({ id: user.id, role: user.role })}>
                          <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => {
                          if (user.role === "admin") {
                            updateRole.mutate({ userId: user.id, role: user.accountType as any });
                          } else {
                            updateRole.mutate({ userId: user.id, role: "admin" });
                          }
                        }}>
                          <Shield className="h-3.5 w-3.5 mr-2" />
                          {user.role === "admin" ? "Remove Admin" : "Grant Admin"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const next = user.accountType === "student" ? "parent" : user.accountType === "parent" ? "teacher" : "student";
                          updateAccountType.mutate({ userId: user.id, accountType: next as any });
                        }}>
                          <Users className="h-3.5 w-3.5 mr-2" />
                          Switch to {user.accountType === "student" ? "Parent" : user.accountType === "parent" ? "Teacher" : "Student"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {(user.status ?? "active") !== "active" && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ userId: user.id, status: "active" })}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-600" /> Activate
                          </DropdownMenuItem>
                        )}
                        {(user.status ?? "active") !== "suspended" && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ userId: user.id, status: "suspended" })}>
                            <AlertTriangle className="h-3.5 w-3.5 mr-2 text-amber-600" /> Suspend
                          </DropdownMenuItem>
                        )}
                        {(user.status ?? "active") !== "deactivated" && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ userId: user.id, status: "deactivated" })}>
                            <ShieldOff className="h-3.5 w-3.5 mr-2 text-orange-600" /> Deactivate
                          </DropdownMenuItem>
                        )}
                        {(user.status ?? "active") !== "archived" && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ userId: user.id, status: "archived" })}>
                            <History className="h-3.5 w-3.5 mr-2 text-gray-500" /> Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowEnrollDialog(user.id)}>
                          <BookOpen className="h-3.5 w-3.5 mr-2" /> Manage Courses
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            if (confirm(`Log in as ${user.name ?? user.email}? You will be redirected to the app as this user. A 15-minute session will be created.`)) {
                              impersonateUser.mutate({ userId: user.id });
                            }
                          }}
                          className="text-amber-600 focus:text-amber-600"
                        >
                          <Eye className="h-3.5 w-3.5 mr-2" /> Log in as User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            if (confirm(`Send password reset email to ${user.name ?? user.email}?`)) {
                              forcePasswordReset.mutate({ userId: user.id, origin: window.location.origin });
                            }
                          }}
                        >
                          <History className="h-3.5 w-3.5 mr-2 text-blue-600" /> Force Password Reset
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => { if (confirm(`Delete user ${user.name ?? user.email}? This cannot be undone.`)) deleteUser.mutate({ userId: user.id }); }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );})
            }
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages} &mdash; {totalUsers} users total
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0 || isLoading} onClick={() => setPage(p => Math.max(0, p - 1))}>
              ← Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1 || isLoading} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}>
              Next →
            </Button>
          </div>
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Full Name</Label>
              <Input value={newUser.name} onChange={(e) => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="Jane Smith" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={newUser.email} onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="jane@school.edu" className="mt-1" type="email" />
            </div>
            <div>
              <Label className="text-xs">Account Type</Label>
              <Select value={newUser.accountType} onValueChange={(v: any) => setNewUser(p => ({ ...p, accountType: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={() => createUser.mutate(newUser)} disabled={createUser.isPending || !newUser.name || !newUser.email}>
              {createUser.isPending ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll Dialog */}
      {showEnrollDialog !== null && (
        <UserCourseManagementDialog
          userId={showEnrollDialog}
          onClose={() => setShowEnrollDialog(null)}
          courses={courses ?? []}
        />
      )}

      {/* User Detail Dialog */}
      {showUserDetailDialog !== null && (
        <UserDetailDialog
          userId={showUserDetailDialog.id}
          initialRole={showUserDetailDialog.role}
          onClose={() => setShowUserDetailDialog(null)}
        />
      )}

      {/* Bulk Confirm Dialog */}
      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "status" && (
                <>This will set <strong>{selectedUserIds.size}</strong> users to <strong>{bulkStatusTarget}</strong>. This cannot be undone.</>
              )}
              {bulkAction === "assign-course" && (
                <>This will enroll <strong>{selectedUserIds.size}</strong> users in the selected course.</>
              )}
              {bulkAction === "remove-course" && (
                <>This will remove <strong>{selectedUserIds.size}</strong> users from the selected course. This cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkAction}
              className={bulkAction === "remove-course" || (bulkAction === "status" && bulkStatusTarget === "deleted") ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {bulkUpdateStatus.isPending || bulkAssignCourse.isPending || bulkRemoveCourse.isPending ? "Processing…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AdminUsersTab;
