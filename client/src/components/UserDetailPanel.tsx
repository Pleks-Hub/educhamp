import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  User, BookOpen, Brain, Monitor, Users, Shield, Mail, Calendar,
  Globe, Smartphone, Trash2, Link2, AlertTriangle, CheckCircle2, Clock
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: "bg-red-100 text-red-700 border-red-200",
    teacher: "bg-purple-100 text-purple-700 border-purple-200",
    parent: "bg-blue-100 text-blue-700 border-blue-200",
    student: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return <Badge variant="outline" className={`text-xs ${colors[role] ?? ""}`}>{role}</Badge>;
}

function MasteryBar({ score }: { score: number }) {
  const color = score >= 90 ? "bg-emerald-500" : score >= 75 ? "bg-blue-500" : score >= 60 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{score}</span>
    </div>
  );
}

function SessionRow({ session }: { session: any }) {
  return (
    <TableRow>
      <TableCell className="text-xs">
        <div className="flex items-center gap-1.5">
          <Smartphone className="h-3 w-3 text-muted-foreground" />
          {session.deviceInfo ?? "Unknown device"}
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Globe className="h-3 w-3" />
          {session.country ?? "—"}
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {session.createdAt ? new Date(session.createdAt).toLocaleString() : "—"}
      </TableCell>
      <TableCell className="text-xs">
        {session.endedAt ? (
          <Badge variant="outline" className="text-xs text-muted-foreground">Ended</Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50">Active</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

// ─── Student Detail Panel ─────────────────────────────────────────────────────

function StudentDetailPanel({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [linkEmail, setLinkEmail] = useState("");
  const { data, isLoading, refetch } = trpc.adminDetail.getStudentDetail.useQuery({ studentId: userId });
  const linkParent = trpc.adminDetail.linkParentToStudent.useMutation({
    onSuccess: () => { toast.success("Parent linked"); setLinkEmail(""); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const removeParent = trpc.adminDetail.removeParentLink.useMutation({
    onSuccess: () => { toast.success("Parent unlinked"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return (
    <div className="space-y-3 p-2">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
    </div>
  );
  if (!data) return <p className="text-sm text-muted-foreground p-4">Student not found.</p>;

  const { profile, enrollments, mastery, sessions, parents } = data;

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="w-full grid grid-cols-5 mb-4">
        <TabsTrigger value="profile" className="text-xs gap-1"><User className="h-3 w-3" />Profile</TabsTrigger>
        <TabsTrigger value="courses" className="text-xs gap-1"><BookOpen className="h-3 w-3" />Courses</TabsTrigger>
        <TabsTrigger value="mastery" className="text-xs gap-1"><Brain className="h-3 w-3" />Mastery</TabsTrigger>
        <TabsTrigger value="sessions" className="text-xs gap-1"><Monitor className="h-3 w-3" />Sessions</TabsTrigger>
        <TabsTrigger value="parents" className="text-xs gap-1"><Users className="h-3 w-3" />Guardians</TabsTrigger>
      </TabsList>

      {/* Profile */}
      <TabsContent value="profile" className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
              {(profile.name ?? profile.email ?? "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{profile.name ?? "—"}</h3>
            <p className="text-sm text-muted-foreground">{profile.email ?? profile.openId}</p>
            <div className="flex items-center gap-2 mt-1">
              <RoleBadge role={profile.role} />
              <Badge variant="outline" className="text-xs">{profile.accountType}</Badge>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Joined</p>
            <p className="font-medium">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Login</p>
            <p className="font-medium">{profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleDateString() : "Never"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
            <p className="font-medium capitalize">{profile.status ?? "active"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">User ID</p>
            <p className="font-medium font-mono text-xs">{profile.id}</p>
          </div>
        </div>
      </TabsContent>

      {/* Courses */}
      <TabsContent value="courses" className="space-y-3">
        {(enrollments ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No course enrollments.</p>
        ) : (enrollments ?? []).map((c: any) => (
          <Card key={c.enrollmentId} className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{c.courseName ?? `Course #${c.courseId}`}</p>
                <p className="text-xs text-muted-foreground">{c.courseGrade ?? ""} · Enrolled {c.enrolledAt ? new Date(c.enrolledAt).toLocaleDateString() : "—"}</p>
              </div>
              <Badge variant="outline" className="text-xs">{c.status ?? "active"}</Badge>
            </div>
          </Card>
        ))}
      </TabsContent>

      {/* Mastery */}
      <TabsContent value="mastery" className="space-y-2">
        {(mastery ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No mastery data yet.</p>
        ) : (
          <div className="space-y-2">
            {(mastery ?? []).map((m: any) => (
              <div key={m.skillId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate max-w-[200px]">{m.skillId}</span>
                  <span className="text-muted-foreground">{m.attemptCount} attempts</span>
                </div>
                <MasteryBar score={m.score} />
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Sessions */}
      <TabsContent value="sessions">
        {(sessions ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No session history.</p>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Device</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                  <TableHead className="text-xs">Started</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sessions ?? []).map((s: any) => <SessionRow key={s.id} session={s} />)}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      {/* Parents / Guardians */}
      <TabsContent value="parents" className="space-y-4">
        <div className="space-y-2">
          {(parents ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No guardians linked.</p>
          ) : (parents ?? []).map((p: any) => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{(p.name ?? p.email ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{p.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{p.email ?? p.openId}</p>
                </div>
              </div>
              <Button
                variant="ghost" size="sm" className="text-destructive hover:text-destructive h-7"
                onClick={() => removeParent.mutate({ studentId: userId, parentId: p.id })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Link a Guardian</p>
          <div className="flex gap-2">
            <Input
              placeholder="Parent email address…"
              value={linkEmail}
              onChange={e => setLinkEmail(e.target.value)}
              className="h-8 text-sm"
            />
            <Button
              size="sm" className="h-8 gap-1"
              disabled={!linkEmail.trim() || linkParent.isPending}
              onClick={() => linkParent.mutate({ studentId: userId, parentEmail: linkEmail.trim() })}
            >
              <Link2 className="h-3.5 w-3.5" /> Link
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

// ─── Parent Detail Panel ──────────────────────────────────────────────────────

function ParentDetailPanel({ userId }: { userId: number }) {
  const { data, isLoading } = trpc.adminDetail.getParentDetail.useQuery({ parentId: userId });

  if (isLoading) return (
    <div className="space-y-3 p-2">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
    </div>
  );
  if (!data) return <p className="text-sm text-muted-foreground p-4">Parent not found.</p>;

  const { profile, students, coParents, sessions } = data;

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="w-full grid grid-cols-4 mb-4">
        <TabsTrigger value="profile" className="text-xs gap-1"><User className="h-3 w-3" />Profile</TabsTrigger>
        <TabsTrigger value="children" className="text-xs gap-1"><Users className="h-3 w-3" />Students</TabsTrigger>
        <TabsTrigger value="coparents" className="text-xs gap-1"><Shield className="h-3 w-3" />Co-Parents</TabsTrigger>
        <TabsTrigger value="sessions" className="text-xs gap-1"><Monitor className="h-3 w-3" />Sessions</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg font-semibold bg-blue-100 text-blue-700">
              {(profile.name ?? profile.email ?? "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{profile.name ?? "—"}</h3>
            <p className="text-sm text-muted-foreground">{profile.email ?? profile.openId}</p>
            <div className="flex items-center gap-2 mt-1">
              <RoleBadge role={profile.role} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Joined</p>
            <p className="font-medium">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Login</p>
            <p className="font-medium">{profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleDateString() : "Never"}</p>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="children" className="space-y-2">
        {(students ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No connected students.</p>
        ) : (students ?? []).map((c: any) => (
          <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{(c.name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{c.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{c.email ?? c.openId}</p>
            </div>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="coparents" className="space-y-2">
        {(coParents ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No co-parents or guardians.</p>
        ) : (coParents ?? []).map((cp: any) => (
          <div key={cp.id} className="flex items-center gap-3 p-3 rounded-lg border">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{(cp.name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{cp.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{cp.email ?? cp.openId}</p>
            </div>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="sessions">
        {(sessions ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No session history.</p>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Device</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                  <TableHead className="text-xs">Started</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sessions ?? []).map((s: any) => <SessionRow key={s.id} session={s} />)}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

// ─── Admin Detail Panel ───────────────────────────────────────────────────────

function AdminDetailPanel({ userId }: { userId: number }) {
  const { data, isLoading } = trpc.adminDetail.getAdminDetail.useQuery({ adminId: userId });

  if (isLoading) return (
    <div className="space-y-3 p-2">
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
    </div>
  );
  if (!data) return <p className="text-sm text-muted-foreground p-4">Admin not found.</p>;

  const { profile, sessions, invitedBy } = data;

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="w-full grid grid-cols-3 mb-4">
        <TabsTrigger value="profile" className="text-xs gap-1"><User className="h-3 w-3" />Profile</TabsTrigger>
        <TabsTrigger value="sessions" className="text-xs gap-1"><Monitor className="h-3 w-3" />Sessions</TabsTrigger>
        <TabsTrigger value="audit" className="text-xs gap-1"><Shield className="h-3 w-3" />Access</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg font-semibold bg-red-100 text-red-700">
              {(profile.name ?? profile.email ?? "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{profile.name ?? "—"}</h3>
            <p className="text-sm text-muted-foreground">{profile.email ?? profile.openId}</p>
            <RoleBadge role="admin" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Joined</p>
            <p className="font-medium">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Login</p>
            <p className="font-medium">{profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleDateString() : "Never"}</p>
          </div>
        </div>
        {invitedBy && (
          <div className="p-3 rounded-lg border bg-muted/30">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Invited by</p>
            <p className="text-sm font-medium">{invitedBy.name ?? invitedBy.email}</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="sessions">
        {(sessions ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No session history.</p>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Device</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                  <TableHead className="text-xs">Started</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sessions ?? []).map((s: any) => <SessionRow key={s.id} session={s} />)}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="audit" className="space-y-2">
        <div className="p-4 rounded-lg border bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-medium">Admin access granted</p>
          </div>
          <p className="text-xs text-amber-600 mt-1">
            This account has full admin privileges. All actions are logged in the Audit Log tab.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}

// ─── Main UserDetailDialog ────────────────────────────────────────────────────

export function UserDetailDialog({ userId, onClose, initialRole }: { userId: number; onClose: () => void; initialRole?: string }) {
  // Use the role passed from the parent (from the users list) to choose the right panel
  // Fall back to student if not provided
  const role = initialRole ?? "student";

  // Get name from the appropriate detail query
  const studentQuery = trpc.adminDetail.getStudentDetail.useQuery(
    { studentId: userId },
    { enabled: role !== "parent" && role !== "admin", retry: false }
  );
  const parentQuery = trpc.adminDetail.getParentDetail.useQuery(
    { parentId: userId },
    { enabled: role === "parent", retry: false }
  );
  const adminQuery = trpc.adminDetail.getAdminDetail.useQuery(
    { adminId: userId },
    { enabled: role === "admin", retry: false }
  );

  const name =
    studentQuery.data?.profile?.name ??
    parentQuery.data?.profile?.name ??
    adminQuery.data?.profile?.name ??
    `User #${userId}`;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            User Detail — {name}
          </DialogTitle>
        </DialogHeader>
        {role === "parent" ? (
          <ParentDetailPanel userId={userId} />
        ) : role === "admin" ? (
          <AdminDetailPanel userId={userId} />
        ) : (
          <StudentDetailPanel userId={userId} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}
