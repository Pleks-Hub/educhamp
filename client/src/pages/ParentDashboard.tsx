import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Users, UserPlus, BookOpen, Trophy, TrendingUp, AlertTriangle,
  ChevronRight, GraduationCap, BarChart3, CheckCircle2, Clock,
  Pencil, Trash2, Mail, Plus, X, Star, Target, Brain
} from "lucide-react";
import { Link } from "wouter";
import { Streamdown } from "streamdown";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChildSummary = {
  linkId: number;
  childId: number;
  name: string;
  displayName: string;
  nickname: string | null;
  email: string | null;
  grade: string | null;
  school: string | null;
  relationship: string | null;
  enrolledAt: Date;
  accountType: string;
  overallMastery: number | null;
  masteryLabel: string | null;
  completedUnits: number;
  inProgressUnits: number;
  totalUnits: number;
  unitMastery: { unitNumber: number; title: string; avgMastery: number | null; status: string; quizScore: number | null }[];
  recentQuizzes: { unitNumber: number; score: number; completedAt: Date }[];
  placement: { score: number; recommendation: string | null; completedAt: Date } | null;
  adaptivePath: string | null;
};

// ─── Mastery helpers ──────────────────────────────────────────────────────────

function masteryColor(score: number | null) {
  if (score === null) return "bg-muted text-muted-foreground";
  if (score >= 90) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (score >= 75) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 60) return "bg-amber-100 text-amber-800 border-amber-200";
  if (score >= 40) return "bg-orange-100 text-orange-800 border-orange-200";
  return "bg-red-100 text-red-800 border-red-200";
}

function statusIcon(status: string) {
  switch (status) {
    case "completed": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "quiz_unlocked": return <Trophy className="h-4 w-4 text-blue-500" />;
    case "in_progress": return <Clock className="h-4 w-4 text-amber-500" />;
    default: return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
  }
}

function adaptivePathBadge(path: string | null) {
  if (!path) return null;
  const map: Record<string, { label: string; color: string }> = {
    reteach: { label: "Needs Reteaching", color: "bg-red-100 text-red-700 border-red-200" },
    guided_practice: { label: "Guided Practice", color: "bg-amber-100 text-amber-700 border-amber-200" },
    quiz_ready: { label: "Quiz Ready", color: "bg-blue-100 text-blue-700 border-blue-200" },
    challenge: { label: "Challenge Level", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  };
  const entry = map[path];
  if (!entry) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${entry.color}`}>
      {entry.label}
    </span>
  );
}

// ─── Enrol Child Modal ────────────────────────────────────────────────────────

function EnrolChildModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [tab, setTab] = useState<"email" | "new">("email");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [relationship, setRelationship] = useState("parent");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newGrade, setNewGrade] = useState("9");
  const [newSchool, setNewSchool] = useState("");

  const enrollByEmail = trpc.parent.enrollByEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.childName} has been added to your account.`);
      onSuccess();
      onClose();
      setEmail(""); setNickname("");
    },
    onError: (err) => toast.error(err.message),
  });

  const createAndEnroll = trpc.parent.createAndEnroll.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.childName} has been created and added to your account.`);
      onSuccess();
      onClose();
      setNewName(""); setNewEmail(""); setNewGrade("9"); setNewSchool("");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Enrol a Student
          </DialogTitle>
          <DialogDescription>
            Link an existing student account or create a new one for your child.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "email" | "new")}>
          <TabsList className="w-full">
            <TabsTrigger value="email" className="flex-1">Existing Account</TabsTrigger>
            <TabsTrigger value="new" className="flex-1">New Student</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="child-email">Student Email</Label>
              <Input
                id="child-email"
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the email address the student used to sign up for EduChamp.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname (optional)</Label>
              <Input
                id="nickname"
                placeholder="e.g. Emma, My Daughter"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="tutor">Tutor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={() => enrollByEmail.mutate({ email, nickname: nickname || undefined, relationship })}
              disabled={!email || enrollByEmail.isPending}
            >
              {enrollByEmail.isPending ? "Linking…" : "Link Student Account"}
            </Button>
          </TabsContent>

          <TabsContent value="new" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="new-name">Full Name *</Label>
                <Input
                  id="new-name"
                  placeholder="Student's full name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="new-email">Email Address *</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="student@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Grade</Label>
                <Select value={newGrade} onValueChange={setNewGrade}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["7","8","9","10","11","12"].map((g) => (
                      <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-school">School (optional)</Label>
                <Input
                  id="new-school"
                  placeholder="School name"
                  value={newSchool}
                  onChange={(e) => setNewSchool(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A student account will be created. The student can sign in later using the email you provide.
            </p>
            <Button
              className="w-full"
              onClick={() => createAndEnroll.mutate({ name: newName, email: newEmail, grade: newGrade, school: newSchool || undefined })}
              disabled={!newName || !newEmail || createAndEnroll.isPending}
            >
              {createAndEnroll.isPending ? "Creating…" : "Create & Enrol Student"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Nickname Modal ──────────────────────────────────────────────────────

function EditNicknameModal({
  open, onClose, child, onSuccess,
}: { open: boolean; onClose: () => void; child: ChildSummary; onSuccess: () => void }) {
  const [value, setValue] = useState(child.nickname ?? child.displayName);
  const updateNickname = trpc.parent.updateNickname.useMutation({
    onSuccess: () => { toast.success("Name updated."); onSuccess(); onClose(); },
    onError: (err) => toast.error(err.message),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Display Name</DialogTitle>
          <DialogDescription>How this student appears in your Parent Dashboard.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Display name" />
          <Button className="w-full" onClick={() => updateNickname.mutate({ childId: child.childId, nickname: value })} disabled={!value || updateNickname.isPending}>
            {updateNickname.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Child Detail Panel ───────────────────────────────────────────────────────

function ChildDetailPanel({ child, onRemove }: { child: ChildSummary; onRemove: () => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const utils = trpc.useUtils();
  const removeChild = trpc.parent.removeChild.useMutation({
    onSuccess: () => { toast.success("Student removed from your account."); utils.parent.listChildren.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const { data: detail, isLoading } = trpc.parent.getChildDetail.useQuery({ childId: child.childId });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            {(child.name ?? "S")[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{child.name}</h2>
              <button onClick={() => setEditOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{child.email} · Grade {child.grade ?? "—"}{child.school ? ` · ${child.school}` : ""}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground capitalize">{child.relationship}</span>
              {child.overallMastery !== null && (
                <Badge variant="outline" className={`text-xs ${masteryColor(child.overallMastery)}`}>
                  {child.masteryLabel} · {child.overallMastery}%
                </Badge>
              )}
              {adaptivePathBadge(child.adaptivePath)}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => {
            if (confirm(`Remove ${child.name} from your account? Their progress data will be preserved.`)) {
              removeChild.mutate({ childId: child.childId });
              onRemove();
            }
          }}
        >
          <Trash2 className="h-4 w-4 mr-1" /> Remove
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-primary">{child.completedUnits}</div>
          <div className="text-xs text-muted-foreground mt-1">Units Completed</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-amber-600">{child.inProgressUnits}</div>
          <div className="text-xs text-muted-foreground mt-1">In Progress</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-emerald-600">{child.overallMastery ?? "—"}{child.overallMastery !== null ? "%" : ""}</div>
          <div className="text-xs text-muted-foreground mt-1">Overall Mastery</div>
        </Card>
      </div>

      {/* Placement result */}
      {child.placement && (
        <Card className="border-l-4 border-l-primary bg-primary/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Placement Assessment</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(child.placement.completedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="text-2xl font-bold text-primary mb-1">{child.placement.score}%</div>
            {child.placement.recommendation && (
              <p className="text-sm text-muted-foreground">{child.placement.recommendation}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Unit-by-unit mastery */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Unit Mastery Overview
        </h3>
        <div className="space-y-2">
          {child.unitMastery.map((u) => (
            <div key={u.unitNumber} className="flex items-center gap-3">
              <div className="w-6 text-xs text-muted-foreground text-right shrink-0">U{u.unitNumber}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs truncate">{u.title}</span>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    {statusIcon(u.status)}
                    {u.avgMastery !== null && (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${masteryColor(u.avgMastery)}`}>
                        {u.avgMastery}%
                      </span>
                    )}
                    {u.quizScore !== null && (
                      <span className="text-xs text-muted-foreground">Quiz: {u.quizScore}%</span>
                    )}
                  </div>
                </div>
                <Progress value={u.avgMastery ?? 0} className="h-1.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent quizzes */}
      {child.recentQuizzes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" /> Recent Quiz Scores
          </h3>
          <div className="space-y-2">
            {child.recentQuizzes.map((q, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Unit {q.unitNumber} Quiz</span>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${q.score >= 75 ? "text-emerald-600" : q.score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                    {q.score}%
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(q.completedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Tutor Parent Summary link */}
      <div className="pt-2">
        <Link href={`/tutor?childId=${child.childId}&mode=parent_summary`}>
          <Button className="w-full" variant="outline">
            <Brain className="h-4 w-4 mr-2" />
            Open AI Parent Summary for {child.name}
          </Button>
        </Link>
      </div>

      {editOpen && (
        <EditNicknameModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          child={child}
          onSuccess={() => utils.parent.listChildren.invalidate()}
        />
      )}
    </div>
  );
}

// ─── Main Parent Dashboard ────────────────────────────────────────────────────

export default function ParentDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [enrolOpen, setEnrolOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: children, isLoading: childrenLoading } = trpc.parent.listChildren.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const becomeParent = trpc.parent.becomeParent.useMutation({
    onSuccess: () => {
      toast.success("Your account has been upgraded to a Parent account.");
      utils.auth.me.invalidate();
    },
  });

  if (loading || childrenLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading parent dashboard…</p>
        </div>
      </div>
    );
  }

  const selectedChild = children?.find((c) => c?.childId === selectedChildId) ?? null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            Parent Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor your children's Algebra I progress, mastery levels, and learning paths.
          </p>
        </div>
        <Button onClick={() => setEnrolOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Enrol a Student
        </Button>
      </div>

      {/* Upgrade to parent prompt */}
      {user?.accountType === "student" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-5 pb-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-6 w-6 text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">Switch to Parent Mode</p>
                <p className="text-sm text-amber-700">Upgrade your account to manage and monitor your children's learning.</p>
              </div>
            </div>
            <Button
              onClick={() => becomeParent.mutate()}
              disabled={becomeParent.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {becomeParent.isPending ? "Upgrading…" : "Become a Parent Account"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No children enrolled */}
      {(!children || children.length === 0) && (
        <Card className="text-center py-16">
          <CardContent className="space-y-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No students enrolled yet</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                Enrol your children to monitor their Algebra I progress, mastery scores, quiz results, and adaptive learning path.
              </p>
            </div>
            <Button onClick={() => setEnrolOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Enrol Your First Student
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Children grid + detail panel */}
      {children && children.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: child cards */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
              Your Students ({children.length})
            </h2>
            {children.map((child) => {
              if (!child) return null;
              const isSelected = selectedChildId === child.childId;
              return (
                <button
                  key={child.childId}
                  onClick={() => setSelectedChildId(isSelected ? null : child.childId)}
                  className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}>
                      {(child.name ?? "S")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{child.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        Grade {child.grade ?? "—"} · {child.completedUnits}/{child.totalUnits} units
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {child.overallMastery !== null ? (
                        <div className={`text-sm font-bold px-2 py-0.5 rounded-full border ${masteryColor(child.overallMastery)}`}>
                          {child.overallMastery}%
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No data</div>
                      )}
                    </div>
                  </div>

                  {/* Mini progress bar */}
                  <div className="mt-3">
                    <Progress
                      value={child.totalUnits > 0 ? (child.completedUnits / child.totalUnits) * 100 : 0}
                      className="h-1.5"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{child.masteryLabel ?? "Not started"}</span>
                      {adaptivePathBadge(child.adaptivePath)}
                    </div>
                  </div>
                </button>
              );
            })}

            <button
              onClick={() => setEnrolOpen(true)}
              className="w-full rounded-xl border border-dashed border-border p-4 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              Enrol another student
            </button>
          </div>

          {/* Right: detail panel */}
          <div className="lg:col-span-2">
            {selectedChild ? (
              <Card className="p-6">
                <ChildDetailPanel
                  child={selectedChild}
                  onRemove={() => setSelectedChildId(null)}
                />
              </Card>
            ) : (
              <Card className="flex items-center justify-center min-h-[400px] text-center">
                <CardContent className="space-y-3">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <ChevronRight className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Select a student</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click a student card on the left to view their detailed progress report.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Enrol modal */}
      <EnrolChildModal
        open={enrolOpen}
        onClose={() => setEnrolOpen(false)}
        onSuccess={() => utils.parent.listChildren.invalidate()}
      />
    </div>
  );
}
