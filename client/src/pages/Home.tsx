import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { GuidedTour } from "@/components/GuidedTour";
import { SeasonalChallengeBanner } from "@/components/SeasonalChallengeBanner";
import CourseSwitcher from "@/components/CourseSwitcher";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  GraduationCap,
  Lock,
  Mail,
  PlayCircle,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Bell,
  BookMarked,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";


// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMasteryColor(score: number): string {
  if (score < 60) return "text-red-500";
  if (score < 75) return "text-orange-500";
  if (score < 90) return "text-yellow-600";
  if (score < 100) return "text-green-600";
  return "text-blue-600";
}

function getMasteryLabel(score: number): string {
  if (score < 60) return "Beginner";
  if (score < 75) return "Developing";
  if (score < 90) return "Approaching";
  if (score < 100) return "Mastered";
  return "Advanced";
}

function getMasteryBadgeClass(score: number): string {
  if (score < 60) return "mastery-beginner";
  if (score < 75) return "mastery-developing";
  if (score < 90) return "mastery-approaching";
  if (score < 100) return "mastery-mastered";
  return "mastery-advanced";
}

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Mathematics": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "English Language Arts": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "Science": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  "Social Studies": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "World Languages": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  "Test Preparation": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  "Business": { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
};

function subjectColor(subject?: string | null) {
  return SUBJECT_COLORS[subject ?? ""] ?? { bg: "bg-muted/40", text: "text-muted-foreground", border: "border-muted" };
}

// ─── Course Progress Card ─────────────────────────────────────────────────────

interface CourseCardProps {
  courseId: number;
  courseTitle: string;
  subject?: string | null;
  gradeLevel?: string | null;
  isCurrent: boolean;
  totalUnits: number;
  completedUnits: number;
  inProgressUnits: number;
  progressPercent: number;
  activeUnitTitle?: string | null;
  activeUnitNumber?: number | null;
  lastActivityAt?: Date | null;
  onSwitch: (courseId: number) => void;
  onOpen: (courseId: number) => void;
  isSwitching: boolean;
}

function CourseCard({
  courseId, courseTitle, subject, gradeLevel, isCurrent,
  totalUnits, completedUnits, progressPercent,
  activeUnitTitle, activeUnitNumber,
  lastActivityAt, onSwitch, onOpen, isSwitching,
}: CourseCardProps) {
  const colors = subjectColor(subject);

  return (
    <Card className={`border transition-all duration-200 ${isCurrent ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {isCurrent && (
                <Badge className="text-xs bg-primary text-primary-foreground">Active</Badge>
              )}
              {gradeLevel && (
                <Badge variant="outline" className="text-xs">{gradeLevel === "AP" ? "AP / Advanced" : gradeLevel === "Kindergarten" ? "Kindergarten" : gradeLevel === "Pre-K" ? "Pre-K" : `Grade ${gradeLevel}`}</Badge>
              )}
              {subject && (
                <Badge className={`text-xs border ${colors.bg} ${colors.text} ${colors.border}`}>
                  {subject}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-sm leading-tight text-foreground">{courseTitle}</h3>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedUnits}/{totalUnits} units complete</span>
            <span className="font-medium text-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        {/* Active unit */}
        {activeUnitTitle && (
          <p className="text-xs text-muted-foreground truncate">
            <span className="text-foreground font-medium">Unit {activeUnitNumber}:</span> {activeUnitTitle}
          </p>
        )}

        {/* Last activity */}
        {lastActivityAt && (
          <p className="text-xs text-muted-foreground">
            Last studied: {new Date(lastActivityAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {isCurrent ? (
            <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => onOpen(courseId)}>
              Continue <ArrowRight className="h-3 w-3" />
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs gap-1"
                onClick={() => onSwitch(courseId)}
                disabled={isSwitching}
              >
                {isSwitching ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Switch
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 flex-1" onClick={() => onOpen(courseId)}>
                View <ChevronRight className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty Enrollment State ───────────────────────────────────────────────────

function EmptyEnrollmentState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <Card className="border-2 border-dashed border-primary/30 bg-primary/3 shadow-none">
      <CardContent className="p-8 text-center space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-lg">Welcome to EduChamp!</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Browse the course catalogue to enrol in your first course. You can take multiple courses at the same time and switch between them anytime.
          </p>
        </div>
        <Button onClick={onBrowse} className="gap-2 px-6">
          <Plus className="h-4 w-4" />
          Browse &amp; Enrol in Courses
        </Button>
        <p className="text-xs text-muted-foreground">
          70+ courses available: Pre-K through Grade 12, AP, and SAT Prep
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Parent Invite Status Banner ─────────────────────────────────────────────

function ParentInviteBanner() {
  const { data: invites, refetch } = trpc.onboarding.getMyParentInviteStatus.useQuery(undefined, {
    refetchInterval: 30_000, // poll every 30s for real-time status updates
  });
  const utils = trpc.useUtils();
  const resend = trpc.onboarding.resendParentInvite.useMutation({
    onSuccess: () => {
      toast.success("Invitation resent! A fresh email has been sent to your parent/guardian.");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Only show banner for the most recent invite
  const latest = useMemo(() => {
    if (!invites || invites.length === 0) return null;
    return invites[0];
  }, [invites]);

  if (!latest) return null;

  const isExpired = latest.status === "pending" && new Date(latest.expiresAt) < new Date();
  const effectiveStatus = isExpired ? "expired" : latest.status;
  const sentAt = new Date(latest.createdAt);
  const hoursSinceSent = (Date.now() - sentAt.getTime()) / 3_600_000;
  const canResend = (effectiveStatus === "pending" && hoursSinceSent >= 24) || effectiveStatus === "expired";

  const statusConfig = {
    pending: {
      bg: "bg-amber-50 border-amber-200",
      icon: <Clock className="h-5 w-5 text-amber-500 shrink-0" />,
      title: "Parent Invitation Pending",
      desc: `Your invitation to ${latest.parentEmail ?? "your parent/guardian"} is awaiting their response.`,
      badge: <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending</span>,
    },
    accepted: {
      bg: "bg-green-50 border-green-200",
      icon: <UserCheck className="h-5 w-5 text-green-500 shrink-0" />,
      title: "Parent Account Linked!",
      desc: `${latest.parentName ?? "Your parent/guardian"} has accepted your invitation and is now monitoring your learning journey.`,
      badge: <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Accepted</span>,
    },
    rejected: {
      bg: "bg-red-50 border-red-200",
      icon: <XCircle className="h-5 w-5 text-red-500 shrink-0" />,
      title: "Invitation Declined",
      desc: `${latest.parentName ?? "Your parent/guardian"} declined the invitation. You can send a new invite to a different email address from your profile.`,
      badge: <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Declined</span>,
    },
    expired: {
      bg: "bg-slate-50 border-slate-200",
      icon: <AlertCircle className="h-5 w-5 text-slate-400 shrink-0" />,
      title: "Invitation Expired",
      desc: `Your invitation to ${latest.parentEmail ?? "your parent/guardian"} has expired. Send a new one to continue.`,
      badge: <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Expired</span>,
    },
    revoked: {
      bg: "bg-slate-50 border-slate-200",
      icon: <AlertCircle className="h-5 w-5 text-slate-400 shrink-0" />,
      title: "Invitation Cancelled",
      desc: "This invitation was cancelled. You can send a new one from the onboarding flow.",
      badge: <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Cancelled</span>,
    },
  } as const;

  const cfg = statusConfig[effectiveStatus as keyof typeof statusConfig] ?? statusConfig.pending;

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${cfg.bg}`}>
      {cfg.icon}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground">{cfg.title}</p>
          {cfg.badge}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{cfg.desc}</p>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Mail className="h-3 w-3" />
            Sent {sentAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {latest.resendCount > 0 && ` · Resent ${latest.resendCount}×`}
          </span>
          {canResend && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
              disabled={resend.isPending}
              onClick={() => resend.mutate({ oldToken: latest.token, origin: window.location.origin })}
            >
              <Send className="h-3 w-3" />
              {resend.isPending ? "Sending…" : "Resend Invite"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Notification Bell ──────────────────────────────────────────────────────

function NotificationBell() {
  const { data } = trpc.notifications.getMyNotifications.useQuery(
    { limit: 20, onlyUnread: false },
    { refetchInterval: 60_000 }
  );
  const utils = trpc.useUtils();
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.getMyNotifications.invalidate(),
  });
  const unread = data?.unreadCount ?? 0;
  if (!data || data.notifications.length === 0) return null;
  return (
    <div className="relative group">
      <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => markAllRead.mutate()}>
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>
      <div className="absolute right-0 top-10 w-80 bg-popover border border-border rounded-xl shadow-lg z-50 hidden group-focus-within:block">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && <button className="text-xs text-primary hover:underline" onClick={() => markAllRead.mutate()}>Mark all read</button>}
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-border">
          {data.notifications.map((n) => (
            <div key={n.id} className={`p-3 text-sm ${!n.isRead ? "bg-primary/5" : ""}`}>
              <p className="font-medium text-foreground">{n.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


const BANNER_DISMISSED_KEY = "educhamp_auto_enroll_dismissed";

function AutoEnrollBanner({ courseTitle }: { courseTitle: string }) {
  const [, setLocation] = useLocation();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(BANNER_DISMISSED_KEY);
    if (!dismissed) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => {
      sessionStorage.setItem(BANNER_DISMISSED_KEY, "1");
      setMounted(false);
    }, 300);
  };

  if (!mounted) return null;

  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-out"
      style={{
        maxHeight: visible ? "120px" : "0px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-8px)",
      }}
    >
      <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/8 to-primary/4 px-4 py-3 text-sm">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 shrink-0 mt-0.5">
          <GraduationCap className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground leading-tight">
            You've been enrolled in{" "}
            <span className="text-primary">{courseTitle}</span>
          </p>
          <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
            We matched you to this course based on your grade level. Take the placement test to find your exact starting point.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="h-7 px-3 text-xs font-medium gap-1.5"
            onClick={() => setLocation("/course-welcome")}
          >
            <Target className="h-3 w-3" />
            Take Placement Test
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Dismiss"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [courseSwitcherOpen, setCourseSwitcherOpen] = useState(false);

  const { data: dashboard, isLoading } = trpc.progress.getDashboard.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: allCourseProgress, isLoading: isLoadingCourses } = trpc.progress.getAllCourseProgress.useQuery(undefined, {
    enabled: !!user,
  });
  const activeCourseId = dashboard?.activeCourseId;
  const { data: diagnostic } = trpc.diagnostic.getLatestAttempt.useQuery(
    activeCourseId ? { courseId: activeCourseId } : undefined,
    { enabled: !!user && activeCourseId !== undefined }
  );
  // Use server-computed flag for whether this course has a diagnostic
  const hasDiagnosticForActiveCourse = dashboard?.hasDiagnosticForActiveCourse ?? false;

  const utils = trpc.useUtils();
  const setActiveCourse = trpc.admin.setActiveCourse.useMutation({
    onSuccess: () => {
      utils.progress.getDashboard.invalidate();
      utils.progress.getAllCourseProgress.invalidate();
    },
  });

  const firstName = user?.name?.split(" ")[0] ?? "Student";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const activeUnit = dashboard?.units.find((u) => u.status === "in_progress" || u.status === "quiz_unlocked");
  const enrolledCount = allCourseProgress?.length ?? 0;

  function handleSwitchCourse(courseId: number) {
    setActiveCourse.mutate({ courseId });
  }

  function handleOpenCourse(courseId: number) {
    if (courseId !== dashboard?.activeCourseId) {
      // Switching to a different course — wait for the switch, then check diagnostic
      setActiveCourse.mutate({ courseId }, {
        onSuccess: async () => {
          // Re-fetch dashboard to get hasDiagnosticForActiveCourse for the new course
          const freshDashboard = await utils.progress.getDashboard.fetch();
          if (!freshDashboard?.hasDiagnosticForActiveCourse) {
            setLocation("/course-welcome");
          } else {
            setLocation("/curriculum");
          }
        },
      });
    } else {
      // Already on this course — check if diagnostic has been taken
      if (!hasDiagnosticForActiveCourse) {
        setLocation("/course-welcome");
      } else {
        setLocation("/curriculum");
      }
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 page-enter max-w-6xl">
        {/* Header skeleton */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>

        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>

        {/* Main content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: unit grid */}
          <div className="lg:col-span-2 rounded-xl border bg-card p-5 space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
          {/* Right: next steps */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <Skeleton className="h-5 w-28" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
            <Skeleton className="h-9 w-full rounded-lg mt-2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 page-enter max-w-6xl">
      {/* Guided tour — shown once on first login */}
      <GuidedTour accountType={user?.accountType ?? "student"} />

      {/* Course Switcher / Catalogue dialog */}
      <CourseSwitcher open={courseSwitcherOpen} onClose={() => {
        setCourseSwitcherOpen(false);
        utils.progress.getAllCourseProgress.invalidate();
        utils.progress.getDashboard.invalidate();
      }} />

      {/* Parent invite status banner — shown to students who have sent a parent invite */}
      {user?.accountType === "student" && <ParentInviteBanner />}

      {/* Auto-enrollment banner — shown once on first login when student was auto-enrolled */}
      {dashboard?.wasAutoEnrolled && <AutoEnrollBanner courseTitle={dashboard.courseTitle ?? "your course"} />}

      {/* Seasonal challenge banner — shown when an active challenge exists */}
      <SeasonalChallengeBanner />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {dashboard?.courseTitle ?? "EduChamp"} ·{" "}
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          {!hasDiagnosticForActiveCourse && enrolledCount > 0 && (
            <p className="text-xs text-amber-600 font-medium mt-0.5 flex items-center gap-1">
              <ClipboardList className="h-3 w-3" /> Take the placement test to start {dashboard?.courseTitle ?? "this course"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!hasDiagnosticForActiveCourse && enrolledCount > 0 && (
            <Button
              onClick={() => setLocation("/course-welcome")}
              variant="outline"
              className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
            >
              <ClipboardList className="h-4 w-4" />
              Take Placement Test
            </Button>
          )}
          {enrolledCount > 0 && (
            <Button
              onClick={() => setLocation("/curriculum")}
              variant="default"
              size="sm"
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              My Curriculum
            </Button>
          )}
          <NotificationBell />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{dashboard?.overallMastery ?? 0}%</p>
                <p className="text-xs text-muted-foreground">Overall Mastery</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{dashboard?.completedUnits ?? 0}</p>
                <p className="text-xs text-muted-foreground">Units Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <BookMarked className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{enrolledCount}</p>
                <p className="text-xs text-muted-foreground">Enrolled Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{dashboard?.mastery.filter((m) => m.score >= 90).length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Skills Mastered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: My Courses + Continue Learning */}
        <div className="lg:col-span-2 space-y-6">

          {/* My Courses — multi-course grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">My Courses</h2>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={() => setCourseSwitcherOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Course
              </Button>
            </div>

            {isLoadingCourses ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
              </div>
            ) : enrolledCount === 0 ? (
              <EmptyEnrollmentState onBrowse={() => setCourseSwitcherOpen(true)} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allCourseProgress?.map((cp) => (
                  <CourseCard
                    key={cp.courseId}
                    courseId={cp.courseId}
                    courseTitle={cp.courseTitle}
                    subject={cp.subject}
                    gradeLevel={cp.gradeLevel}
                    isCurrent={cp.isCurrent}
                    totalUnits={cp.totalUnits}
                    completedUnits={cp.completedUnits}
                    inProgressUnits={cp.inProgressUnits}
                    progressPercent={cp.progressPercent}
                    activeUnitTitle={cp.activeUnitTitle}
                    activeUnitNumber={cp.activeUnitNumber}
                    lastActivityAt={cp.lastActivityAt}
                    onSwitch={handleSwitchCourse}
                    onOpen={handleOpenCourse}
                    isSwitching={setActiveCourse.isPending}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Continue Learning — active course unit */}
          {enrolledCount > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Continue Learning</h2>
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground"
                  onClick={() => setLocation("/curriculum")}>
                  View all units <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              {activeUnit ? (
                <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => setLocation(`/curriculum/unit/${activeUnit.unitNumber}`)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs font-medium">
                            Unit {activeUnit.unitNumber}
                          </Badge>
                          {activeUnit.status === "quiz_unlocked" && (
                            <Badge className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200">
                              Quiz Ready
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {dashboard?.courseTitle}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-foreground text-base leading-tight mb-2">{activeUnit.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                          <span>{activeUnit.lessonsCompleted}/{activeUnit.totalLessons || "—"} lessons</span>
                          {activeUnit.quizScore !== null && (
                            <span>Quiz: {activeUnit.quizScore}%</span>
                          )}
                        </div>
                        <Progress value={activeUnit.totalLessons > 0 ? (activeUnit.lessonsCompleted / activeUnit.totalLessons) * 100 : 0} className="h-1.5" />
                      </div>
                      <Button size="sm" className="shrink-0 gap-1 group-hover:translate-x-0.5 transition-transform">
                        Continue <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : !hasDiagnosticForActiveCourse ? (
                <Card className="border border-dashed border-amber-300 bg-amber-50/50 shadow-sm">
                  <CardContent className="p-6 text-center space-y-3">
                    <ClipboardList className="h-10 w-10 text-amber-500 mx-auto" />
                    <div>
                      <p className="font-medium text-foreground">Take the {dashboard?.courseTitle ?? "Course"} Placement Test</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        The diagnostic assessment places you at the right starting point in {dashboard?.courseTitle ?? "this course"}.
                      </p>
                    </div>
                    <Button onClick={() => setLocation("/course-welcome")} className="gap-2 bg-amber-500 hover:bg-amber-600">
                      <ClipboardList className="h-4 w-4" />
                      Start Placement Test
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border border-dashed shadow-sm">
                  <CardContent className="p-6 text-center space-y-3">
                    <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto" />
                    <div>
                      <p className="font-medium text-foreground">All units complete!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You've completed all available units. Enrol in another course to keep learning.
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setCourseSwitcherOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Browse More Courses
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Right column: Quick actions + Mastery + Diagnostic */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs"
                onClick={() => setCourseSwitcherOpen(true)}
              >
                <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                Browse Course Catalogue
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs"
                onClick={() => setLocation("/tutor")}
              >
                <Brain className="h-3.5 w-3.5 text-purple-500" />
                Ask AI Tutor
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs"
                onClick={() => hasDiagnosticForActiveCourse ? setLocation("/diagnostic") : setLocation("/course-welcome")}
              >
                <ClipboardList className="h-3.5 w-3.5 text-amber-500" />
                {hasDiagnosticForActiveCourse ? "Retest Placement" : "Take Placement Test"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs"
                onClick={() => setLocation("/progress")}
              >
                <Target className="h-3.5 w-3.5 text-green-500" />
                View Progress
              </Button>
            </CardContent>
          </Card>

          {/* Mastery Overview */}
          {enrolledCount > 0 && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Skill Mastery
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {dashboard?.mastery.slice(0, 5).map((m) => (
                  <div key={m.skillId} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono w-24 shrink-0 truncate">{m.skillId}</span>
                    <Progress value={m.score} className="h-1.5 flex-1" />
                    <span className={`text-xs font-semibold w-8 text-right ${getMasteryColor(m.score)}`}>
                      {m.score}%
                    </span>
                  </div>
                ))}
                {(dashboard?.mastery.length ?? 0) === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Complete quizzes to track skill mastery
                  </p>
                )}
                {(dashboard?.mastery.length ?? 0) > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground mt-1"
                    onClick={() => setLocation("/progress")}
                  >
                    View all skills
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Diagnostic Result */}
          {diagnostic && (
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Placement Result</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {(diagnostic as any).placementRecommendation}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Score:</span>
                  <span className={`text-xs font-bold ${getMasteryColor((diagnostic as any).overallScore)}`}>
                    {(diagnostic as any).overallScore}%
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getMasteryBadgeClass((diagnostic as any).overallScore)}`}>
                    {getMasteryLabel((diagnostic as any).overallScore)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
