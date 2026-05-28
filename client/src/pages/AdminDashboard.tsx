import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { DemoRequestsTab } from "@/components/DemoRequestsTab";
import { CouponManagerTab } from "@/components/admin/CouponManagerTab";
import { SubscriptionCRMTab } from "@/components/admin/SubscriptionCRMTab";
import { PaymentAnalyticsTab } from "@/components/admin/PaymentAnalyticsTab";
import {
  Users, BookOpen, BarChart3, Settings, Shield, ClipboardList,
  GraduationCap, Brain, Activity, RefreshCw, ChevronRight, Clock,
  Mail, MessageCircle, Plus, Trash2, Edit2, Eye, CheckCircle2,
  AlertTriangle, FileText, Image, Globe, History, Lock, Unlock,
  UserPlus, UserMinus, Copy, MoreHorizontal, Search,
  Inbox, Send, XCircle, Filter, Building2, Phone, Calendar, Sparkles,
  ChevronLeft, ChevronDown, ChevronUp, Star, Tag, CreditCard,
  MailX, ShieldOff, ShieldCheck, RotateCcw, Download,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADE_LEVELS = [
  "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
  "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
];

const GRADE_PROMOTIONS: Record<string, string> = {
  "Kindergarten": "Grade 1", "Grade 1": "Grade 2", "Grade 2": "Grade 3",
  "Grade 3": "Grade 4", "Grade 4": "Grade 5", "Grade 5": "Grade 6",
  "Grade 6": "Grade 7", "Grade 7": "Grade 8", "Grade 8": "Grade 9",
  "Grade 9": "Grade 10", "Grade 10": "Grade 11", "Grade 11": "Grade 12",
};

const ALL_RESOURCES = ["users", "courses", "cms", "rbac", "reports", "diagnostics", "settings", "enrollments"];
const ALL_ACTIONS = ["view", "create", "edit", "delete", "approve", "export"];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  suspended: "bg-amber-100 text-amber-800",
  archived: "bg-gray-100 text-gray-600",
  deleted: "bg-red-100 text-red-800",
};

// ─── Suppression Badge (used in UsersTab rows) ───────────────────────────────

function SuppressionBadge({ email, onUnsuppress }: { email: string; onUnsuppress?: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: suppression, refetch } = trpc.admin.getSuppressionStatus.useQuery(
    { email },
    { enabled: !!email, staleTime: 60_000 }
  );
  const unsuppress = trpc.admin.unsuppressEmail.useMutation({
    onSuccess: () => {
      toast.success(`${email} unsuppressed — emails will resume`);
      setOpen(false);
      refetch();
      onUnsuppress?.();
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to unsuppress email");
      setOpen(false);
    },
  });

  if (!suppression) return null;

  const suppressedDate = new Date(suppression.suppressedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <div className="flex items-center gap-1 mt-0.5">
        <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0 h-4 gap-0.5 cursor-default" title={`Suppressed: ${suppression.reason} on ${suppressedDate}`}>
          <MailX className="h-2.5 w-2.5" />
          {suppression.reason}
        </Badge>
        <button
          className="h-4 w-4 rounded hover:bg-emerald-100 flex items-center justify-center transition-colors"
          title="Unsuppress email"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          disabled={unsuppress.isPending}
        >
          <RotateCcw className="h-2.5 w-2.5 text-emerald-600" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Unsuppress Email Address?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-muted px-4 py-3 text-sm space-y-1">
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium font-mono">{email}</span></div>
              <div><span className="text-muted-foreground">Reason:</span> <span className="font-medium capitalize">{suppression.reason}</span></div>
              <div><span className="text-muted-foreground">Suppressed on:</span> <span className="font-medium">{suppressedDate}</span></div>
            </div>
            <p className="text-sm text-muted-foreground">
              This will re-enable transactional email delivery to this address. Only unsuppress if you are confident the issue has been resolved.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={unsuppress.isPending}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => unsuppress.mutate({ suppressionId: suppression.id })}
              disabled={unsuppress.isPending}
            >
              {unsuppress.isPending ? "Unsuppressing…" : "Confirm Unsuppress"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: stats, isLoading, refetch } = trpc.admin.getStats.useQuery();

  if (isLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </div>
  );

  if (!stats) return <p className="text-muted-foreground">Failed to load stats.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Platform Overview</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="bg-blue-500" />
        <StatCard icon={GraduationCap} label="Students" value={stats.totalStudents} color="bg-emerald-500" />
        <StatCard icon={Users} label="Parents" value={stats.totalParents} color="bg-violet-500" />
        <StatCard icon={Brain} label="Tutor Sessions" value={stats.totalSessions} color="bg-orange-500" />
        <StatCard icon={ClipboardList} label="Diagnostics Taken" value={stats.totalDiagnostics} color="bg-pink-500" />
        <StatCard icon={BarChart3} label="Quiz Attempts" value={stats.totalQuizAttempts} color="bg-cyan-500" />
      </div>
      <div>
        <h3 className="text-base font-semibold mb-3">Active Courses ({stats.courses.filter((c: any) => c.isActive).length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.courses.map((course: any) => (
            <Card key={course.id} className={`border ${course.isActive ? "border-border" : "border-dashed opacity-60"}`}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{course.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{course.subject} · Grade {course.gradeLevel}</p>
                  </div>
                  <Badge variant={course.isActive ? "default" : "secondary"}>
                    {course.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {course.isDefault && <Badge variant="outline" className="mt-2 text-xs">Default</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const PAGE_SIZE = 50;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState<number | null>(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", accountType: "student" as const, role: "user" as const });

  // Reset to page 0 when search changes
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
    onSuccess: () => { toast.success("User created"); setShowCreateDialog(false); setNewUser({ name: "", email: "", accountType: "student", role: "user" }); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const enrollUser = trpc.admin.enrollUserInCourse.useMutation({
    onSuccess: () => { toast.success("Enrolled in course"); setShowEnrollDialog(null); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return users.filter((u: any) => {
      const matchStatus = statusFilter === "all" || (u.status ?? "active") === statusFilter;
      const matchType = typeFilter === "all" || u.accountType === typeFilter;
      return matchStatus && matchType;
    });
  }, [users, statusFilter, typeFilter]);

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
        <Badge variant="secondary">{totalUsers} total · showing {filtered.length}</Badge>
        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="ml-auto gap-1">
          <Plus className="h-4 w-4" /> Create User
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found.</TableCell></TableRow>
              ) : filtered.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{user.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{user.email ?? user.openId}</p>
                      {user.email && <SuppressionBadge email={user.email} onUnsuppress={refetch} />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select value={user.accountType} onValueChange={(v) => updateAccountType.mutate({ userId: user.id, accountType: v as any })}>
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={user.role} onValueChange={(v) => updateRole.mutate({ userId: user.id, role: v as any })}>
                      <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={user.status ?? "active"} onValueChange={(v) => updateStatus.mutate({ userId: user.id, status: v as any })}>
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                        <SelectItem value="deleted">Deleted</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Enroll in course" onClick={() => setShowEnrollDialog(user.id)}>
                        <UserPlus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700"
                        title="Delete user"
                        onClick={() => { if (confirm(`Delete user ${user.name ?? user.email}? This cannot be undone.`)) deleteUser.mutate({ userId: user.id }); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages} &mdash; {totalUsers} users total
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              disabled={page === 0 || isLoading}
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              ← Previous
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={page >= totalPages - 1 || isLoading}
              onClick={() => setPage(p => p + 1)}
            >
              Next →
            </Button>
          </div>
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={newUser.name} onChange={(e) => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="Jane Smith" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={newUser.email} onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="jane@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Account Type</Label>
                <Select value={newUser.accountType} onValueChange={(v: any) => setNewUser(p => ({ ...p, accountType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Platform Role</Label>
                <Select value={newUser.role} onValueChange={(v: any) => setNewUser(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button disabled={createUser.isPending} onClick={() => createUser.mutate(newUser)}>
              {createUser.isPending ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll User Dialog */}
      <Dialog open={showEnrollDialog !== null} onOpenChange={() => setShowEnrollDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enroll User in Course</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Select a course to enroll this user in:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(courses ?? []).filter((c: any) => c.isActive).map((course: any) => (
                <button
                  key={course.id}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  onClick={() => { if (showEnrollDialog) enrollUser.mutate({ userId: showEnrollDialog, courseId: course.id }); }}
                >
                  <p className="font-medium text-sm">{course.title}</p>
                  <p className="text-xs text-muted-foreground">{course.subject} · Grade {course.gradeLevel}</p>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnrollDialog(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Courses Tab ──────────────────────────────────────────────────────────────

function CoursesTab() {
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const { data: courses, isLoading, refetch } = trpc.admin.listCourses.useQuery();
  const { data: units } = trpc.admin.getCourseUnits.useQuery({ courseId: selectedCourse! }, { enabled: !!selectedCourse });
  const updateCourse = trpc.admin.updateCourse.useMutation({ onSuccess: () => { toast.success("Course updated"); refetch(); } });

  const subjectColors: Record<string, string> = {
    math: "bg-blue-100 text-blue-800", english: "bg-purple-100 text-purple-800",
    science: "bg-green-100 text-green-800", "social studies": "bg-amber-100 text-amber-800",
    "world languages": "bg-pink-100 text-pink-800",
  };

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">All Courses ({(courses ?? []).length})</h3>
        {(courses ?? []).map((course: any) => (
          <button
            key={course.id}
            onClick={() => setSelectedCourse(course.id)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedCourse === course.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{course.title}</p>
                <p className="text-xs text-muted-foreground">Grade {course.gradeLevel} · {course.courseCode}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={`text-xs ${subjectColors[course.subject] ?? "bg-gray-100 text-gray-800"}`}>{course.subject}</Badge>
                <Badge variant={course.status === "active" || !course.status ? "outline" : "secondary"} className="text-xs">
                  {course.status ?? "active"}
                </Badge>
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="lg:col-span-2">
        {selectedCourse ? (
          <CourseDetail
            course={(courses ?? []).find((c: any) => c.id === selectedCourse)}
            units={units ?? []}
            onUpdate={(data) => updateCourse.mutate({ courseId: selectedCourse, ...data })}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm border rounded-lg p-12">
            <div className="text-center">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Select a course to view details and manage settings</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CourseDetail({ course, units, onUpdate }: { course: any; units: any[]; onUpdate: (d: any) => void }) {
  const [cooldownInput, setCooldownInput] = useState<string>("");

  if (!course) return null;

  const currentCooldown = course.diagnosticCooldownDays ?? 7;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{course.title}</CardTitle>
            <CardDescription className="mt-1">{course.description}</CardDescription>
          </div>
          <Badge variant="outline">{course.courseCode}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Subject:</span> <strong>{course.subject}</strong></div>
          <div><span className="text-muted-foreground">Grade Level:</span> <strong>{course.gradeLevel}</strong></div>
          <div><span className="text-muted-foreground">TEKS Code:</span> <strong>{course.teksCode ?? "—"}</strong></div>
          <div><span className="text-muted-foreground">Sort Order:</span> <strong>{course.sortOrder}</strong></div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Course Status</Label>
          <Select value={course.status ?? "active"} onValueChange={(v) => onUpdate({ status: v })}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch checked={course.isActive} onCheckedChange={(v) => onUpdate({ isActive: v })} />
            Visible to students
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch checked={course.isDefault} onCheckedChange={(v) => onUpdate({ isDefault: v })} />
            Default course
          </label>
        </div>

        {/* Diagnostic Cooldown */}
        <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Diagnostic Retake Cooldown</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Current: <strong>{currentCooldown} day{currentCooldown !== 1 ? "s" : ""}</strong> — students must wait this long before retaking the diagnostic for this course.
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={365}
              placeholder={String(currentCooldown)}
              value={cooldownInput}
              onChange={(e) => setCooldownInput(e.target.value)}
              className="h-8 w-24 text-sm"
            />
            <span className="text-sm text-muted-foreground">days</span>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              disabled={!cooldownInput || isNaN(Number(cooldownInput))}
              onClick={() => {
                const days = parseInt(cooldownInput);
                if (!isNaN(days) && days >= 0 && days <= 365) {
                  onUpdate({ diagnosticCooldownDays: days });
                  setCooldownInput("");
                  toast.success(`Cooldown updated to ${days} day${days !== 1 ? "s" : ""}`);
                }
              }}
            >
              Update
            </Button>
          </div>
        </div>

        {/* Units */}
        <div>
          <h4 className="font-medium text-sm mb-2">Units ({units.length})</h4>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {units.length === 0 ? (
              <p className="text-xs text-muted-foreground">No units found.</p>
            ) : units.map((unit: any) => (
              <div key={unit.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/40 text-sm">
                <span className="font-mono text-xs text-muted-foreground w-8">U{unit.unitNumber}</span>
                <span className="flex-1">{unit.title}</span>
                {unit.teksAlignment && <Badge variant="outline" className="text-xs">{unit.teksAlignment.split("(")[0].trim()}</Badge>}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── CMS Tab ──────────────────────────────────────────────────────────────────

const CMS_SECTIONS = [
  { key: "homepage.hero.title", section: "homepage", label: "Hero Title", contentType: "text" as const, defaultValue: "Master Algebra I with AI-Powered Learning" },
  { key: "homepage.hero.subtitle", section: "homepage", label: "Hero Subtitle", contentType: "text" as const, defaultValue: "Personalised, adaptive lessons that meet every student where they are." },
  { key: "homepage.cta.primary", section: "homepage", label: "Primary CTA Button", contentType: "text" as const, defaultValue: "Start Free Today" },
  { key: "homepage.features.title", section: "homepage", label: "Features Section Title", contentType: "text" as const, defaultValue: "Everything a student needs to succeed" },
  { key: "homepage.announcement", section: "homepage", label: "Announcement Banner", contentType: "richtext" as const, defaultValue: "" },
  { key: "homepage.faq.1.q", section: "faq", label: "FAQ 1 — Question", contentType: "text" as const, defaultValue: "What is EduChamp?" },
  { key: "homepage.faq.1.a", section: "faq", label: "FAQ 1 — Answer", contentType: "richtext" as const, defaultValue: "EduChamp is an AI-powered adaptive learning platform for Grades 3–12, covering Math, ELA, Science, Social Studies, and more." },
  { key: "homepage.faq.2.q", section: "faq", label: "FAQ 2 — Question", contentType: "text" as const, defaultValue: "How does the AI Tutor work?" },
  { key: "homepage.faq.2.a", section: "faq", label: "FAQ 2 — Answer", contentType: "richtext" as const, defaultValue: "Our AI Tutor analyses your answers and provides step-by-step explanations." },
  { key: "onboarding.welcome.title", section: "onboarding", label: "Onboarding Welcome Title", contentType: "text" as const, defaultValue: "Welcome to EduChamp!" },
  { key: "onboarding.welcome.body", section: "onboarding", label: "Onboarding Welcome Body", contentType: "richtext" as const, defaultValue: "Let's get you set up. First, tell us a bit about yourself." },
  { key: "footer.tagline", section: "footer", label: "Footer Tagline", contentType: "text" as const, defaultValue: "Empowering every student to reach their potential." },
  { key: "footer.contact", section: "footer", label: "Contact Email", contentType: "text" as const, defaultValue: "support@educhamp.app" },
];

function CmsTab() {
  const [activeSection, setActiveSection] = useState("homepage");
  const [editKey, setEditKey] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [showHistory, setShowHistory] = useState<string | null>(null);

  const { data: cmsData, refetch } = trpc.admin.cms.listContent.useQuery({ section: activeSection });
  const { data: history } = trpc.admin.cms.getHistory.useQuery({ key: showHistory! }, { enabled: !!showHistory });
  const saveDraft = trpc.admin.cms.saveDraft.useMutation({ onSuccess: () => { toast.success("Draft saved"); refetch(); setEditKey(null); } });
  const publish = trpc.admin.cms.publish.useMutation({ onSuccess: () => { toast.success("Content published live"); refetch(); } });
  const revert = trpc.admin.cms.revert.useMutation({ onSuccess: () => { toast.success("Reverted to previous version"); refetch(); setShowHistory(null); } });

  const sections = Array.from(new Set(CMS_SECTIONS.map(s => s.section)));
  const sectionItems = CMS_SECTIONS.filter(s => s.section === activeSection);

  function getContentValue(key: string, defaultValue: string) {
    const found = (cmsData ?? []).find((c: any) => c.key === key);
    return found?.publishedValue ?? defaultValue;
  }

  function getDraftValue(key: string, defaultValue: string) {
    const found = (cmsData ?? []).find((c: any) => c.key === key);
    return found?.draftValue ?? found?.publishedValue ?? defaultValue;
  }

  function hasDraft(key: string) {
    const found = (cmsData ?? []).find((c: any) => c.key === key);
    return Boolean(found?.isDraft);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Content Management System</h2>
          <p className="text-sm text-muted-foreground">Edit website content. Save as draft to preview, then publish to go live.</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 flex-wrap">
        {sections.map(sec => (
          <button
            key={sec}
            onClick={() => setActiveSection(sec)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${activeSection === sec ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50"}`}
          >
            {sec.charAt(0).toUpperCase() + sec.slice(1)}
          </button>
        ))}
      </div>

      {/* Content items */}
      <div className="space-y-3">
        {sectionItems.map(item => {
          const published = getContentValue(item.key, item.defaultValue);
          const draft = getDraftValue(item.key, item.defaultValue);
          const isDraft = hasDraft(item.key);
          const isEditing = editKey === item.key;

          return (
            <Card key={item.key} className={`border ${isDraft ? "border-amber-300 bg-amber-50/30" : "border-border"}`}>
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.key}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isDraft && <Badge className="bg-amber-100 text-amber-800 text-xs">Draft pending</Badge>}
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="View history" onClick={() => setShowHistory(item.key)}>
                      <History className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => { setEditKey(item.key); setDraftValue(draft); }}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    {isDraft && (
                      <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => publish.mutate({ key: item.key })}>
                        <CheckCircle2 className="h-3 w-3" /> Publish
                      </Button>
                    )}
                  </div>
                </div>

                {/* Current published value preview */}
                {!isEditing && (
                  <div className="text-sm text-foreground bg-muted/30 rounded-md px-3 py-2 min-h-[36px]">
                    {published || <span className="text-muted-foreground italic">No content set</span>}
                  </div>
                )}

                {/* Edit mode */}
                {isEditing && (
                  <div className="space-y-2">
                    {item.contentType === "richtext" ? (
                      <Textarea
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value)}
                        rows={4}
                        className="text-sm"
                        placeholder={item.defaultValue}
                      />
                    ) : (
                      <Input
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value)}
                        className="text-sm"
                        placeholder={item.defaultValue}
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          saveDraft.mutate({ key: item.key, section: item.section, label: item.label, draftValue, contentType: item.contentType });
                        }}
                        disabled={saveDraft.isPending}
                      >
                        Save Draft
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                          saveDraft.mutate(
                            { key: item.key, section: item.section, label: item.label, draftValue, contentType: item.contentType },
                            { onSuccess: () => { publish.mutate({ key: item.key }); } }
                          );
                        }}
                        disabled={saveDraft.isPending || publish.isPending}
                      >
                        Save & Publish
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditKey(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* History Dialog */}
      <Dialog open={!!showHistory} onOpenChange={() => setShowHistory(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Content History — {showHistory}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto py-2">
            {(history ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No history yet.</p>
            ) : (history ?? []).map((h: any) => (
              <div key={h.id} className="p-3 rounded-lg border text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs">Version {h.version}</span>
                  <span className="text-xs text-muted-foreground">{new Date(h.changedAt).toLocaleString()}</span>
                </div>
                <p className="text-foreground bg-muted/30 rounded px-2 py-1 text-xs">{h.value}</p>
                {h.changeNote && <p className="text-xs text-muted-foreground italic">{h.changeNote}</p>}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs mt-1"
                  onClick={() => { if (showHistory) revert.mutate({ key: showHistory, version: h.version }); }}
                >
                  Revert to this version
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistory(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── RBAC Tab ─────────────────────────────────────────────────────────────────

function RbacTab() {
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState<number | null>(null);
  const [newRole, setNewRole] = useState({ name: "", description: "", permissions: [] as Array<{ resource: string; action: string }> });
  const [editRole, setEditRole] = useState<any>(null);
  const [assignUserId, setAssignUserId] = useState<string>("");

  const { data: roles, isLoading, refetch } = trpc.admin.rbac.listRoles.useQuery();
  const { data: usersPage } = trpc.admin.listUsers.useQuery({ limit: 200, offset: 0 });
  const users = usersPage?.rows ?? [];
  const createRole = trpc.admin.rbac.createRole.useMutation({
    onSuccess: () => { toast.success("Role created"); setShowCreateDialog(false); setNewRole({ name: "", description: "", permissions: [] }); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateRole = trpc.admin.rbac.updateRole.useMutation({
    onSuccess: () => { toast.success("Role updated"); setEditRole(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteRole = trpc.admin.rbac.deleteRole.useMutation({
    onSuccess: () => { toast.success("Role deleted"); setSelectedRole(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const assignRole = trpc.admin.rbac.assignRole.useMutation({
    onSuccess: () => { toast.success("Role assigned"); setShowAssignDialog(null); setAssignUserId(""); },
    onError: (e) => toast.error(e.message),
  });
  const seedRoles = trpc.admin.rbac.seedDefaultRoles.useMutation({
    onSuccess: () => { toast.success("Default roles seeded"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function togglePermission(
    perms: Array<{ resource: string; action: string }>,
    resource: string,
    action: string
  ): Array<{ resource: string; action: string }> {
    const exists = perms.some(p => p.resource === resource && p.action === action);
    if (exists) return perms.filter(p => !(p.resource === resource && p.action === action));
    return [...perms, { resource, action }];
  }

  function hasPermission(perms: Array<{ resource: string; action: string }>, resource: string, action: string) {
    return perms.some(p => p.resource === resource && p.action === action);
  }

  const selectedRoleData = (roles ?? []).find((r: any) => r.id === selectedRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Role-Based Access Control</h2>
          <p className="text-sm text-muted-foreground">Create and manage roles with granular permissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={seedRoles.isPending} onClick={() => seedRoles.mutate()}>
            {seedRoles.isPending ? "Seeding…" : "Seed Default Roles"}
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New Role
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Role list */}
          <div className="lg:col-span-1 space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Roles ({(roles ?? []).length})</h3>
            {(roles ?? []).length === 0 ? (
              <div className="text-center py-8 border rounded-lg text-muted-foreground text-sm">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No roles yet. Seed defaults or create one.</p>
              </div>
            ) : (roles ?? []).map((role: any) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedRole === role.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{role.name}</p>
                    <p className="text-xs text-muted-foreground">{role.description || "No description"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {role.isSystem && <Badge variant="outline" className="text-xs">System</Badge>}
                    <Badge variant={role.isActive ? "default" : "secondary"} className="text-xs">
                      {role.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Role detail */}
          <div className="lg:col-span-2">
            {selectedRoleData ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{selectedRoleData.name}</CardTitle>
                      <CardDescription>{selectedRoleData.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline" size="sm" className="gap-1 h-8"
                        onClick={() => setEditRole({ ...selectedRoleData, permissions: selectedRoleData.permissions ?? [] })}
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        variant="outline" size="sm" className="gap-1 h-8"
                        onClick={() => setShowAssignDialog(selectedRoleData.id)}
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Assign User
                      </Button>
                      {!selectedRoleData.isSystem && (
                        <Button
                          variant="outline" size="sm" className="gap-1 h-8 text-red-600 hover:text-red-700"
                          onClick={() => { if (confirm(`Delete role "${selectedRoleData.name}"?`)) deleteRole.mutate({ roleId: selectedRoleData.id }); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Permission matrix */}
                  <div>
                    <h4 className="font-medium text-sm mb-3">Permission Matrix</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr>
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Resource</th>
                            {ALL_ACTIONS.map(a => (
                              <th key={a} className="py-2 px-2 font-medium text-muted-foreground capitalize">{a}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ALL_RESOURCES.map(resource => (
                            <tr key={resource} className="border-t border-border/50">
                              <td className="py-2 pr-4 font-medium capitalize">{resource}</td>
                              {ALL_ACTIONS.map(action => {
                                const has = hasPermission(selectedRoleData.permissions ?? [], resource, action);
                                return (
                                  <td key={action} className="py-2 px-2 text-center">
                                    {has ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                                    ) : (
                                      <div className="h-4 w-4 rounded-full border border-border/60 mx-auto" />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm border rounded-lg p-12">
                <div className="text-center">
                  <Shield className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Select a role to view its permissions</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Role Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create New Role</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role Name</Label>
                <Input value={newRole.name} onChange={(e) => setNewRole(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Content Manager" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={newRole.description} onChange={(e) => setNewRole(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Permissions</Label>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left py-2 px-3 font-medium">Resource</th>
                      {ALL_ACTIONS.map(a => <th key={a} className="py-2 px-3 font-medium capitalize">{a}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_RESOURCES.map(resource => (
                      <tr key={resource} className="border-b last:border-0">
                        <td className="py-2 px-3 font-medium capitalize">{resource}</td>
                        {ALL_ACTIONS.map(action => (
                          <td key={action} className="py-2 px-3 text-center">
                            <Checkbox
                              checked={hasPermission(newRole.permissions, resource, action)}
                              onCheckedChange={() => setNewRole(p => ({ ...p, permissions: togglePermission(p.permissions, resource, action) }))}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button disabled={createRole.isPending || !newRole.name} onClick={() => createRole.mutate(newRole)}>
              {createRole.isPending ? "Creating…" : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editRole} onOpenChange={() => setEditRole(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Role — {editRole?.name}</DialogTitle></DialogHeader>
          {editRole && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Role Name</Label>
                  <Input value={editRole.name} onChange={(e) => setEditRole((p: any) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input value={editRole.description} onChange={(e) => setEditRole((p: any) => ({ ...p, description: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Permissions</Label>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-2 px-3 font-medium">Resource</th>
                        {ALL_ACTIONS.map(a => <th key={a} className="py-2 px-3 font-medium capitalize">{a}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {ALL_RESOURCES.map(resource => (
                        <tr key={resource} className="border-b last:border-0">
                          <td className="py-2 px-3 font-medium capitalize">{resource}</td>
                          {ALL_ACTIONS.map(action => (
                            <td key={action} className="py-2 px-3 text-center">
                              <Checkbox
                                checked={hasPermission(editRole.permissions, resource, action)}
                                onCheckedChange={() => setEditRole((p: any) => ({ ...p, permissions: togglePermission(p.permissions, resource, action) }))}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRole(null)}>Cancel</Button>
            <Button
              disabled={updateRole.isPending}
              onClick={() => editRole && updateRole.mutate({ roleId: editRole.id, name: editRole.name, description: editRole.description, permissions: editRole.permissions })}
            >
              {updateRole.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Role Dialog */}
      <Dialog open={showAssignDialog !== null} onOpenChange={() => setShowAssignDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Role to User</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Select a user to assign the role <strong>{selectedRoleData?.name}</strong> to:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(users ?? []).map((user: any) => (
                <button
                  key={user.id}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${assignUserId === String(user.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                  onClick={() => setAssignUserId(String(user.id))}
                >
                  <p className="font-medium text-sm">{user.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{user.email ?? user.openId} · {user.accountType}</p>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(null)}>Cancel</Button>
            <Button
              disabled={!assignUserId || assignRole.isPending}
              onClick={() => {
                if (showAssignDialog && assignUserId) {
                  assignRole.mutate({ userId: parseInt(assignUserId), roleId: showAssignDialog });
                }
              }}
            >
              {assignRole.isPending ? "Assigning…" : "Assign Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = [
  { key: "platform.name", value: "EduChamp", label: "Platform Name", category: "general" },
  { key: "platform.tagline", value: "Adaptive Learning for Every Student", label: "Tagline", category: "general" },
  { key: "enrollment.open", value: "true", label: "Open Enrollment", category: "enrollment" },
  { key: "enrollment.require_parent_invite", value: "true", label: "Require Parent Invite for Students", category: "enrollment" },
  { key: "ai.tutor_enabled", value: "true", label: "AI Tutor Enabled", category: "ai" },
  { key: "ai.diagnostic_randomize", value: "true", label: "Randomise Diagnostic Questions", category: "ai" },
  { key: "notifications.welcome_email", value: "true", label: "Send Welcome Notification on Sign-up", category: "notifications" },
  { key: "notifications.parent_digest", value: "false", label: "Weekly Parent Digest", category: "notifications" },
];

function SettingsTab() {
  const { data: settings, isLoading, refetch } = trpc.admin.getSettings.useQuery();
  const upsert = trpc.admin.upsertSetting.useMutation({ onSuccess: () => { toast.success("Setting saved"); refetch(); } });
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const getValue = (key: string) => {
    const saved = (settings ?? []).find((s: any) => s.key === key);
    return editValues[key] ?? saved?.value ?? DEFAULT_SETTINGS.find(d => d.key === key)?.value ?? "";
  };

  const isBool = (key: string) => ["true", "false"].includes(getValue(key));
  const categories = Array.from(new Set(DEFAULT_SETTINGS.map(s => s.category)));

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;

  return (
    <div className="space-y-8">
      {categories.map(cat => (
        <div key={cat}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 capitalize">{cat}</h3>
          <div className="space-y-3">
            {DEFAULT_SETTINGS.filter(s => s.category === cat).map(setting => (
              <div key={setting.key} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div>
                  <p className="text-sm font-medium">{setting.label}</p>
                  <p className="text-xs text-muted-foreground font-mono">{setting.key}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isBool(setting.key) ? (
                    <Switch
                      checked={getValue(setting.key) === "true"}
                      onCheckedChange={(v) => {
                        const val = v ? "true" : "false";
                        setEditValues(prev => ({ ...prev, [setting.key]: val }));
                        upsert.mutate({ key: setting.key, value: val, description: setting.label });
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={getValue(setting.key)}
                        onChange={(e) => setEditValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                        className="h-8 w-48 text-sm"
                      />
                      <Button size="sm" variant="outline" className="h-8"
                        onClick={() => upsert.mutate({ key: setting.key, value: getValue(setting.key), description: setting.label })}>
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

function AuditLogTab() {
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

// ─── Email Logs Tab ──────────────────────────────────────────────────────────

function EmailLogsTab() {
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "failed" | "skipped">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout((handleSearchChange as any)._t);
    (handleSearchChange as any)._t = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const { data: stats } = trpc.admin.getEmailLogStats.useQuery();
  const { data, isLoading, refetch } = trpc.admin.getEmailLogs.useQuery({
    limit: 100,
    offset: 0,
    status: statusFilter,
    search: debouncedSearch || undefined,
  });

  const statusBadge = (status: string) => {
    if (status === "sent") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><Send className="h-3 w-3 mr-1" />Sent</Badge>;
    if (status === "failed") return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" />Skipped</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Email Delivery Logs</h2>
          <p className="text-sm text-muted-foreground">Monitor all transactional emails sent by the platform</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Sent", value: stats?.total ?? 0, icon: Inbox, color: "text-blue-600" },
          { label: "Delivered", value: stats?.sent ?? 0, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Failed", value: stats?.failed ?? 0, icon: XCircle, color: "text-red-600" },
          { label: "Skipped", value: stats?.skipped ?? 0, icon: AlertTriangle, color: "text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Icon className={`h-8 w-8 ${color}`} />
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by recipient email…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-36">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary">{data?.total ?? 0} records</Badge>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Message ID</TableHead>
              <TableHead>Sent At</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8" /></TableCell></TableRow>
              ))
            ) : (data?.logs ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No email logs found.
                </TableCell>
              </TableRow>
            ) : (data?.logs ?? []).map((log: any) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm font-medium">{log.toEmail}</TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{log.subject}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{log.templateName}</Badge></TableCell>
                <TableCell>{statusBadge(log.status)}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {log.messageId ? (
                    <span className="truncate max-w-[120px] block" title={log.messageId}>{log.messageId.slice(0, 16)}…</span>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-xs text-red-600 max-w-[160px] truncate">
                  {log.errorMessage ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Grade Management Tab ──────────────────────────────────────────────────────

function SchedulePromotionButton() {
  const schedule = trpc.admin.scheduleGradePromotion.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Annual grade promotion scheduled! Next run: ${data.nextExecutionAt ? new Date(data.nextExecutionAt).toLocaleDateString() : "June 15"}`);
    },
    onError: (err) => toast.error(err.message),
  });
  return (
    <div className="flex items-center gap-3">
      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={schedule.isPending}
        onClick={() => schedule.mutate({ cron: "0 0 2 15 6 *" })}>
        {schedule.isPending ? "Scheduling…" : "Activate Annual Promotion (June 15)"}
      </Button>
      <span className="text-xs text-blue-700">Runs every June 15 at 2:00 AM UTC · Idempotent (safe to re-run)</span>
    </div>
  );
}

function GradeManagementTab() {
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [bulkFromGrade, setBulkFromGrade] = useState<string>("");
  const [confirmBulk, setConfirmBulk] = useState(false);

  const { data: usersPage, isLoading, refetch } = trpc.admin.listUsers.useQuery({ limit: 200, offset: 0 });
  const users = usersPage?.rows ?? [];
  const setGrade = trpc.admin.setStudentGrade.useMutation({ onSuccess: () => { toast.success("Grade updated"); refetch(); }, onError: (err) => toast.error(err.message) });
  const bulkPromote = trpc.admin.bulkPromoteGrade.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Promoted ${data.studentsAffected} students from ${bulkFromGrade} to ${GRADE_PROMOTIONS[bulkFromGrade] ?? "next grade"}`);
      setConfirmBulk(false); setBulkFromGrade(""); refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const students = (users ?? []).filter((u: any) => u.accountType === "student");
  const filtered = filterGrade === "all" ? students : students.filter((u: any) => u.grade === filterGrade);
  const gradeCounts = GRADE_LEVELS.reduce((acc, g) => { acc[g] = students.filter((u: any) => u.grade === g).length; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Grade Distribution</CardTitle>
          <CardDescription>Current student count per grade level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {GRADE_LEVELS.map((g) => (
              <button key={g} onClick={() => setFilterGrade(filterGrade === g ? "all" : g)}
                className={`rounded-lg p-2 text-center border transition-colors ${filterGrade === g ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 hover:bg-muted border-border"}`}>
                <div className="text-lg font-bold">{gradeCounts[g] ?? 0}</div>
                <div className="text-xs mt-0.5 leading-tight">{g.replace("Grade ", "Gr.")}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-amber-800"><Brain className="h-4 w-4" /> End-of-Year Grade Promotion</CardTitle>
          <CardDescription className="text-amber-700">Promote all students in a grade to the next grade level. This is irreversible — use at the end of the school year.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-amber-800">Promote all students from:</span>
              <Select value={bulkFromGrade} onValueChange={setBulkFromGrade}>
                <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.filter((g) => GRADE_PROMOTIONS[g]).map((g) => (
                    <SelectItem key={g} value={g}>{g} → {GRADE_PROMOTIONS[g]} ({gradeCounts[g] ?? 0} students)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {bulkFromGrade && !confirmBulk && (
              <Button variant="outline" size="sm" className="border-amber-400 text-amber-800 hover:bg-amber-100" onClick={() => setConfirmBulk(true)}>Preview Promotion</Button>
            )}
            {confirmBulk && bulkFromGrade && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-amber-800 font-medium">Promote {gradeCounts[bulkFromGrade] ?? 0} students from {bulkFromGrade} → {GRADE_PROMOTIONS[bulkFromGrade]}?</span>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={bulkPromote.isPending}
                  onClick={() => bulkPromote.mutate({ fromGrade: bulkFromGrade, toGrade: GRADE_PROMOTIONS[bulkFromGrade] })}>
                  {bulkPromote.isPending ? "Promoting…" : "Confirm Promote"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmBulk(false)}>Cancel</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-blue-800"><Clock className="h-4 w-4" /> Automated Annual Grade Promotion</CardTitle>
          <CardDescription className="text-blue-700">Schedule a recurring cron job that automatically promotes all students to the next grade on June 15 each year. <strong className="block mt-1">The site must be deployed before this can be activated.</strong></CardDescription>
        </CardHeader>
        <CardContent><SchedulePromotionButton /></CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm">{filterGrade === "all" ? `All Students (${students.length})` : `${filterGrade} (${filtered.length} students)`}</h3>
          {filterGrade !== "all" && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setFilterGrade("all")}>Clear filter</Button>}
        </div>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No students in this grade yet.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Current Grade</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Assign Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{user.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{user.email ?? user.openId}</p>
                      </div>
                    </TableCell>
                    <TableCell>{user.grade ? <Badge variant="outline" className="text-xs">{user.grade}</Badge> : <span className="text-xs text-muted-foreground">Not set</span>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{user.school ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={user.grade ?? ""} onValueChange={(v) => setGrade.mutate({ userId: user.id, gradeLevel: v })}>
                        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Set grade" /></SelectTrigger>
                        <SelectContent>{GRADE_LEVELS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Suppression Management Tab ─────────────────────────────────────────────

function SuppressionManagementTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState<"all" | "bounced" | "complained" | "manual">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [auditEmail, setAuditEmail] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [unsuppressTarget, setUnsuppressTarget] = useState<{ id: number; email: string; reason: string | null; suppressedAt: Date } | null>(null);

  const utils = trpc.useUtils();

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const result = await utils.admin.exportSuppressions.fetch({
        search: debouncedSearch || undefined,
        reason: reasonFilter,
        status: statusFilter,
      });
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `suppression-list-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.total} suppression records`);
    } catch (err: any) {
      toast.error(err?.message ?? "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => { setDebouncedSearch(val); setPage(0); }, 400);
  };

  const { data, isLoading, refetch } = trpc.admin.listSuppressions.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    search: debouncedSearch || undefined,
    reason: reasonFilter,
    status: statusFilter,
  });

  const { data: auditData } = trpc.admin.getSuppressionAuditLog.useQuery(
    { email: auditEmail!, limit: 20, offset: 0 },
    { enabled: !!auditEmail }
  );

  const unsuppress = trpc.admin.unsuppressEmail.useMutation({
    onSuccess: (d) => {
      toast.success(`${d.email} unsuppressed — emails will resume`);
      setUnsuppressTarget(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to unsuppress email");
      setUnsuppressTarget(null);
    },
  });

  const suppressManual = trpc.admin.suppressEmailManual.useMutation({
    onSuccess: () => { toast.success(`${manualEmail} manually suppressed`); setShowManualDialog(false); setManualEmail(""); setManualNotes(""); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const reasonBadge = (reason: string | null) => {
    if (reason === "bounced") return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs"><XCircle className="h-3 w-3 mr-1" />Bounced</Badge>;
    if (reason === "complained") return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Complained</Badge>;
    return <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs"><ShieldOff className="h-3 w-3 mr-1" />Manual</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Email Suppression Management</h2>
          <p className="text-sm text-muted-foreground">Manage suppressed addresses to protect sender reputation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isExporting} className="gap-2">
            <Download className="h-4 w-4" /> {isExporting ? "Exporting…" : "Export CSV"}
          </Button>
          <Button size="sm" onClick={() => setShowManualDialog(true)} className="gap-2">
            <ShieldOff className="h-4 w-4" /> Suppress Address
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by email…" value={search} onChange={(e) => handleSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={reasonFilter} onValueChange={(v) => { setReasonFilter(v as typeof reasonFilter); setPage(0); }}>
          <SelectTrigger className="w-36"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reasons</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
            <SelectItem value="complained">Complained</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(0); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Unsuppressed</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary">{data?.total ?? 0} records</Badge>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Resend Event ID</TableHead>
              <TableHead>Suppressed At</TableHead>
              <TableHead>Unsuppressed At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8" /></TableCell></TableRow>
              ))
            ) : (data?.suppressions ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No suppressed addresses found.
                </TableCell>
              </TableRow>
            ) : (data?.suppressions ?? []).map((s: any) => (
              <TableRow key={s.id} className={!s.isActive ? "opacity-50" : ""}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{s.email}</span>
                    <button className="text-xs text-muted-foreground underline hover:text-foreground" onClick={() => setAuditEmail(auditEmail === s.email ? null : s.email)}>history</button>
                  </div>
                  {auditEmail === s.email && auditData && (
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground border-l-2 border-muted pl-3">
                      {auditData.entries.map((e: any) => (
                        <div key={e.id} className="flex gap-2">
                          <span className={e.action === "unsuppressed" ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>{e.action}</span>
                          <span>by {e.adminName ?? "system"}</span>
                          <span>{new Date(e.createdAt).toLocaleString()}</span>
                          {e.notes && <span className="italic">— {e.notes}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>{reasonBadge(s.reason)}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{s.resendEventId ? s.resendEventId.slice(0, 16) + "…" : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(s.suppressedAt).toLocaleString()}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{s.unsuppressedAt ? new Date(s.unsuppressedAt).toLocaleString() : "—"}</TableCell>
                <TableCell>
                  {s.isActive && (
                    <Button
                      variant="ghost" size="sm" className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      disabled={unsuppress.isPending}
                      onClick={() => setUnsuppressTarget({ id: s.id, email: s.email, reason: s.reason, suppressedAt: new Date(s.suppressedAt) })}
                    >
                      <RotateCcw className="h-3 w-3" /> Unsuppress
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</Button>
          </div>
        </div>
      )}

      {/* Manual Suppress Dialog */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldOff className="h-5 w-5 text-red-500" /> Manually Suppress Email</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="Reason for manual suppression…" rows={3} />
            </div>
            <p className="text-xs text-muted-foreground">This will immediately block all transactional emails to this address. The action is logged in the audit trail.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualDialog(false)}>Cancel</Button>
            <Button variant="destructive" disabled={suppressManual.isPending || !manualEmail} onClick={() => suppressManual.mutate({ email: manualEmail, notes: manualNotes || undefined })}>
              {suppressManual.isPending ? "Suppressing…" : "Suppress Address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsuppress Confirmation Dialog */}
      <Dialog open={!!unsuppressTarget} onOpenChange={(o) => { if (!o) setUnsuppressTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-emerald-600" /> Confirm Unsuppress
            </DialogTitle>
          </DialogHeader>
          {unsuppressTarget && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg bg-muted px-4 py-3 text-sm space-y-1">
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium font-mono break-all">{unsuppressTarget.email}</span></div>
                <div><span className="text-muted-foreground">Reason:</span> <span className="font-medium capitalize">{unsuppressTarget.reason ?? "manual"}</span></div>
                <div><span className="text-muted-foreground">Suppressed on:</span> <span className="font-medium">{unsuppressTarget.suppressedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>
              </div>
              <p className="text-sm text-muted-foreground">
                This will re-enable transactional email delivery to this address. The action will be recorded in the audit trail.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnsuppressTarget(null)} disabled={unsuppress.isPending}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => unsuppressTarget && unsuppress.mutate({ suppressionId: unsuppressTarget.id })}
              disabled={unsuppress.isPending}
            >
              {unsuppress.isPending ? "Unsuppressing…" : "Confirm Unsuppress"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main AdminDashboard ─────────────────────────────────────────────

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) return (
    <div className="p-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
    </div>
  );

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="pt-8 pb-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
            <p className="text-sm text-muted-foreground mb-4">You do not have permission to view this page.</p>
            <Button onClick={() => navigate("/")} variant="outline">Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Admin Console</h1>
              <p className="text-xs text-muted-foreground">EduChamp Platform Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Activity className="h-3 w-3 mr-1 text-emerald-500" />
              System Online
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/newsletter")} className="gap-1">
              <Mail className="h-4 w-4" /> Newsletter
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/chat")} className="gap-1">
              <MessageCircle className="h-4 w-4" /> Chat Leads
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ChevronRight className="h-4 w-4 mr-1" /> Back to App
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="overview">
          <TabsList className="mb-6 flex-wrap gap-1 h-auto overflow-x-auto">
            <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" /> Overview</TabsTrigger>
            <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> Users</TabsTrigger>
            <TabsTrigger value="courses" className="gap-2"><BookOpen className="h-4 w-4" /> Courses</TabsTrigger>
            <TabsTrigger value="cms" className="gap-2"><FileText className="h-4 w-4" /> CMS</TabsTrigger>
            <TabsTrigger value="rbac" className="gap-2"><Lock className="h-4 w-4" /> RBAC</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" /> Settings</TabsTrigger>
            <TabsTrigger value="grades" className="gap-2"><GraduationCap className="h-4 w-4" /> Grades</TabsTrigger>
            <TabsTrigger value="audit" className="gap-2"><ClipboardList className="h-4 w-4" /> Audit Log</TabsTrigger>
            <TabsTrigger value="emaillogs" className="gap-2"><Inbox className="h-4 w-4" /> Email Logs</TabsTrigger>
            <TabsTrigger value="suppression" className="gap-2"><MailX className="h-4 w-4" /> Suppression</TabsTrigger>
            <TabsTrigger value="demorequests" className="gap-2"><Building2 className="h-4 w-4" /> Demo Requests</TabsTrigger>
            <TabsTrigger value="coupons" className="gap-2"><Tag className="h-4 w-4" /> Coupons</TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2"><CreditCard className="h-4 w-4" /> Subscriptions</TabsTrigger>
            <TabsTrigger value="paymentanalytics" className="gap-2"><BarChart3 className="h-4 w-4" /> Payment Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="courses"><CoursesTab /></TabsContent>
          <TabsContent value="cms"><CmsTab /></TabsContent>
          <TabsContent value="rbac"><RbacTab /></TabsContent>
          <TabsContent value="grades"><GradeManagementTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
          <TabsContent value="audit"><AuditLogTab /></TabsContent>
          <TabsContent value="emaillogs"><EmailLogsTab /></TabsContent>
          <TabsContent value="suppression"><SuppressionManagementTab /></TabsContent>
          <TabsContent value="demorequests"><DemoRequestsTab /></TabsContent>
          <TabsContent value="coupons"><CouponManagerTab /></TabsContent>
          <TabsContent value="subscriptions"><SubscriptionCRMTab /></TabsContent>
          <TabsContent value="paymentanalytics"><PaymentAnalyticsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
