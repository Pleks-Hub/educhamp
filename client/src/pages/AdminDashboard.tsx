import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Users, BookOpen, BarChart3, Settings, Shield, ClipboardList,
  GraduationCap, Brain, Activity, RefreshCw, ChevronRight, Clock, Mail, MessageCircle,
} from "lucide-react";

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
                {course.isDefault && (
                  <Badge variant="outline" className="mt-2 text-xs">Default</Badge>
                )}
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
  const [search, setSearch] = useState("");
  const { data: users, isLoading, refetch } = trpc.admin.listUsers.useQuery({ limit: 200, offset: 0 });
  const updateRole = trpc.admin.updateUserRole.useMutation({ onSuccess: () => { toast.success("Role updated"); refetch(); } });
  const updateAccountType = trpc.admin.updateUserAccountType.useMutation({ onSuccess: () => { toast.success("Account type updated"); refetch(); } });

  const filtered = (users ?? []).filter((u: any) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Badge variant="secondary">{filtered.length} users</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Email</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
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
                  <TableCell>
                    <Select
                      value={user.accountType}
                      onValueChange={(v) => updateAccountType.mutate({ userId: user.id, accountType: v as any })}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(v) => updateRole.mutate({ userId: user.id, role: v as any })}
                    >
                      <SelectTrigger className="h-8 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">
                      {user.role === "admin" ? "Admin" : "User"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Courses Tab ──────────────────────────────────────────────────────────────

function CoursesTab() {
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const { data: courses, isLoading, refetch } = trpc.admin.listCourses.useQuery();
  const { data: units } = trpc.admin.getCourseUnits.useQuery(
    { courseId: selectedCourse! },
    { enabled: !!selectedCourse }
  );
  const updateCourse = trpc.admin.updateCourse.useMutation({
    onSuccess: () => { toast.success("Course updated"); refetch(); }
  });

  const subjectColors: Record<string, string> = {
    math: "bg-blue-100 text-blue-800",
    english: "bg-purple-100 text-purple-800",
    science: "bg-green-100 text-green-800",
    "social studies": "bg-amber-100 text-amber-800",
    "world languages": "bg-pink-100 text-pink-800",
  };

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Course list */}
      <div className="lg:col-span-1 space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">All Courses</h3>
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
                <Badge className={`text-xs ${subjectColors[course.subject] ?? "bg-gray-100 text-gray-800"}`}>
                  {course.subject}
                </Badge>
                {!course.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Course detail */}
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
  if (!course) return null;
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

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch
              checked={course.isActive}
              onCheckedChange={(v) => onUpdate({ isActive: v })}
            />
            Active (visible to students)
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch
              checked={course.isDefault}
              onCheckedChange={(v) => onUpdate({ isDefault: v })}
            />
            Default course
          </label>
        </div>

        <div>
          <h4 className="font-medium text-sm mb-2">Units ({units.length})</h4>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {units.length === 0 ? (
              <p className="text-xs text-muted-foreground">No units found.</p>
            ) : units.map((unit: any) => (
              <div key={unit.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/40 text-sm">
                <span className="font-mono text-xs text-muted-foreground w-8">U{unit.unitNumber}</span>
                <span className="flex-1">{unit.title}</span>
                {unit.teksAlignment && (
                  <Badge variant="outline" className="text-xs">{unit.teksAlignment.split("(")[0].trim()}</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
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
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => upsert.mutate({ key: setting.key, value: getValue(setting.key), description: setting.label })}
                      >
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
  const { data: log, isLoading } = trpc.admin.getAuditLog.useQuery({ limit: 100 });

  const actionColors: Record<string, string> = {
    "user.role_change": "text-blue-600",
    "user.account_type_change": "text-violet-600",
    "user.course_enroll": "text-emerald-600",
    "course.update": "text-orange-600",
    "setting.update": "text-pink-600",
  };

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;

  return (
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
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No audit log entries yet.</TableCell>
            </TableRow>
          ) : (log ?? []).map((entry: any) => (
            <TableRow key={entry.id}>
              <TableCell>
                <span className={`text-sm font-mono ${actionColors[entry.action] ?? "text-foreground"}`}>
                  {entry.action}
                </span>
              </TableCell>
              <TableCell className="text-sm">
                {entry.targetType ?? "—"} {entry.targetId ? `#${entry.targetId}` : ""}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                {entry.details ? JSON.stringify(entry.details) : "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Grade Management Tab ──────────────────────────────────────────────────

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

function SchedulePromotionButton() {
  const schedule = trpc.admin.scheduleGradePromotion.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Annual grade promotion scheduled! Next run: ${data.nextExecutionAt ? new Date(data.nextExecutionAt).toLocaleDateString() : "June 15"}`);
    },
    onError: (err) => toast.error(err.message),
  });
  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white"
        disabled={schedule.isPending}
        onClick={() => schedule.mutate({ cron: "0 0 2 15 6 *" })}
      >
        {schedule.isPending ? "Scheduling…" : "Activate Annual Promotion (June 15)"}
      </Button>
      <span className="text-xs text-blue-700">
        Runs every June 15 at 2:00 AM UTC · Idempotent (safe to re-run)
      </span>
    </div>
  );
}

function GradeManagementTab() {
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [bulkFromGrade, setBulkFromGrade] = useState<string>("");
  const [confirmBulk, setConfirmBulk] = useState(false);

  const { data: users, isLoading, refetch } = trpc.admin.listUsers.useQuery({ limit: 500, offset: 0 });
  const setGrade = trpc.admin.setStudentGrade.useMutation({
    onSuccess: () => { toast.success("Grade updated"); refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const bulkPromote = trpc.admin.bulkPromoteGrade.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Promoted ${data.promoted} students from ${bulkFromGrade} to ${GRADE_PROMOTIONS[bulkFromGrade] ?? "next grade"}`);
      setConfirmBulk(false);
      setBulkFromGrade("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const students = (users ?? []).filter((u: any) => u.accountType === "student");
  const filtered = filterGrade === "all" ? students : students.filter((u: any) => u.grade === filterGrade);

  const gradeCounts = GRADE_LEVELS.reduce((acc, g) => {
    acc[g] = students.filter((u: any) => u.grade === g).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Grade distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> Grade Distribution
          </CardTitle>
          <CardDescription>Current student count per grade level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {GRADE_LEVELS.map((g) => (
              <button
                key={g}
                onClick={() => setFilterGrade(filterGrade === g ? "all" : g)}
                className={`rounded-lg p-2 text-center border transition-colors ${
                  filterGrade === g ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 hover:bg-muted border-border"
                }`}
              >
                <div className="text-lg font-bold">{gradeCounts[g] ?? 0}</div>
                <div className="text-xs mt-0.5 leading-tight">{g.replace("Grade ", "Gr.")}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bulk end-of-year promotion */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-amber-800">
            <Brain className="h-4 w-4" /> End-of-Year Grade Promotion
          </CardTitle>
          <CardDescription className="text-amber-700">
            Promote all students in a grade to the next grade level. This is irreversible — use at the end of the school year.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-amber-800">Promote all students from:</span>
              <Select value={bulkFromGrade} onValueChange={setBulkFromGrade}>
                <SelectTrigger className="h-9 w-36 text-sm">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.filter((g) => GRADE_PROMOTIONS[g]).map((g) => (
                    <SelectItem key={g} value={g}>{g} → {GRADE_PROMOTIONS[g]} ({gradeCounts[g] ?? 0} students)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {bulkFromGrade && !confirmBulk && (
              <Button
                variant="outline"
                size="sm"
                className="border-amber-400 text-amber-800 hover:bg-amber-100"
                onClick={() => setConfirmBulk(true)}
              >
                Preview Promotion
              </Button>
            )}
            {confirmBulk && bulkFromGrade && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-amber-800 font-medium">
                  Promote {gradeCounts[bulkFromGrade] ?? 0} students from {bulkFromGrade} → {GRADE_PROMOTIONS[bulkFromGrade]}?
                </span>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={bulkPromote.isPending}
                  onClick={() => bulkPromote.mutate({ fromGrade: bulkFromGrade, toGrade: GRADE_PROMOTIONS[bulkFromGrade] })}
                >
                  {bulkPromote.isPending ? "Promoting…" : "Confirm Promote"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmBulk(false)}>Cancel</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Automated annual promotion scheduler */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-blue-800">
            <Clock className="h-4 w-4" /> Automated Annual Grade Promotion
          </CardTitle>
          <CardDescription className="text-blue-700">
            Schedule a recurring cron job that automatically promotes all students to the next grade on June 15 each year.
            <strong className="block mt-1">The site must be deployed before this can be activated.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SchedulePromotionButton />
        </CardContent>
      </Card>

      {/* Per-student grade assignment */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm">
            {filterGrade === "all" ? `All Students (${students.length})` : `${filterGrade} (${filtered.length} students)`}
          </h3>
          {filterGrade !== "all" && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setFilterGrade("all")}>Clear filter</Button>
          )}
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
                    <TableCell>
                      {user.grade ? (
                        <Badge variant="outline" className="text-xs">{user.grade}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{user.school ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={user.grade ?? ""}
                        onValueChange={(v) => setGrade.mutate({ userId: user.id, gradeLevel: v })}
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue placeholder="Set grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADE_LEVELS.map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
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

// ─── Main AdminDashboard ──────────────────────────────────────────────────────

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
      <div className="border-b bg-card px-6 py-4">
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
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-2">
              <BookOpen className="h-4 w-4" /> Courses
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" /> Settings
            </TabsTrigger>
            <TabsTrigger value="grades" className="gap-2">
              <GraduationCap className="h-4 w-4" /> Grades
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <ClipboardList className="h-4 w-4" /> Audit Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="courses"><CoursesTab /></TabsContent>
          <TabsContent value="grades"><GradeManagementTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
          <TabsContent value="audit"><AuditLogTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
