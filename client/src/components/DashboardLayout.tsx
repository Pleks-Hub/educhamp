import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Award,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  PanelLeft,
  Settings,
  Share2,
  Shield,
  Sigma,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState, useCallback } from "react";
import { X, AlertTriangle, Lock, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useLocation, Redirect } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import CourseSwitcher from "./CourseSwitcher";
// Primary learning items — always visible to students
const primaryItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: BookOpen, label: "My Curriculum", path: "/curriculum" },
  { icon: Brain, label: "AI Tutor", path: "/tutor" },
];

// Secondary tools — visible but grouped under a separator
const secondaryItems = [
  { icon: ClipboardList, label: "Placement Test", path: "/diagnostic" },
  { icon: BarChart3, label: "My Progress", path: "/progress" },
  { icon: Library, label: "Browse Courses", path: "/courses" },
  { icon: CalendarDays, label: "Learning Plan", path: "/learning-plan" },
  { icon: Sigma, label: "Skill Index", path: "/skills" },
  { icon: FileText, label: "Exam Prep", path: "/exam-prep" },
];

// Combined for backward compat with activeItem detection
const menuItems = [...primaryItems, ...secondaryItems];

// Parent Dashboard is shown to all authenticated users — any user can enrol children
const parentMenuItem = { icon: Users, label: "Parent Dashboard", path: "/parent" };
const referralMenuItem = { icon: Share2, label: "Refer & Invite", path: "/referrals" };
const billingMenuItem = { icon: CreditCard, label: "Billing", path: "/billing" };
const certificatesMenuItem = { icon: Award, label: "Certificates", path: "/certificates" };

const SIDEBAR_WIDTH_KEY = "educhamp-sidebar-width";
const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 200;
const MAX_WIDTH = 320;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return <Redirect to="/landing" />;
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const activeItem = menuItems.find((item) => item.path === location || (item.path !== "/" && location.startsWith(item.path)));

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";
  const [courseSwitcherOpen, setCourseSwitcherOpen] = useState(false);
  const dashboardQuery = trpc.progress.getDashboard.useQuery(undefined, {
    staleTime: 60_000,
  });
  const activeCourseTitle = dashboardQuery.data?.courseTitle;

  // Trial banner state
  const TRIAL_BANNER_KEY = "educhamp-trial-banner-dismissed";
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(() =>
    sessionStorage.getItem(TRIAL_BANNER_KEY) === "1"
  );
  const dismissTrialBanner = useCallback(() => {
    sessionStorage.setItem(TRIAL_BANNER_KEY, "1");
    setTrialBannerDismissed(true);
  }, []);
  const subscriptionQuery = trpc.payment.getMySubscription.useQuery(undefined, {
    staleTime: 5 * 60_000,
    retry: false,
  });
  const sub = subscriptionQuery.data;
  const isTrialing = sub?.status === "trialing" && sub?.trialEnd != null;
  const trialDaysLeft = isTrialing
    ? Math.max(0, Math.ceil((new Date(sub!.trialEnd!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const showTrialBanner = isTrialing && !trialBannerDismissed;

  // Access gating: lock access if subscription is past_due/canceled OR if no subscription at all (no card on file)
  // Allow /billing and /admin to remain accessible so users can set up billing or manage
  const billingStatusQuery = trpc.payment.getBillingStatus.useQuery(undefined, {
    staleTime: 5 * 60_000,
    retry: false,
  });
  const billingStatus = billingStatusQuery.data;
  const noCardOnFile = billingStatus && !billingStatus.hasSubscription;
  const isSuspended = billingStatus?.suspendedAt != null;
  const isStudentAccount = user?.accountType === "student";
  const isAccessLocked =
    (
      sub?.status === "past_due" ||
      sub?.status === "canceled" ||
      noCardOnFile ||
      isSuspended
    ) &&
    !location.startsWith("/billing") &&
    !location.startsWith("/admin") &&
    !location.startsWith("/settings") &&
    !location.startsWith("/profile");

  const planDisplayName = sub?.planName === "premium_family" ? "Premium Family" : sub?.planName === "family" ? "Family Plan" : sub?.planName ?? "your plan";
  const periodEndDate = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-sidebar-border" disableTransition={isResizing}>
          {/* Header */}
          <SidebarHeader className="h-16 border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-3 h-full">
              <button
                onClick={toggleSidebar}
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors shrink-0"
                aria-label="Toggle sidebar"
              >
                <PanelLeft className="h-4 w-4 text-sidebar-foreground/70" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-lg overflow-hidden shrink-0 bg-white flex items-center justify-center">
                    <img src="/manus-storage/educhamp-logo-64_28201452.png" alt="EduChamp" className="h-6 w-6 object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-sidebar-foreground truncate leading-none">EduChamp</p>
                    {activeCourseTitle ? (
                      <button
                        onClick={() => setCourseSwitcherOpen(true)}
                        className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-sidebar-primary/20 text-sidebar-primary text-[10px] font-medium truncate max-w-full hover:bg-sidebar-primary/30 transition-colors"
                        title="Switch course"
                      >
                        <span className="truncate">{activeCourseTitle}</span>
                        <span className="shrink-0 opacity-60">↗</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setCourseSwitcherOpen(true)}
                        className="text-[10px] text-sidebar-foreground/50 truncate mt-0.5 hover:text-sidebar-foreground/80 transition-colors text-left"
                        title="Switch course"
                      >
                        Select a course ↗
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Navigation */}
          <SidebarContent className="py-3">
            <SidebarMenu className="px-2 gap-0.5">
              {/* Primary learning items */}
              {primaryItems.map((item) => {
                const isActive = item.path === location || (item.path !== "/" && location.startsWith(item.path));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-9 rounded-lg transition-all duration-150 ${
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="text-sm">{item.label}</span>
                      {isActive && !isCollapsed && (
                        <ChevronRight className="ml-auto h-3 w-3 opacity-60" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Separator between primary and secondary */}
              {!isCollapsed && (
                <div className="px-2 pt-2 pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 px-2">Tools</p>
                </div>
              )}
              {isCollapsed && <div className="h-2" />}

              {/* Secondary tools */}
              {secondaryItems.map((item) => {
                const isActive = item.path === location || (item.path !== "/" && location.startsWith(item.path));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-9 rounded-lg transition-all duration-150 ${
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="text-sm">{item.label}</span>
                      {isActive && !isCollapsed && (
                        <ChevronRight className="ml-auto h-3 w-3 opacity-60" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Parent Dashboard + Referrals — hidden from student accounts */}
              {!isStudentAccount && (
                <>
                  {!isCollapsed && (
                    <div className="px-2 pt-2 pb-1">
                      <div className="h-px bg-sidebar-border" />
                    </div>
                  )}
                  {[parentMenuItem, certificatesMenuItem, referralMenuItem, billingMenuItem].map((item) => {
                const isActive = location.startsWith(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-9 rounded-lg transition-all duration-150 ${
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="text-sm">{item.label}</span>
                      {isActive && !isCollapsed && (
                        <ChevronRight className="ml-auto h-3 w-3 opacity-60" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
                </>
              )}
            </SidebarMenu>
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 shrink-0 border border-sidebar-border">
                    <AvatarFallback className="text-xs font-semibold bg-sidebar-primary text-sidebar-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-sidebar-foreground truncate leading-none">
                        {user?.name || "Student"}
                      </p>
                      <p className="text-[10px] text-sidebar-foreground/50 truncate mt-1">
                        {user?.email || "Grade 9"}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile &amp; Settings
                </DropdownMenuItem>
                {user?.role === "admin" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation("/admin")} className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Console
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-50"
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      <SidebarInset className="bg-background">
        {/* Admin impersonation banner */}
        <ImpersonationBanner />
        {/* Trial active banner */}
        {showTrialBanner && (
          <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 text-sm">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                <strong>Free trial active</strong> — your trial{" "}
                {trialDaysLeft === 0
                  ? "expires today"
                  : trialDaysLeft === 1
                  ? "ends tomorrow"
                  : `ends in ${trialDaysLeft} days`}.
                {" "}Upgrade to keep full access.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setLocation("/billing")}
                className="rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                Upgrade now
              </button>
              <button
                onClick={dismissTrialBanner}
                aria-label="Dismiss trial banner"
                className="rounded p-1 text-amber-600 hover:bg-amber-500/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Mobile top bar */}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <div className="flex items-center gap-1.5">
                <div className="h-6 w-6 rounded overflow-hidden bg-white flex items-center justify-center">
                  <img src="/manus-storage/educhamp-logo-64_28201452.png" alt="EduChamp" className="h-5 w-5 object-contain" />
                </div>
                <span className="font-semibold text-sm truncate max-w-[140px]">{activeItem?.label ?? "EduChamp"}</span>
              </div>
            </div>
          </div>
        )}
        {/* Access-locked overlay: no card, past_due, canceled, or suspended */}
        {isAccessLocked && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
              <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${noCardOnFile ? 'bg-indigo-100' : isSuspended ? 'bg-amber-100' : 'bg-destructive/10'}`}>
                {noCardOnFile ? (
                  <CreditCard className="h-8 w-8 text-indigo-600" />
                ) : isSuspended ? (
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                ) : (
                  <Lock className="h-8 w-8 text-destructive" />
                )}
              </div>
              <h2 className="mb-2 text-xl font-bold text-foreground">
                {noCardOnFile && isStudentAccount
                  ? "Waiting for parent billing setup"
                  : noCardOnFile
                    ? "Set up billing to get started"
                    : isSuspended
                      ? "Account suspended"
                      : sub?.status === "past_due"
                        ? "Payment required"
                        : "Subscription ended"}
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">
                {noCardOnFile && isStudentAccount
                  ? "Billing must be set up by a parent or guardian. Please ask your parent to log in to their EduChamp account, add a payment card, and link you to their profile."
                  : noCardOnFile
                    ? "A payment card on file is required before you can access EduChamp. Set up your billing information to activate your free plan."
                    : isSuspended
                      ? "Your account has been suspended by an administrator. Please contact support for more information."
                      : sub?.status === "past_due"
                        ? "A payment is overdue. Please update your payment method to restore access."
                        : periodEndDate
                          ? `Your subscription ended on ${periodEndDate}. Reactivate to continue learning.`
                          : "Your subscription has ended. Reactivate to continue learning."}
              </p>
              {!isSuspended && !isStudentAccount && (
                <Button
                  className="w-full mb-3"
                  onClick={() => setLocation(noCardOnFile ? "/billing/setup" : "/billing")}
                >
                  {noCardOnFile ? "Set up billing" : "Reactivate your plan"}
                </Button>
              )}
              {noCardOnFile && isStudentAccount && (
                <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4 mb-3 text-left">
                  <p className="text-sm text-indigo-900 font-medium mb-1">What happens next?</p>
                  <p className="text-xs text-indigo-800">A notification has been sent to your parent or guardian. Once they complete billing setup and link your account, you'll have immediate access.</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Need help?{" "}
                <a href="mailto:support@educhamp.co" className="underline hover:text-foreground">
                  Contact support
                </a>
              </p>
            </div>
          </div>
        )}
        <main className="flex-1 min-h-dvh">{children}</main>
      </SidebarInset>

      <CourseSwitcher
        open={courseSwitcherOpen}
        onClose={() => setCourseSwitcherOpen(false)}
      />
    </>
  );
}

// ─── Impersonation Banner ─────────────────────────────────────────────────

function ImpersonationBanner() {
  const [token, setToken] = useState<string | null>(null);
  const [expires, setExpires] = useState<number | null>(null);
  const [secsLeft, setSecsLeft] = useState<number>(0);
  const utils = trpc.useUtils();

  useEffect(() => {
    const t = sessionStorage.getItem("educhamp-impersonation-token");
    const exp = sessionStorage.getItem("educhamp-impersonation-expires");
    if (t && exp) {
      const expMs = parseInt(exp, 10);
      if (Date.now() < expMs) {
        setToken(t);
        setExpires(expMs);
        setSecsLeft(Math.max(0, Math.ceil((expMs - Date.now()) / 1000)));
      } else {
        sessionStorage.removeItem("educhamp-impersonation-token");
        sessionStorage.removeItem("educhamp-impersonation-expires");
      }
    }
  }, []);

  const { data: info } = trpc.admin.getImpersonationInfo.useQuery(
    { token: token! },
    { enabled: !!token, staleTime: 60_000, retry: false }
  );

  const endMutation = trpc.admin.endImpersonation.useMutation({
    onSuccess: () => {
      sessionStorage.removeItem("educhamp-impersonation-token");
      sessionStorage.removeItem("educhamp-impersonation-expires");
      utils.auth.me.invalidate();
      toast.success("Impersonation session ended — returning to admin console");
      setTimeout(() => { window.location.href = "/admin"; }, 600);
    },
    onError: (e) => toast.error(e.message),
  });

  const extendMutation = trpc.admin.extendImpersonation.useMutation({
    onSuccess: (data) => {
      setExpires(data.expiresAt);
      setSecsLeft(Math.max(0, Math.ceil((data.expiresAt - Date.now()) / 1000)));
      sessionStorage.setItem("educhamp-impersonation-expires", String(data.expiresAt));
      toast.success("Session extended by 15 minutes");
    },
    onError: (e) => toast.error(e.message),
  });

  // Tick every second; auto-redirect when timer hits 0
  useEffect(() => {
    if (!token || !expires) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expires - Date.now()) / 1000));
      setSecsLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        sessionStorage.removeItem("educhamp-impersonation-token");
        sessionStorage.removeItem("educhamp-impersonation-expires");
        toast.info("Impersonation session expired — returning to admin console");
        setTimeout(() => { window.location.href = "/admin"; }, 800);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [token, expires]);

  if (!token || !info) return null;

  const mm = String(Math.floor(secsLeft / 60)).padStart(2, "0");
  const ss = String(secsLeft % 60).padStart(2, "0");
  const isUrgent = secsLeft <= 120;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`sticky top-0 z-50 flex items-center justify-between gap-3 border-b px-4 py-2.5 text-sm transition-colors ${
        isUrgent ? "border-red-500/40 bg-red-500/10" : "border-amber-500/40 bg-amber-500/10"
      }`}
    >
      <div className={`flex items-center gap-2.5 ${
        isUrgent ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
      }`}>
        <Eye className="h-4 w-4 shrink-0" />
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold text-white ${
          isUrgent ? "bg-red-500" : "bg-amber-500"
        }`}>
          Admin View
        </span>
        <span className="hidden sm:inline">
          Viewing as <strong>{info.impersonatedUser.name ?? info.impersonatedUser.email}</strong>
          {" "}— admin impersonation session
        </span>
        <span className="sm:hidden text-xs">
          {info.impersonatedUser.name ?? info.impersonatedUser.email}
        </span>
        <span className={`font-mono text-xs font-semibold tabular-nums ${
          isUrgent ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-500"
        }`}>
          {mm}:{ss}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {secsLeft <= 300 && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => extendMutation.mutate({ token })}
                  disabled={extendMutation.isPending || endMutation.isPending}
                  className="rounded-md border border-current px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-60 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                >
                  {extendMutation.isPending ? "Extending…" : "+15 min"}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-center">
                <p className="font-medium">Extend session by 15 minutes</p>
                <p className="text-xs text-muted-foreground mt-0.5">Maximum session length is 2 hours. Extensions are logged in the audit trail.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <button
          onClick={() => endMutation.mutate({ token })}
          disabled={endMutation.isPending}
          className={`rounded-md px-3 py-1 text-xs font-semibold text-white transition-colors disabled:opacity-60 ${
            isUrgent ? "bg-red-500 hover:bg-red-600" : "bg-amber-500 hover:bg-amber-600"
          }`}
        >
          {endMutation.isPending ? "Ending…" : "End Session"}
        </button>
      </div>
    </div>
  );
}
