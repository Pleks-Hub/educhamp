import { useState, useEffect } from "react";
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
  Award, Users, UserPlus, BookOpen, Trophy, TrendingUp, AlertTriangle,
  ChevronRight, GraduationCap, BarChart3, CheckCircle2, Clock,
  Pencil, Trash2, Mail, Plus, X, Star, Target, Brain, ShieldAlert,
  FileText, Download, StickyNote, Flag, TrendingDown, Zap,
  Loader2, Link2, Copy, Bell, CheckCheck, XCircle, UserCheck, Info,
  Send, Share2, BookMarked, ThumbsUp, ThumbsDown, AlertCircle
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { StreamdownRenderer } from "@/components/StreamdownRenderer";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Child Certificates Panel ────────────────────────────────────────────────

function ChildCertificatesPanel({ childId, childName }: { childId: number; childName: string }) {
  const { data: certs, isLoading } = trpc.certificate.getChildCertificates.useQuery({ childId });

  const handleShare = async (token: string, courseTitle: string) => {
    const url = `${window.location.origin}/certificate/${token}`;
    if (navigator.share) {
      try { await navigator.share({ title: `EduChamp Certificate — ${courseTitle}`, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Certificate link copied!");
    }
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground text-sm">Loading certificates…</div>;

  if (!certs || certs.length === 0) {
    return (
      <div className="py-12 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Award className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <p className="font-medium text-sm">{childName} hasn't earned any certificates yet.</p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Certificates are awarded when a student achieves 90%+ average mastery across all units in a course.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {childName} has earned <span className="font-semibold text-foreground">{certs.length}</span>{" "}
        {certs.length === 1 ? "certificate" : "certificates"}.
      </p>
      {certs.map((cert) => (
        <Card key={cert.id} className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                <Award className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{cert.courseTitle}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge variant="outline" className="text-xs">{cert.courseCode}</Badge>
                  <span className="text-xs text-muted-foreground">Mastery: <span className="font-medium text-emerald-600">{cert.averageMastery}%</span></span>
                  <span className="text-xs text-muted-foreground">{new Date(cert.issuedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Link href={`/certificate/${cert.certificateToken}`}>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <Award className="h-3 w-3" /> View
                  </Button>
                </Link>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleShare(cert.certificateToken, cert.courseTitle)}>
                  <Share2 className="h-3 w-3" /> Share
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => window.open(`/api/certificate/${cert.certificateToken}/pdf`, "_blank")}>
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

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
  parentLedMode: boolean;
  languageLevel: "simplified" | "standard" | "advanced";
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
  const [tab, setTab] = useState<"invite" | "email" | "new">("invite");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [relationship, setRelationship] = useState("parent");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newGrade, setNewGrade] = useState("9");
  const [newSchool, setNewSchool] = useState("");
  // Invite tab state
  const [inviteChildName, setInviteChildName] = useState("");
  const [inviteChildEmail, setInviteChildEmail] = useState("");
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const createStudentInvite = trpc.onboarding.createStudentInvite.useMutation({
    onSuccess: (data) => {
      const url = `${window.location.origin}/join?invite=${data.token}`;
      setGeneratedInviteUrl(url);
    },
    onError: (err) => toast.error(err.message),
  });

  async function copyInviteLink() {
    if (!generatedInviteUrl) return;
    await navigator.clipboard.writeText(generatedInviteUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
    toast.success("Invite link copied!");
  }

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

        <Tabs value={tab} onValueChange={(v) => setTab(v as "invite" | "email" | "new")}>
          <TabsList className="w-full">
            <TabsTrigger value="invite" className="flex-1">Send Invite</TabsTrigger>
            <TabsTrigger value="email" className="flex-1">By Email</TabsTrigger>
            <TabsTrigger value="new" className="flex-1">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-4 mt-4">
            {!generatedInviteUrl ? (
              <>
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
                  <span className="font-medium">How it works:</span> Generate a secure invite link and share it with your child. They sign in with their own account and get automatically linked to yours.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-child-name">Child's Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="invite-child-name" placeholder="e.g. Emma" value={inviteChildName} onChange={e => setInviteChildName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-child-email">Child's Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="invite-child-email" type="email" placeholder="student@example.com" value={inviteChildEmail} onChange={e => setInviteChildEmail(e.target.value)} />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createStudentInvite.mutate({ childName: inviteChildName || undefined, childEmail: inviteChildEmail || undefined })}
                  disabled={createStudentInvite.isPending}
                >
                  {createStudentInvite.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating…</>
                    : <><Link2 className="h-4 w-4 mr-2" /> Generate Invite Link</>}
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  Invite link created! Share it with your child. It expires in 7 days.
                </div>
                <div className="space-y-2">
                  <Label>Invite Link</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={generatedInviteUrl} className="font-mono text-xs" />
                    <Button variant="outline" size="sm" onClick={copyInviteLink} aria-label={copiedInvite ? "Copied!" : "Copy invite link"}>
                      {copiedInvite ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => { setGeneratedInviteUrl(null); setInviteChildName(""); setInviteChildEmail(""); }}>
                  Generate Another
                </Button>
                <Button className="w-full" onClick={() => { onSuccess(); onClose(); }}>
                  Done
                </Button>
              </>
            )}
          </TabsContent>

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
                    {["Pre-K","Kindergarten","1","2","3","4","5","6","7","8","9","10","11","12"].map((g) => (
                      <SelectItem key={g} value={g}>{["Pre-K","Kindergarten"].includes(g) ? g : `Grade ${g}`}</SelectItem>
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

// ─── Goals & Notes Panel ─────────────────────────────────────────────────────

function GoalsNotesPanel({ childId }: { childId: number }) {
  const utils = trpc.useUtils();
  const [goalText, setGoalText] = useState("");
  const [noteText, setNoteText] = useState("");

  const { data: goals } = trpc.parentTools.listGoals.useQuery({ childId });
  const { data: notes } = trpc.parentTools.listNotes.useQuery({ childId });

  const createGoal = trpc.parentTools.createGoal.useMutation({
    onSuccess: () => { toast.success("Goal added!"); setGoalText(""); utils.parentTools.listGoals.invalidate({ childId }); },
    onError: (err) => toast.error(err.message),
  });
  const completeGoal = trpc.parentTools.completeGoal.useMutation({
    onSuccess: () => utils.parentTools.listGoals.invalidate({ childId }),
  });
  const deleteGoal = trpc.parentTools.deleteGoal.useMutation({
    onSuccess: () => utils.parentTools.listGoals.invalidate({ childId }),
  });
  const createNote = trpc.parentTools.createNote.useMutation({
    onSuccess: () => { toast.success("Note saved!"); setNoteText(""); utils.parentTools.listNotes.invalidate({ childId }); },
    onError: (err) => toast.error(err.message),
  });
  const deleteNote = trpc.parentTools.deleteNote.useMutation({
    onSuccess: () => utils.parentTools.listNotes.invalidate({ childId }),
  });

  return (
    <div className="space-y-6">
      {/* Goals */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Flag className="h-4 w-4 text-primary" /> Learning Goals
        </h3>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Add a learning goal…"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goalText && createGoal.mutate({ childId, goalText })}
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={() => createGoal.mutate({ childId, goalText })}
            disabled={!goalText || createGoal.isPending}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {goals && goals.length > 0 ? (
          <div className="space-y-2">
            {goals.map((g: any) => (
              <div key={g.id} className={`flex items-start gap-2 rounded-lg border p-3 ${g.completedAt ? "opacity-60" : ""}`}>
                <button
                  onClick={() => !g.completedAt && completeGoal.mutate({ goalId: g.id })}
                  className={`mt-0.5 h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                    g.completedAt ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground hover:border-primary"
                  }`}
                >
                  {g.completedAt && <CheckCircle2 className="h-3 w-3 text-white" />}
                </button>
                <span className={`flex-1 text-sm ${g.completedAt ? "line-through text-muted-foreground" : ""}`}>{g.goalText}</span>
                <button
                  onClick={() => deleteGoal.mutate({ goalId: g.id })}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">No goals yet. Add one above.</p>
        )}
      </div>

      <Separator />

      {/* Notes */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-amber-500" /> Parent Notes
        </h3>
        <div className="space-y-2 mb-3">
          <textarea
            placeholder="Add a note about this student's progress, behavior, or needs…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            size="sm"
            onClick={() => createNote.mutate({ childId, noteText })}
            disabled={!noteText || createNote.isPending}
          >
            Save Note
          </Button>
        </div>
        {notes && notes.length > 0 ? (
          <div className="space-y-2">
            {notes.map((n: any) => (
              <div key={n.id} className="rounded-lg border bg-amber-50/50 p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm flex-1">{n.noteText}</p>
                  <button
                    onClick={() => deleteNote.mutate({ noteId: n.id })}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">No notes yet.</p>
        )}
      </div>
    </div>
  );
}

// ─── Skill Gap Analysis Panel ─────────────────────────────────────────────────

function SkillGapPanel({ childId }: { childId: number }) {
  const { data, isLoading } = trpc.parentTools.skillGapAnalysis.useQuery({ childId });

  if (isLoading) return <div className="text-sm text-muted-foreground py-4 text-center">Analyzing skill gaps…</div>;
  if (!data) return <div className="text-sm text-muted-foreground py-4 text-center">No mastery data available yet.</div>;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Mastered", count: data.masteredCount, color: "text-emerald-600" },
          { label: "Approaching", count: data.approachingCount, color: "text-blue-600" },
          { label: "Developing", count: data.developingCount, color: "text-amber-600" },
          { label: "Beginner", count: data.beginnerCount, color: "text-red-600" },
        ].map((s) => (
          <Card key={s.label} className="text-center p-3">
            <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Skill gaps */}
      {data.gaps.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" /> Skills Needing Attention
          </h3>
          <div className="space-y-2">
            {data.gaps.map((g) => (
              <div key={g.skillId} className="flex items-center gap-3 rounded-lg border p-3">
                <div className={`h-2 w-2 rounded-full shrink-0 ${g.priority === "high" ? "bg-red-500" : "bg-amber-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-muted-foreground">{g.skillId}</div>
                  <Progress value={g.score} className="h-1.5 mt-1" />
                </div>
                <div className="shrink-0 text-right">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${
                    g.score < 60 ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200"
                  }`}>{g.score}%</span>
                  <div className="text-xs text-muted-foreground mt-0.5 capitalize">{g.masteryLabel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {data.strengths.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-500" /> Strengths
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.strengths.map((s) => (
              <span key={s.skillId} className="text-xs font-mono px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {s.skillId} · {s.score}%
              </span>
            ))}
          </div>
        </div>
      )}

      {data.gaps.length === 0 && data.strengths.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No skill data recorded yet. Complete some quizzes first.</p>
      )}
    </div>
  );
}

// ─── Report Export Panel ──────────────────────────────────────────────────────

// ─── Cross-Course Summary Table ─────────────────────────────────────────────

/** Fetches courses for a single child — used as a row in CrossCourseSummaryTable */
function ChildCourseRow({ child }: { child: ChildSummary }) {
  const { data: courses, isLoading } = trpc.parent.getChildAllCourses.useQuery({ childId: child.childId });

  const activeCourse = courses?.find((c) => c.isCurrent);
  const totalEnrolled = courses?.length ?? 0;
  const totalProgress = courses && courses.length > 0
    ? Math.round(courses.reduce((sum, c) => sum + c.progressPercent, 0) / courses.length)
    : null;

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      {/* Child name + grade */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
            {(child.name ?? "S")[0].toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-sm">{child.name}</div>
            <div className="text-xs text-muted-foreground">Grade {child.grade ?? "—"}</div>
          </div>
        </div>
      </td>
      {/* Courses enrolled */}
      <td className="py-3 px-4 text-center">
        {isLoading ? (
          <div className="h-4 w-8 bg-muted animate-pulse rounded mx-auto" />
        ) : (
          <span className="text-sm font-semibold">{totalEnrolled}</span>
        )}
      </td>
      {/* Active course */}
      <td className="py-3 px-4">
        {isLoading ? (
          <div className="h-4 w-28 bg-muted animate-pulse rounded" />
        ) : activeCourse ? (
          <div>
            <div className="text-sm font-medium truncate max-w-[180px]">{activeCourse.courseTitle}</div>
            {activeCourse.gradeLevel && (
              <span className="text-xs text-muted-foreground">{activeCourse.gradeLevel}</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">None selected</span>
        )}
      </td>
      {/* Active course progress */}
      <td className="py-3 px-4">
        {isLoading ? (
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        ) : activeCourse ? (
          <div className="space-y-1 min-w-[100px]">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{activeCourse.completedUnits}/{activeCourse.totalUnits} units</span>
              <span className="font-medium">{activeCourse.progressPercent}%</span>
            </div>
            <Progress value={activeCourse.progressPercent} className="h-1.5" />
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      {/* Overall mastery */}
      <td className="py-3 px-4 text-center">
        {child.overallMastery !== null ? (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${masteryColor(child.overallMastery)}`}>
            {child.overallMastery}%
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      {/* Avg progress across all courses */}
      <td className="py-3 px-4 text-center">
        {isLoading ? (
          <div className="h-4 w-10 bg-muted animate-pulse rounded mx-auto" />
        ) : totalProgress !== null ? (
          <span className="text-sm font-semibold">{totalProgress}%</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

function CrossCourseSummaryTable({ children }: { children: ChildSummary[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Cross-Course Summary</h3>
          <span className="text-xs text-muted-foreground ml-1">— all students at a glance</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student</th>
                <th className="text-center py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Courses</th>
                <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Course</th>
                <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Progress</th>
                <th className="text-center py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mastery</th>
                <th className="text-center py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg Progress</th>
              </tr>
            </thead>
            <tbody>
              {children.map((child) => (
                <ChildCourseRow key={child.childId} child={child} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Child Courses Panel ─────────────────────────────────────────────────────

const SUBJECT_COLORS_PARENT: Record<string, { bg: string; text: string }> = {
  "Mathematics": { bg: "bg-blue-50", text: "text-blue-700" },
  "English Language Arts": { bg: "bg-purple-50", text: "text-purple-700" },
  "Science": { bg: "bg-green-50", text: "text-green-700" },
  "Social Studies": { bg: "bg-amber-50", text: "text-amber-700" },
  "World Languages": { bg: "bg-rose-50", text: "text-rose-700" },
};

// ─── Course Requests Panel (per child) ─────────────────────────────────────

function CourseRequestsPanel({ childId, childName }: { childId: number; childName: string }) {
  const utils = trpc.useUtils();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<{ id: number; courseName: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: requests, isLoading } = trpc.parent.getPendingCourseRequests.useQuery();
  const { data: allRequests, isLoading: allLoading } = trpc.parent.getAllCourseRequests.useQuery();

  const childRequests = (requests ?? []).filter((r) => r.studentId === childId);
  const childAllRequests = (allRequests ?? []).filter((r) => r.studentId === childId);

  const approve = trpc.parent.approveCourseRequest.useMutation({
    onSuccess: () => {
      toast.success("Course approved!", { description: `${childName} has been enrolled.` });
      utils.parent.getPendingCourseRequests.invalidate();
      utils.parent.getAllCourseRequests.invalidate();
      utils.parent.getChildAllCourses.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const reject = trpc.parent.rejectCourseRequest.useMutation({
    onSuccess: () => {
      toast.success("Request rejected.");
      setRejectDialogOpen(false);
      setRejectingRequest(null);
      setRejectionReason("");
      utils.parent.getPendingCourseRequests.invalidate();
      utils.parent.getAllCourseRequests.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading || allLoading) {
    return <div className="h-24 rounded-xl bg-muted animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      {/* Pending requests */}
      {childRequests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-semibold">Pending Approval ({childRequests.length})</h4>
          </div>
          {childRequests.map((req) => (
            <div key={req.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-amber-900">{req.courseName}</p>
                  {req.courseDescription && (
                    <p className="text-xs text-amber-700 line-clamp-2 mt-0.5">{req.courseDescription}</p>
                  )}
                  <p className="text-xs text-amber-600 mt-1">
                    Requested {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => approve.mutate({ requestId: req.id })}
                  disabled={approve.isPending}
                >
                  {approve.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => { setRejectingRequest({ id: req.id, courseName: req.courseName }); setRejectDialogOpen(true); }}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request history */}
      {childAllRequests.filter((r) => r.status !== "pending").length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Request History</p>
          {childAllRequests.filter((r) => r.status !== "pending").map((req) => (
            <div key={req.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{req.courseName}</p>
                <p className="text-xs text-muted-foreground">
                  {req.status === "approved" ? "Approved" : "Rejected"} ·{" "}
                  {req.status === "approved" && req.approvedAt
                    ? new Date(req.approvedAt).toLocaleDateString()
                    : req.rejectedAt
                    ? new Date(req.rejectedAt).toLocaleDateString()
                    : ""}
                </p>
                {req.rejectionReason && (
                  <p className="text-xs text-muted-foreground italic mt-0.5">"{req.rejectionReason}"</p>
                )}
              </div>
              <Badge
                className={`text-xs shrink-0 ${
                  req.status === "approved"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : "bg-red-100 text-red-800 border-red-200"
                }`}
              >
                {req.status === "approved" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                {req.status}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {childRequests.length === 0 && childAllRequests.length === 0 && (
        <div className="text-center py-8 space-y-2">
          <BookMarked className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium">{childName} has no course requests yet.</p>
          <p className="text-xs text-muted-foreground">When {childName} requests a course, it will appear here for your approval.</p>
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Course Request</DialogTitle>
            <DialogDescription>
              Rejecting <strong>{rejectingRequest?.courseName}</strong> for {childName}. You can optionally provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="rejection-reason">Reason (optional)</Label>
            <Input
              id="rejection-reason"
              placeholder="e.g. Focus on current courses first"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectionReason(""); }}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => rejectingRequest && reject.mutate({ requestId: rejectingRequest.id, rejectionReason: rejectionReason || undefined })}
              disabled={reject.isPending}
            >
              {reject.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Child Courses Panel ─────────────────────────────────────────────────────

function ChildCoursesPanel({ childId, childName }: { childId: number; childName: string }) {
  const utils = trpc.useUtils();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removingCourse, setRemovingCourse] = useState<{ id: number; title: string } | null>(null);

  const { data: courses, isLoading } = trpc.parent.getChildAllCourses.useQuery({ childId });
  const { data: allCourses } = trpc.parent.getAvailableCourses.useQuery(undefined, { enabled: addDialogOpen });

  const enrolledCourseIds = new Set((courses ?? []).map((c: { courseId: number }) => c.courseId));
  const availableCourses = (allCourses ?? []).filter((c: { id: number }) => !enrolledCourseIds.has(c.id));

  const assignCourse = trpc.parent.assignCourseToStudent.useMutation({
    onSuccess: () => {
      toast.success("Course assigned!", { description: `${childName} has been enrolled.` });
      utils.parent.getChildAllCourses.invalidate();
      setAddDialogOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const removeCourse = trpc.parent.removeCourseFromStudent.useMutation({
    onSuccess: () => {
      toast.success("Course removed.");
      utils.parent.getChildAllCourses.invalidate();
      setRemoveDialogOpen(false);
      setRemovingCourse(null);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {childName} is enrolled in <strong>{courses?.length ?? 0}</strong> course{(courses?.length ?? 0) !== 1 ? "s" : ""}.
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add Course
        </Button>
      </div>

      {(!courses || courses.length === 0) ? (
        <div className="text-center py-8 space-y-2">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-foreground">{childName} is not enrolled in any courses yet.</p>
          <p className="text-xs text-muted-foreground">Use the "Add Course" button above to assign a course directly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {courses.map((cp) => {
            const colors = SUBJECT_COLORS_PARENT[cp.subject ?? ""] ?? { bg: "bg-muted/40", text: "text-muted-foreground" };
            return (
              <Card key={cp.courseId} className={`border ${cp.isCurrent ? "ring-2 ring-primary" : ""}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {cp.isCurrent && <Badge className="text-xs bg-primary text-primary-foreground">Active</Badge>}
                        {cp.gradeLevel && <Badge variant="outline" className="text-xs">{cp.gradeLevel}</Badge>}
                        {cp.subject && (
                          <Badge className={`text-xs ${colors.bg} ${colors.text}`}>{cp.subject}</Badge>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm leading-tight">{cp.courseTitle}</h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-600 shrink-0"
                      onClick={() => { setRemovingCourse({ id: cp.courseId, title: cp.courseTitle }); setRemoveDialogOpen(true); }}
                      aria-label={`Remove ${cp.courseTitle}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{cp.completedUnits}/{cp.totalUnits} units complete</span>
                      <span className="font-medium text-foreground">{cp.progressPercent}%</span>
                    </div>
                    <Progress value={cp.progressPercent} className="h-1.5" />
                  </div>
                  {cp.activeUnitTitle && (
                    <p className="text-xs text-muted-foreground truncate">
                      <span className="text-foreground font-medium">Unit {cp.activeUnitNumber}:</span> {cp.activeUnitTitle}
                    </p>
                  )}
                  {cp.lastActivityAt && (
                    <p className="text-xs text-muted-foreground">
                      Last studied: {new Date(cp.lastActivityAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Course dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a Course for {childName}</DialogTitle>
            <DialogDescription>
              Select a course to assign directly. This bypasses the student request flow and enrols {childName} immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto py-2">
            {availableCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {childName} is already enrolled in all available courses.
              </p>
            ) : (
              availableCourses.map((course) => (
                <div key={course.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{course.title}</p>
                    {course.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{course.description}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => assignCourse.mutate({ studentId: childId, courseId: course.id })}
                    disabled={assignCourse.isPending}
                  >
                    {assignCourse.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Assign
                  </Button>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Course confirmation dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Course</DialogTitle>
            <DialogDescription>
              Remove <strong>{removingCourse?.title}</strong> from {childName}'s enrolled courses? Their progress will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setRemoveDialogOpen(false); setRemovingCourse(null); }}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => removingCourse && removeCourse.mutate({ studentId: childId, courseId: removingCourse.id })}
              disabled={removeCourse.isPending}
            >
              {removeCourse.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove Course
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Child Achievements & Rewards Panel ─────────────────────────────────────

function ChildAchievementsPanel({ childId, childName }: { childId: number; childName: string }) {
  const { data: gamification, isLoading } = trpc.gamification.getChildGamificationSummary.useQuery(
    { childId },
    { staleTime: 30_000 }
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!gamification) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Trophy className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p>No gamification data yet for {childName}.</p>
      </div>
    );
  }

  const { xp, level, streak, badges, quests, house } = gamification;

  return (
    <div className="space-y-4">
      {/* XP & Level card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            XP & Level — {childName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black text-amber-600">{level?.levelName ?? "Novice"}</p>
              <p className="text-xs text-muted-foreground">Level {level?.level ?? 1}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{(xp?.totalXp ?? 0).toLocaleString()} XP</p>
              <p className="text-xs text-muted-foreground">{((xp as any)?.weeklyXp ?? 0).toLocaleString()} this week</p>
            </div>
          </div>
          <Progress value={level?.progressPercent ?? 0} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{level?.xpNeeded ?? 0} XP to next level</p>
        </CardContent>
      </Card>

      {/* Streak card */}
      <Card>
        <CardContent className="pt-4 flex items-center gap-4">
          <div className="text-4xl">{(streak?.currentStreak ?? 0) >= 7 ? "🔥" : "⚡"}</div>
          <div>
            <p className="font-bold text-lg">{streak?.currentStreak ?? 0}-day streak</p>
            <p className="text-xs text-muted-foreground">Longest: {streak?.longestStreak ?? 0} days</p>
          </div>
          {(streak as any)?.streakFreezeCount > 0 && (
            <Badge variant="outline" className="ml-auto text-xs">
              ❄️ {(streak as any).streakFreezeCount} freeze{(streak as any).streakFreezeCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-purple-500" />
            Badges Earned ({badges?.earnedCount ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {badges?.recent && badges.recent.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {badges.recent.map((b: any) => (
                <div key={b.id} className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/30 rounded-lg px-2 py-1">
                  <span className="text-lg">{b.icon}</span>
                  <span className="text-xs font-medium">{b.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No badges earned yet — keep learning!</p>
          )}
        </CardContent>
      </Card>

      {/* House */}
      {house && (
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <span className="text-3xl">{(house as any).mascotEmoji ?? (house as any).emoji ?? "🏠"}</span>
            <div>
              <p className="font-bold">{(house as any).house?.name ?? (house as any).name ?? "House"}</p>
              <p className="text-xs text-muted-foreground">{((house as any).house?.totalPoints ?? (house as any).points ?? 0).toLocaleString()} house points</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active quests */}
      {quests && quests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">🗺️ Active Quests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quests.map((q: any) => (
              <div key={q.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{q.title}</span>
                  <span className="text-muted-foreground">{q.progress}/{q.target}</span>
                </div>
                <Progress value={Math.round((q.progress / q.target) * 100)} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Create Reward Panel ─────────────────────────────────────────────────────

function CreateRewardPanel({ childId, childName }: { childId: number; childName: string }) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [xpCost, setXpCost] = useState("500");
  const [category, setCategory] = useState<"screen_time" | "outing" | "treat" | "custom">("custom");
  const [open, setOpen] = useState(false);

  const { data: existingRewards, isLoading: loadingRewards } = trpc.gamification.getRewards.useQuery();

  const createReward = trpc.gamification.createReward.useMutation({
    onSuccess: () => {
      toast.success(`Reward "${title}" created for ${childName}!`);
      setTitle("");
      setXpCost("500");
      setCategory("custom");
      setOpen(false);
      utils.gamification.getRewards.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const categoryEmoji: Record<string, string> = {
    screen_time: "📱",
    outing: "🎉",
    treat: "🍦",
    custom: "🎁",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <span>🎁</span> Rewards Marketplace
          </CardTitle>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setOpen(true)}>
            <Plus className="h-3 w-3" /> Add Reward
          </Button>
        </div>
        <CardDescription className="text-xs">
          Create real-world rewards that {childName} can redeem with their earned XP.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loadingRewards ? (
          <div className="h-12 rounded-lg bg-muted animate-pulse" />
        ) : !existingRewards || existingRewards.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No rewards set up yet.</p>
            <p className="text-xs mt-1">Add a reward to motivate {childName}!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {existingRewards.map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border p-3">
                <span className="text-xl">{categoryEmoji[r.category] ?? "🎁"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.rewardTitle}</p>
                  <p className="text-xs text-muted-foreground">{r.xpCost.toLocaleString()} XP</p>
                </div>
                <Badge variant="outline" className="text-xs capitalize">{r.category.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create reward dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add a Reward for {childName}</DialogTitle>
            <DialogDescription>
              Set a real-world reward that {childName} can redeem by spending their XP.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Reward Title *</Label>
              <Input
                placeholder="e.g. 30 min extra screen time"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="screen_time">📱 Screen Time</SelectItem>
                  <SelectItem value="outing">🎉 Outing / Activity</SelectItem>
                  <SelectItem value="treat">🍦 Treat / Snack</SelectItem>
                  <SelectItem value="custom">🎁 Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>XP Cost (50 – 50,000)</Label>
              <Input
                type="number"
                min={50}
                max={50000}
                placeholder="500"
                value={xpCost}
                onChange={(e) => setXpCost(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Higher XP = bigger reward. A typical lesson earns ~50–200 XP.</p>
            </div>
            <Button
              className="w-full"
              disabled={!title.trim() || createReward.isPending}
              onClick={() => createReward.mutate({ childUserId: childId, rewardTitle: title.trim(), xpCost: Number(xpCost), category })}
            >
              {createReward.isPending ? "Creating…" : "Create Reward"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Report Export Panel ──────────────────────────────────────────────────────

function ReportExportPanel({ childId, childName }: { childId: number; childName: string }) {
  const { data, isLoading } = trpc.parentTools.getReportData.useQuery({ childId });

  const downloadCSV = () => {
    if (!data) return;
    const rows = [
      ["Skill ID", "Unit", "Score", "Mastery Level"],
      ...data.unitSummaries.flatMap((u) =>
        u.skills.map((s) => [s.skillId, u.unitName, s.score.toString(), s.masteryLabel])
      ),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${childName.replace(/\s+/g, "_")}_EduChamp_Report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
  };

  const printReport = () => {
    window.print();
  };

  if (isLoading) return <div className="text-sm text-muted-foreground py-4 text-center">Loading report data…</div>;
  if (!data) return <div className="text-sm text-muted-foreground py-4 text-center">No data available.</div>;

  return (
    <div className="space-y-6">
      {/* Export buttons */}
      <div className="flex gap-3 flex-wrap">
        <Button variant="outline" className="gap-2" onClick={downloadCSV}>
          <Download className="h-4 w-4" />
          Download CSV
        </Button>
        <Button variant="outline" className="gap-2" onClick={printReport}>
          <FileText className="h-4 w-4" />
          Print / Save PDF
        </Button>
      </div>

      {/* Report preview */}
      <div id="report-print-area" className="space-y-4">
        <div className="border rounded-lg p-4 space-y-1">
          <h3 className="font-bold text-lg">{data.student.name}</h3>
          <p className="text-sm text-muted-foreground">
            Grade {data.student.grade ?? "—"}{data.student.school ? ` · ${data.student.school}` : ""}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className={`text-xs ${masteryColor(data.overallAverage)}`}>
              {data.overallMasteryLabel} · {data.overallAverage}%
            </Badge>
            {data.placementScore !== null && (
              <span className="text-xs text-muted-foreground">Placement: {data.placementScore}%</span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">Generated {new Date(data.generatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="text-center p-3">
            <div className="text-xl font-bold text-primary">{data.totalSkills}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Skills</div>
          </Card>
          <Card className="text-center p-3">
            <div className="text-xl font-bold text-emerald-600">{data.masteredSkills}</div>
            <div className="text-xs text-muted-foreground mt-1">Mastered</div>
          </Card>
          <Card className="text-center p-3">
            <div className="text-xl font-bold text-amber-600">{data.skillsNeedingWork}</div>
            <div className="text-xs text-muted-foreground mt-1">Need Work</div>
          </Card>
        </div>

        {/* Unit summaries */}
        {data.unitSummaries.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Unit Performance
            </h3>
            <div className="space-y-2">
              {data.unitSummaries.map((u) => (
                <div key={u.unitNumber} className="flex items-center gap-3">
                  <div className="w-6 text-xs text-muted-foreground text-right shrink-0">U{u.unitNumber}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs truncate">{u.unitName}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ml-2 shrink-0 ${masteryColor(u.averageScore)}`}>
                        {u.averageScore}%
                      </span>
                    </div>
                    <Progress value={u.averageScore} className="h-1.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quiz history */}
        {data.quizHistory.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" /> Quiz History
            </h3>
            <div className="space-y-1">
              {data.quizHistory.map((q, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{q.unitName} Quiz</span>
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold ${
                      q.percentage >= 75 ? "text-emerald-600" : q.percentage >= 60 ? "text-amber-600" : "text-red-600"
                    }`}>{q.percentage}%</span>
                    <span className="text-xs text-muted-foreground">{new Date(q.completedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Learning Insights Panel ──────────────────────────────────────────────────

function LearningInsightsPanel({ childId }: { childId: number }) {
  const { data, isLoading } = trpc.parentTools.learningInsights.useQuery({ childId });

  if (isLoading) return <div className="text-sm text-muted-foreground py-4 text-center">Loading insights…</div>;
  if (!data) return <div className="text-sm text-muted-foreground py-4 text-center">No data available yet.</div>;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="text-center p-3">
          <div className="text-2xl font-bold text-primary">{data.currentAverageMastery}%</div>
          <div className="text-xs text-muted-foreground mt-1">Avg Mastery</div>
        </Card>
        <Card className="text-center p-3">
          <div className={`text-2xl font-bold ${
            data.improvementRate === null ? "text-muted-foreground" :
            data.improvementRate >= 0 ? "text-emerald-600" : "text-red-600"
          }`}>
            {data.improvementRate === null ? "—" : `${data.improvementRate >= 0 ? "+" : ""}${data.improvementRate}%`}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Improvement</div>
        </Card>
        <Card className="text-center p-3">
          <div className="text-2xl font-bold text-amber-600">{data.totalQuizzesTaken}</div>
          <div className="text-xs text-muted-foreground mt-1">Quizzes Taken</div>
        </Card>
        <Card className="text-center p-3">
          <div className="text-2xl font-bold text-emerald-600">{data.masteredSkills}</div>
          <div className="text-xs text-muted-foreground mt-1">Skills Mastered</div>
        </Card>
      </div>

      {/* Improvement context */}
      {data.improvementRate !== null && (
        <div className={`rounded-lg border p-4 ${
          data.improvementRate >= 5 ? "bg-emerald-50 border-emerald-200" :
          data.improvementRate >= 0 ? "bg-blue-50 border-blue-200" :
          "bg-amber-50 border-amber-200"
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {data.improvementRate >= 5 ? (
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            ) : data.improvementRate >= 0 ? (
              <TrendingUp className="h-4 w-4 text-blue-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-amber-600" />
            )}
            <span className={`text-sm font-semibold ${
              data.improvementRate >= 5 ? "text-emerald-800" :
              data.improvementRate >= 0 ? "text-blue-800" : "text-amber-800"
            }`}>
              {data.improvementRate >= 5 ? "Strong improvement trend" :
               data.improvementRate >= 0 ? "Steady progress" :
               "Scores have declined recently"}
            </span>
          </div>
          <p className={`text-xs ${
            data.improvementRate >= 5 ? "text-emerald-700" :
            data.improvementRate >= 0 ? "text-blue-700" : "text-amber-700"
          }`}>
            Comparing recent quiz scores to earlier attempts: {data.improvementRate >= 0 ? "+" : ""}{data.improvementRate} percentage points.
          </p>
        </div>
      )}

      {/* Mastery by unit — Recharts bar chart */}
      {data.masteryTrend.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Mastery by Unit
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={data.masteryTrend.map((u) => ({ name: `U${u.unitNumber}`, score: u.averageScore, skills: u.skillCount }))}
              margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                formatter={(value: number, _name: string, props: any) => [
                  `${value}% (${props.payload.skills} skill${props.payload.skills !== 1 ? "s" : ""})`,
                  "Mastery",
                ]}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {data.masteryTrend.map((u) => (
                  <Cell
                    key={u.unitNumber}
                    fill={
                      u.averageScore >= 80
                        ? "hsl(142 71% 45%)"
                        : u.averageScore >= 60
                        ? "hsl(38 92% 50%)"
                        : "hsl(0 84% 60%)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 justify-center mt-2">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 inline-block" />≥80% Mastered</span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400 inline-block" />60–79% Developing</span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="h-2.5 w-2.5 rounded-sm bg-red-400 inline-block" />&lt;60% Needs Work</span>
          </div>
        </div>
      )}

      {/* Quiz score trend */}
      {data.quizTrend.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" /> Quiz Score History
          </h3>
          <div className="space-y-1">
            {data.quizTrend.map((q, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Unit {q.unitNumber} Quiz</span>
                <div className="flex items-center gap-3">
                  <div className="w-28 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        q.percentage >= 75 ? "bg-emerald-500" : q.percentage >= 60 ? "bg-amber-400" : "bg-red-400"
                      }`}
                      style={{ width: `${q.percentage}%` }}
                    />
                  </div>
                  <span className={`font-semibold w-10 text-right ${
                    q.percentage >= 75 ? "text-emerald-600" : q.percentage >= 60 ? "text-amber-600" : "text-red-600"
                  }`}>{q.percentage}%</span>
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    {new Date(q.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.quizTrend.length === 0 && data.masteryTrend.length === 0 && (
        <div className="text-center py-8">
          <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No quiz or mastery data yet. Insights will appear as the student completes quizzes.</p>
        </div>
      )}
    </div>
  );
}

// ─── Child Detail Panel ───────────────────────────────────────────────────────

// ─── Grade Override Inline Component ─────────────────────────────────

const GRADE_OPTIONS = [
  "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9",
  "Grade 10", "Grade 11", "Grade 12",
];

function GradeOverrideInline({ child }: { child: ChildSummary }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(child.grade ?? "");
  const utils = trpc.useUtils();
  const setGrade = trpc.parent.setChildGradeLevel.useMutation({
    onSuccess: (data) => {
      toast.success(`Grade updated to ${data.gradeLevel}`);
      utils.parent.listChildren.invalidate();
      setEditing(false);
    },
    onError: (err) => toast.error(err.message),
  });

  if (!editing) {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
        {child.email} · Grade {child.grade ?? "—"}
        {child.school ? ` · ${child.school}` : ""}
        <button
          className="text-primary underline text-xs ml-1 hover:no-underline"
          onClick={() => { setSelected(child.grade ?? ""); setEditing(true); }}
        >
          Change grade
        </button>
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="h-7 text-xs w-36">
          <SelectValue placeholder="Select grade" />
        </SelectTrigger>
        <SelectContent>
          {GRADE_OPTIONS.map((g) => (
            <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        className="h-7 px-2 text-xs"
        disabled={!selected || setGrade.isPending}
        onClick={() => setGrade.mutate({ childId: child.childId, gradeLevel: selected })}
      >
        {setGrade.isPending ? "Saving…" : "Save"}
      </Button>
      <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setEditing(false)}>Cancel</button>
    </div>
  );
}

function ResendSetupEmailButton({ childId, childName }: { childId: number; childName: string }) {
  const sendSetup = trpc.studentAuth.sendSetupEmail.useMutation({
    onSuccess: () => toast.success(`Setup email sent to ${childName}!`),
    onError: (err) => toast.error(err.message || "Failed to send setup email"),
  });
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => sendSetup.mutate({ childId })}
      disabled={sendSetup.isPending}
      className="gap-1.5"
    >
      {sendSetup.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
      {sendSetup.isPending ? "Sending..." : "Resend Setup Email"}
    </Button>
  );
}

function ChildDetailPanel({ child, onRemove }: { child: ChildSummary; onRemove: () => void }) {
  const [editOpen, setEditOpen] = useState(false);
  // Activity timeline filters
  const [activityDateRange, setActivityDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [activitySubject, setActivitySubject] = useState<"all" | string>("all");
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
            <GradeOverrideInline child={child} />
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground capitalize">{child.relationship}</span>
              {/* B4: On-track indicator based on diagnostic score */}
              {child.placement?.score !== undefined && child.placement.score !== null ? (
                <Badge
                  variant="outline"
                  className={`text-xs font-bold ${
                    child.placement.score >= 75
                      ? "bg-green-50 text-green-700 border-green-200"
                      : child.placement.score >= 60
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  {child.placement.score >= 75 ? "✓ On Track" : child.placement.score >= 60 ? "⚠ Needs Attention" : "✗ Check In"}
                  {" · "}{child.placement.score}%
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  No diagnostic yet
                </Badge>
              )}
              {child.overallMastery !== null && (
                <Badge variant="outline" className={`text-xs ${masteryColor(child.overallMastery)}`}>
                  {child.masteryLabel} · {child.overallMastery}%
                </Badge>
              )}
              {adaptivePathBadge(child.adaptivePath)}
              {/* Parent-Led Mode badge */}
              {child.parentLedMode && (
                <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200">
                  👨‍👧 Parent-Led
                </Badge>
              )}
              {/* Language Level badge — only shown when non-standard */}
              {child.languageLevel !== "standard" && (
                <Badge variant="outline" className={`text-xs ${
                  child.languageLevel === "simplified"
                    ? "bg-sky-50 text-sky-700 border-sky-200"
                    : "bg-purple-50 text-purple-700 border-purple-200"
                }`}>
                  {child.languageLevel === "simplified" ? "📖 Simplified" : "📖 Advanced"}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ResendSetupEmailButton childId={child.childId} childName={child.name ?? "Student"} />
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
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* Tabbed detail sections */}
      <Tabs defaultValue="courses">
        <TabsList className="w-full grid grid-cols-5 sm:grid-cols-10">
          <TabsTrigger value="courses" className="text-xs">Courses</TabsTrigger>
          <TabsTrigger value="requests" className="text-xs">Requests</TabsTrigger>
          <TabsTrigger value="progress" className="text-xs">Progress</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
          <TabsTrigger value="goals" className="text-xs">Goals</TabsTrigger>
          <TabsTrigger value="gaps" className="text-xs">Skill Gaps</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
          <TabsTrigger value="achievements" className="text-xs">🏆 Rewards</TabsTrigger>
          <TabsTrigger value="certificates" className="text-xs">🎓 Certs</TabsTrigger>
          <TabsTrigger value="report" className="text-xs">Export</TabsTrigger>
        </TabsList>

        {/* Courses tab — multi-course overview */}
        <TabsContent value="courses" className="mt-4">
          <ChildCoursesPanel childId={child.childId} childName={child.name ?? "Student"} />
        </TabsContent>

        {/* Course Requests tab */}
        <TabsContent value="requests" className="mt-4">
          <CourseRequestsPanel childId={child.childId} childName={child.name ?? "Student"} />
        </TabsContent>

        {/* Activity tab — inactivity visibility for parents */}
        <TabsContent value="activity" className="mt-4">
          <StudentActivityPanel childId={child.childId} childName={child.name ?? "Student"} />
        </TabsContent>

        {/* Progress tab */}
        <TabsContent value="progress" className="space-y-4 mt-4">
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

          {/* Recent Activity Feed — with date-range and subject filters */}
          {(child.recentQuizzes.length > 0 || child.unitMastery.some((u) => u.avgMastery !== null)) && (() => {
            // Build unified activity items
            const now = Date.now();
            const cutoffMs: Record<string, number> = {
              "7d": 7 * 86400000,
              "30d": 30 * 86400000,
              "90d": 90 * 86400000,
              "all": Infinity,
            };
            const cutoff = cutoffMs[activityDateRange] ?? Infinity;

            // Derive unique unit titles for the subject filter
            const unitTitles = Array.from(new Set(child.unitMastery.map((u) => u.title)));

            type ActivityItem =
              | { kind: "quiz"; unitNumber: number; unitTitle: string; score: number; date: Date }
              | { kind: "completion"; unitNumber: number; unitTitle: string; avgMastery: number };

            const quizItems: ActivityItem[] = child.recentQuizzes
              .filter((q) => {
                const age = now - new Date(q.completedAt).getTime();
                if (age > cutoff) return false;
                if (activitySubject !== "all") {
                  const unitTitle = child.unitMastery.find((u) => u.unitNumber === q.unitNumber)?.title ?? "";
                  if (!unitTitle.toLowerCase().includes(activitySubject.toLowerCase())) return false;
                }
                return true;
              })
              .map((q) => ({
                kind: "quiz" as const,
                unitNumber: q.unitNumber,
                unitTitle: child.unitMastery.find((u) => u.unitNumber === q.unitNumber)?.title ?? `Unit ${q.unitNumber}`,
                score: q.score,
                date: new Date(q.completedAt),
              }));

            const completionItems: ActivityItem[] = child.unitMastery
              .filter((u) => {
                if (u.status !== "completed" || u.avgMastery === null) return false;
                if (activitySubject !== "all" && !u.title.toLowerCase().includes(activitySubject.toLowerCase())) return false;
                return true;
              })
              .slice(0, 5)
              .map((u) => ({
                kind: "completion" as const,
                unitNumber: u.unitNumber,
                unitTitle: u.title,
                avgMastery: u.avgMastery!,
              }));

            const allItems = [...quizItems, ...completionItems];

            return (
              <div>
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" /> Recent Activity
                  </h3>
                  <div className="flex items-center gap-2">
                    {/* Date range filter */}
                    <Select value={activityDateRange} onValueChange={(v) => setActivityDateRange(v as typeof activityDateRange)}>
                      <SelectTrigger className="h-7 text-xs w-[110px]" aria-label="Date range filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Subject/unit filter */}
                    <Select value={activitySubject} onValueChange={setActivitySubject}>
                      <SelectTrigger className="h-7 text-xs w-[130px]" aria-label="Subject filter">
                        <SelectValue placeholder="All subjects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All subjects</SelectItem>
                        {unitTitles.map((title) => (
                          <SelectItem key={title} value={title}>{title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {allItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No activity in this period.</p>
                ) : (
                  <div className="relative pl-5 space-y-3">
                    <div className="absolute left-1.5 top-1 bottom-1 w-px bg-border" aria-hidden="true" />
                    {(quizItems as Extract<ActivityItem, { kind: "quiz" }>[]).map((q, i) => (
                      <div key={`quiz-${i}`} className="relative flex items-start gap-3">
                        <div className={`absolute -left-[13px] h-3 w-3 rounded-full border-2 border-background mt-0.5 ${
                          q.score >= 75 ? "bg-emerald-500" : q.score >= 60 ? "bg-amber-400" : "bg-red-400"
                        }`} aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-foreground truncate">{q.unitTitle} — Quiz</span>
                            <span className={`text-xs font-bold tabular-nums shrink-0 ${
                              q.score >= 75 ? "text-emerald-600" : q.score >= 60 ? "text-amber-600" : "text-red-600"
                            }`}>{q.score}%</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{q.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      </div>
                    ))}
                    {(completionItems as Extract<ActivityItem, { kind: "completion" }>[]).map((u) => (
                      <div key={`comp-${u.unitNumber}`} className="relative flex items-start gap-3">
                        <div className="absolute -left-[13px] h-3 w-3 rounded-full border-2 border-background bg-primary mt-0.5" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-foreground truncate">{u.unitTitle} — Completed</span>
                            <span className={`text-xs font-bold tabular-nums shrink-0 ${u.avgMastery >= 75 ? "text-emerald-600" : u.avgMastery >= 60 ? "text-amber-600" : "text-red-600"}`}>{u.avgMastery}%</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">Unit {u.unitNumber}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* AI Tutor Parent Summary link */}
          <div className="pt-2">
            <Link href={`/tutor?childId=${child.childId}&mode=parent_summary`}>
              <Button className="w-full" variant="outline">
                <Brain className="h-4 w-4 mr-2" />
                Open AI Parent Summary for {child.name}
              </Button>
            </Link>
          </div>

          {/* Co-Parent Management */}
          <Separator className="my-2" />
          <CoParentPanel studentId={child.childId} studentName={child.name ?? "this student"} />
        </TabsContent>

        {/* Goals & Notes tab */}
        <TabsContent value="goals" className="mt-4">
          <GoalsNotesPanel childId={child.childId} />
        </TabsContent>

        {/* Skill Gap tab */}
        <TabsContent value="gaps" className="mt-4">
          <SkillGapPanel childId={child.childId} />
        </TabsContent>

        {/* Learning Insights tab */}
        <TabsContent value="insights" className="mt-4">
          <LearningInsightsPanel childId={child.childId} />
        </TabsContent>

        {/* Achievements & Rewards tab */}
        <TabsContent value="achievements" className="mt-4">
          <div className="space-y-6">
            <ChildAchievementsPanel childId={child.childId} childName={child.name ?? "Student"} />
            <CreateRewardPanel childId={child.childId} childName={child.name ?? "Student"} />
          </div>
        </TabsContent>

        {/* Certificates tab */}
        <TabsContent value="certificates" className="mt-4">
          <ChildCertificatesPanel childId={child.childId} childName={child.name ?? "Student"} />
        </TabsContent>
        {/* Export tab */}
        <TabsContent value="report" className="mt-4">
          <ReportExportPanel childId={child.childId} childName={child.name ?? "Student"} />
        </TabsContent>
      </Tabs>

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

// ─── Invite Co-Parent Modal ──────────────────────────────────────────────────

function InviteCoParentModal({
  open, onClose, studentId, studentName, onSuccess,
}: { open: boolean; onClose: () => void; studentId: number; studentName: string; onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<"co-parent" | "guardian" | "grandparent" | "aunt/uncle" | "other">("guardian");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const inviteMutation = trpc.coParent.inviteCoParent.useMutation({
    onSuccess: (data) => {
      setInviteUrl(data.inviteUrl);
      onSuccess();
      toast.success("Invitation created! Share the link with the co-parent.");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleClose = () => { setEmail(""); setName(""); setInviteUrl(null); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Invite a Co-Parent or Guardian
          </DialogTitle>
          <DialogDescription>
            Give another adult view-only access to {studentName}'s progress dashboard.
          </DialogDescription>
        </DialogHeader>

        {inviteUrl ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-800">Invitation created!</p>
              <p className="text-xs text-emerald-700">Share this link with the co-parent. It expires in 7 days.</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs font-mono break-all text-foreground select-all">{inviteUrl}</p>
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success("Link copied!"); }}
            >
              Copy Invite Link
            </Button>
            <Button className="w-full" onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cp-email">Email Address *</Label>
              <Input id="cp-email" type="email" placeholder="guardian@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-name">Their Name (optional)</Label>
              <Input id="cp-name" placeholder="e.g. Jane Smith" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Relationship to Student</Label>
              <Select value={relationship} onValueChange={(v) => setRelationship(v as typeof relationship)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="co-parent">Co-Parent</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                  <SelectItem value="grandparent">Grandparent</SelectItem>
                  <SelectItem value="aunt/uncle">Aunt / Uncle</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              The co-parent will receive a link to accept the invitation. They must sign in with a <strong>non-student</strong> account.
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => inviteMutation.mutate({ studentId, inviteeEmail: email, inviteeName: name || undefined, relationship, origin: window.location.origin })}
              disabled={!email || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? "Sending…" : "Generate Invite Link"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Co-Parent Panel (per child) ─────────────────────────────────────────────

function CoParentPanel({ studentId, studentName }: { studentId: number; studentName: string }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.coParent.listCoParents.useQuery({ studentId });

  const revokeAccess = trpc.coParent.revokeAccess.useMutation({
    onSuccess: () => { toast.success("Access revoked."); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const cancelInvitation = trpc.coParent.cancelInvitation.useMutation({
    onSuccess: () => { toast.success("Invitation cancelled."); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground py-4">Loading co-parents…</div>;

  const active = data?.active ?? [];
  const pending = data?.pending ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Co-Parents & Guardians
        </h3>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setInviteOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Invite
        </Button>
      </div>

      {active.length === 0 && pending.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-3">
          No co-parents added yet. Invite another adult to share view access.
        </p>
      )}

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Access</p>
          {active.map((cp) => (
            <div key={cp.accessId} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                  {(cp.coParentName ?? cp.coParentEmail ?? "?")[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">{cp.coParentName ?? cp.coParentEmail}</div>
                  <div className="text-xs text-muted-foreground capitalize">{cp.relationship} · Since {new Date(cp.grantedAt).toLocaleDateString()}</div>
                </div>
              </div>
              <Button
                size="sm" variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                onClick={() => { if (confirm(`Revoke ${cp.coParentName ?? cp.coParentEmail}'s access?`)) revokeAccess.mutate({ accessId: cp.accessId }); }}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Revoke
              </Button>
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Invitations</p>
          {pending.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <div className="text-sm font-medium">{inv.inviteeEmail}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {inv.relationship} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <Button
                size="sm" variant="ghost"
                className="text-muted-foreground hover:text-destructive text-xs"
                onClick={() => cancelInvitation.mutate({ invitationId: inv.id })}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
            </div>
          ))}
        </div>
      )}

      <InviteCoParentModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        studentId={studentId}
        studentName={studentName}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

// ─── Main Parent Dashboard ────────────────────────────────────────────────────

export default function ParentDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  // useLocation is available for future navigation needs
  const [, navigate] = useLocation();
  const [enrolOpen, setEnrolOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);
  const [showPendingRequests, setShowPendingRequests] = useState(false);
  const utils = trpc.useUtils();

  // Read ?pendingInvite= from URL (deep-link from email for existing parents)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("pendingInvite");
    if (token) {
      setPendingInviteToken(token);
      setShowPendingRequests(true);
      // Clean the URL without reloading
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  const { data: children, isLoading: childrenLoading } = trpc.parent.listChildren.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: pendingInvites, isLoading: pendingLoading, refetch: refetchPending } =
    trpc.onboarding.getPendingInvitesForMe.useQuery(undefined, {
      enabled: isAuthenticated,
      refetchInterval: 30_000, // poll every 30s
    });

  const acceptInvite = trpc.onboarding.acceptParentInvite.useMutation({
    onSuccess: (data) => {
      toast.success("Student request accepted! They have been linked to your account.");
      utils.parent.listChildren.invalidate();
      refetchPending();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectInvite = trpc.onboarding.rejectParentInvite.useMutation({
    onSuccess: () => {
      toast.success("Request declined.");
      refetchPending();
    },
    onError: (err) => toast.error(err.message),
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
            Monitor your children's progress, mastery levels, and learning paths across all enrolled courses.
          </p>
        </div>
        <Button onClick={() => setEnrolOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Enrol a Student
        </Button>
      </div>

      {/* ── Pending Student Enrollment Requests banner ── */}
      {pendingInvites && pendingInvites.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-base text-amber-900 dark:text-amber-200">
                    Pending Student Enrollment Requests
                  </CardTitle>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                    {pendingInvites.length} student{pendingInvites.length !== 1 ? "s have" : " has"} invited you to monitor their learning journey.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-700 dark:text-amber-400 hover:bg-amber-100"
                onClick={() => setShowPendingRequests((v) => !v)}
              >
                {showPendingRequests ? "Hide" : "Review Requests"}
              </Button>
            </div>
          </CardHeader>

          {showPendingRequests && (
            <CardContent className="pt-0 space-y-3">
              {pendingInvites.map((inv) => (
                <div
                  key={inv.token}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800 p-4 flex flex-col sm:flex-row sm:items-start gap-4"
                >
                  {/* Student avatar */}
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base">{inv.studentName}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {inv.studentGrade && (
                        <Badge variant="secondary" className="text-xs">{inv.studentGrade}</Badge>
                      )}
                      {inv.courseName && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <BookOpen className="h-3 w-3" />{inv.courseName}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Invitation received {new Date(inv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {" · "}
                      Expires {new Date(inv.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>

                    {/* What happens when you accept */}
                    <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5" /> What happens when you accept?
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 pl-1">
                        <li>{inv.studentName} will be linked to your Parent Dashboard</li>
                        <li>You'll be able to monitor their progress, quiz results, and mastery scores</li>
                        <li>You'll receive notifications on their learning milestones</li>
                        <li>You can set goals and review AI-generated progress summaries</li>
                      </ul>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={acceptInvite.isPending}
                      onClick={() => {
                        if (pendingInviteToken === inv.token || true) {
                          acceptInvite.mutate({ token: inv.token });
                        }
                      }}
                    >
                      {acceptInvite.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCheck className="h-3.5 w-3.5" />
                      )}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                      disabled={rejectInvite.isPending}
                      onClick={() => rejectInvite.mutate({ token: inv.token })}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Deep-linked single invite (token in URL, not yet in pending list) ── */}
      {pendingInviteToken && (!pendingInvites || !pendingInvites.find((i) => i.token === pendingInviteToken)) && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="py-4 flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              You followed a student invitation link. If the request doesn't appear above, it may have already been processed or the link has expired.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Student account hard block */}
      {user?.accountType === "student" && (
        <Card className="border-red-200 bg-red-50 text-center py-12">
          <CardContent className="space-y-4">
            <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-red-900">Student Account Detected</h3>
              <p className="text-sm text-red-700 mt-1 max-w-sm mx-auto">
                Your account is registered as a <strong>student</strong>. A student account cannot also be a parent account on EduChamp.
                Please sign in with a separate parent or guardian account to access this dashboard.
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">Back to Student Dashboard</Button>
            </Link>
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
                Enrol your children to monitor their progress, mastery scores, quiz results, and adaptive learning path across all courses.
              </p>
            </div>
            <Button onClick={() => setEnrolOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Enrol Your First Student
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cross-course summary table */}
      {children && children.filter(Boolean).length > 1 && (
        <CrossCourseSummaryTable children={children.filter((c): c is NonNullable<typeof c> => c !== null)} />
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

                  {/* Personalization badges */}
                  {(child.parentLedMode || child.languageLevel !== "standard") && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {child.parentLedMode && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200">
                          👨‍👧 Parent-Led
                        </span>
                      )}
                      {child.languageLevel !== "standard" && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                          child.languageLevel === "simplified"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}>
                          {child.languageLevel === "simplified" ? "📖 Simplified" : "📖 Advanced"}
                        </span>
                      )}
                    </div>
                  )}
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

      {/* Co-Parent View: students I have view access to (not enrolled by me) */}
      <CoParentStudentsSection />

      {/* Enrol modal */}
      <EnrolChildModal
        open={enrolOpen}
        onClose={() => setEnrolOpen(false)}
        onSuccess={() => utils.parent.listChildren.invalidate()}
      />
    </div>
  );
}

// ─── Co-Parent Students Section ────────────────────────────────────────────────

function CoParentStudentsSection() {
  const { isAuthenticated } = useAuth();
  const { data: coParentStudents, isLoading } = trpc.coParent.myStudents.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  if (isLoading || !coParentStudents || coParentStudents.length === 0) return null;

  const selectedStudent = coParentStudents.find((s) => s.studentId === selectedStudentId) ?? null;

  return (
    <div className="space-y-4">
      <Separator />
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Students I Monitor
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Students whose progress you have view access to as a co-parent or guardian.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          {coParentStudents.map((s) => {
            const isSelected = selectedStudentId === s.studentId;
            return (
              <button
                key={s.studentId}
                onClick={() => setSelectedStudentId(isSelected ? null : s.studentId)}
                className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
                  isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  }`}>
                    {(s.studentName ?? "S")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{s.studentName ?? "Student"}</div>
                    <div className="text-xs text-muted-foreground capitalize">{s.relationship} · Grade {s.studentGrade ?? "—"}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-2">
          {selectedStudent ? (
            <CoParentStudentDetail studentId={selectedStudent.studentId} studentName={selectedStudent.studentName ?? "Student"} />
          ) : (
            <Card className="flex items-center justify-center min-h-[300px] text-center">
              <CardContent className="space-y-3">
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <ChevronRight className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Select a student</h3>
                  <p className="text-sm text-muted-foreground mt-1">Click a student to view their progress.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CoParentStudentDetail({ studentId, studentName }: { studentId: number; studentName: string }) {
  const { data, isLoading } = trpc.coParent.getStudentProgress.useQuery({ studentId });

  if (isLoading) return (
    <Card className="p-6 flex items-center justify-center min-h-[300px]">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </Card>
  );

  if (!data) return (
    <Card className="p-6 text-center text-muted-foreground">
      No progress data available yet.
    </Card>
  );

  // Compute aggregated stats from raw DB rows
  const rawData = data as unknown as {
    mastery: { skillId: string; score: number }[];
    progress: { unitNumber: number; status: string; quizScore: number | null; completedAt: Date | null }[];
    quizHistory: { unitNumber: number; score: number; completedAt: Date }[];
    diagnostic: { score: number; recommendation: string | null; completedAt: Date } | null;
  };

  const scores = rawData.mastery.map((m) => m.score);
  const overallMastery = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const masteryLabel = overallMastery === null ? null
    : overallMastery >= 100 ? "Advanced"
    : overallMastery >= 90 ? "Mastered"
    : overallMastery >= 75 ? "Approaching"
    : overallMastery >= 60 ? "Developing"
    : "Beginner";
  const completedUnits = rawData.progress.filter((p) => p.status === "completed").length;

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
          {studentName[0].toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold">{studentName}</h2>
          {overallMastery !== null && (
            <Badge variant="outline" className={`text-xs ${masteryColor(overallMastery)}`}>
              {masteryLabel} · {overallMastery}%
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-primary">{completedUnits}</div>
          <div className="text-xs text-muted-foreground mt-1">Units Completed</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-emerald-600">{overallMastery ?? "—"}{overallMastery !== null ? "%" : ""}</div>
          <div className="text-xs text-muted-foreground mt-1">Overall Mastery</div>
        </Card>
      </div>

      {rawData.diagnostic && (
        <Card className="border-l-4 border-l-primary bg-primary/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Placement Assessment</span>
              <span className="text-xs text-muted-foreground ml-auto">{new Date(rawData.diagnostic.completedAt).toLocaleDateString()}</span>
            </div>
            <div className="text-2xl font-bold text-primary mb-1">{rawData.diagnostic.score}%</div>
            {rawData.diagnostic.recommendation && (
              <p className="text-sm text-muted-foreground">{rawData.diagnostic.recommendation}</p>
            )}
          </CardContent>
        </Card>
      )}

      {rawData.progress.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Unit Progress
          </h3>
          <div className="space-y-2">
            {rawData.progress.map((u) => (
              <div key={u.unitNumber} className="flex items-center gap-3">
                <div className="w-6 text-xs text-muted-foreground text-right shrink-0">U{u.unitNumber}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs capitalize text-muted-foreground">{u.status}</span>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      {statusIcon(u.status)}
                      {u.quizScore !== null && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${masteryColor(u.quizScore)}`}>{u.quizScore}%</span>
                      )}
                    </div>
                  </div>
                  <Progress value={u.quizScore ?? 0} className="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2">
        <Link href={`/tutor?childId=${studentId}&mode=parent_summary`}>
          <Button className="w-full" variant="outline">
            <Brain className="h-4 w-4 mr-2" />
            Open AI Parent Summary for {studentName}
          </Button>
        </Link>
      </div>
    </Card>
  );
}

// ─── Student Activity Panel ───────────────────────────────────────────────────

function StudentActivityPanel({ childId, childName }: { childId: number; childName: string }) {
  const { data: history, isLoading } = trpc.admin.getStudentInactivityHistory.useQuery(
    { userId: childId },
    { retry: false }
  );

  const tierColors: Record<string, string> = {
    "7day": "bg-amber-100 text-amber-800 border-amber-200",
    "14day": "bg-orange-100 text-orange-800 border-orange-200",
    "30day": "bg-red-100 text-red-800 border-red-200",
    "manual": "bg-blue-100 text-blue-800 border-blue-200",
  };

  const tierLabels: Record<string, string> = {
    "7day": "7-Day Reminder",
    "14day": "14-Day Follow-up",
    "30day": "30-Day Escalation",
    "manual": "Manual Notification",
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1">Activity Notifications</h3>
        <p className="text-xs text-muted-foreground">
          Automated re-engagement notifications sent to {childName} and linked guardians.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : !history || history.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700">Great engagement!</p>
            <p className="text-xs text-muted-foreground mt-1">
              No inactivity notifications have been sent for {childName}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(history as any[]).map((h: any) => (
            <div
              key={h.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <Badge className={`text-xs ${tierColors[h.notificationType] ?? "bg-gray-100 text-gray-600"}`}>
                  {tierLabels[h.notificationType] ?? h.notificationType}
                </Badge>
                <div>
                  <p className="text-xs font-medium capitalize">{h.recipientType} notified</p>
                  <p className="text-xs text-muted-foreground font-mono">{h.recipientEmail}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {h.inactiveDays} days inactive
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(h.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground pt-2">
        Notifications are sent automatically when a student has not logged in for 7, 14, or 30 days.
        Contact support if you believe a notification was sent in error.
      </p>
    </div>
  );
}
