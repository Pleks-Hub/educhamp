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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { NavTooltip, SidebarNavTooltip } from "@/components/NavTooltip";
import { NAV_TOOLTIPS, HEADER_TOOLTIPS } from "@/lib/tooltipContent";
import { trpc } from "@/lib/trpc";
import { useIsMobile } from "@/hooks/useMobile";
import {
  BarChart3,
  BookOpen,
  Brain,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Map,
  PanelLeft,
  Settings,
  Share2,
  Shield,
  Sigma,
  Sparkles,
  Trophy,
  Gift,
  User,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState, useCallback } from "react";
import { X, AlertTriangle, Lock, ExternalLink } from "lucide-react";
import { useLocation, Redirect } from "wouter";
import { toast } from "sonner";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import CourseSwitcher from "./CourseSwitcher";
import { XpProgressBar } from "./XpProgressBar";
const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", tooltipKey: "dashboard" },
  { icon: Library, label: "Course Catalog", path: "/courses", tooltipKey: "courses" },
  { icon: BookOpen, label: "Curriculum", path: "/curriculum", tooltipKey: "curriculum" },
  { icon: Brain, label: "AI Tutor", path: "/tutor", tooltipKey: "aiTutor" },
  { icon: FileText, label: "Exam Prep", path: "/exam-prep", tooltipKey: "examPrep" },
  { icon: ClipboardList, label: "Diagnostic", path: "/diagnostic", tooltipKey: "diagnostic" },
  { icon: BarChart3, label: "Progress", path: "/progress", tooltipKey: "progress" },
  { icon: Sigma, label: "Skill Index", path: "/skills", tooltipKey: "skillIndex" },
  { icon: Trophy, label: "Achievements", path: "/gamification", tooltipKey: "achievements" },
  { icon: Gift, label: "Rewards", path: "/rewards", tooltipKey: "rewards" },
  { icon: Map, label: "Adventure Map", path: "/adventure-map", tooltipKey: "adventureMap" },
];

// Parent Dashboard is shown to all authenticated users — any user can enrol children
const parentMenuItem = { icon: Users, label: "Parent Dashboard", path: "/parent", tooltipKey: "parent" };
const referralMenuItem = { icon: Share2, label: "Refer & Invite", path: "/referrals", tooltipKey: "referrals" };
const billingMenuItem = { icon: CreditCard, label: "Billing", path: "/billing", tooltipKey: "billing" };

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

  // COPPA gate: check consent status for student accounts
  const consentQuery = trpc.coppa.consentStatus.useQuery(undefined, {
    enabled: !!user && user.accountType === "student",
    staleTime: 30_000,
  });

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return <Redirect to="/landing" />;
  }

  // If COPPA gate is active and consent is required but not approved, redirect to waiting page
  if (
    user.accountType === "student" &&
    consentQuery.data?.required &&
    consentQuery.data?.status !== "approved" &&
    consentQuery.data?.status !== "not_required"
  ) {
    return <Redirect to="/consent/waiting" />;
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

/**
 * A button that opens the Stripe Customer Portal directly.
 * Used in the locked-access overlay so lapsed users can reactivate in one click.
 */
function PortalButton({ className }: { className?: string }) {
  const portalMutation = trpc.payment.createPortalSession.useMutation({
    onSuccess: ({ url }) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: (err) => {
      toast.error(err.message || "Could not open billing portal. Please try again.");
    },
  });

  return (
    <Button
      className={className}
      onClick={() => portalMutation.mutate({ origin: window.location.origin })}
      disabled={portalMutation.isPending}
    >
      {portalMutation.isPending ? (
        "Opening portal..."
      ) : (
        <>
          <ExternalLink className="mr-2 h-4 w-4" />
          Reactivate your plan
        </>
      )}
    </Button>
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
    enabled: !!user,
  });
  const activeCourseTitle = dashboardQuery.data?.courseTitle;

  // Pending course request count for the Parent Dashboard badge
  const pendingRequestsQuery = trpc.parent.getPendingCourseRequests.useQuery(undefined, {
    staleTime: 30_000,
    retry: false,
    enabled: !!user,
  });
  const pendingRequestCount = pendingRequestsQuery.data?.length ?? 0;

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
    enabled: !!user,
  });
  const sub = subscriptionQuery.data;
  const isTrialing = sub?.status === "trialing" && sub?.trialEnd != null;
  const trialDaysLeft = isTrialing
    ? Math.max(0, Math.ceil((new Date(sub!.trialEnd!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const showTrialBanner = isTrialing && !trialBannerDismissed;

  // Post-trial grace period: show locked overlay for past_due or canceled subscriptions
  // Allow /billing to remain accessible so users can reactivate
  const isAccessLocked =
    (sub?.status === "past_due" || sub?.status === "canceled") &&
    !location.startsWith("/billing") &&
    !location.startsWith("/admin");

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
              <NavTooltip content={HEADER_TOOLTIPS.sidebarToggle} side="right">
                <button
                  onClick={toggleSidebar}
                  className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors shrink-0"
                  aria-label={HEADER_TOOLTIPS.sidebarToggle.description}
                >
                  <PanelLeft className="h-4 w-4 text-sidebar-foreground/70" />
                </button>
              </NavTooltip>
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

          {/* XP Progress Bar — shown when sidebar is expanded */}
          {!isCollapsed && <XpProgressBar />}

          {/* Navigation */}
          <SidebarContent className="py-3">
            <SidebarMenu className="px-2 gap-0.5">
              {menuItems.map((item) => {
                const isActive = item.path === location || (item.path !== "/" && location.startsWith(item.path));
                const tooltipEntry = NAV_TOOLTIPS[item.tooltipKey];
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarNavTooltip
                      content={tooltipEntry}
                      sidebarExpanded={!isCollapsed}
                      side="right"
                    >
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={isCollapsed ? undefined : item.label}
                        className={`h-9 rounded-lg transition-all duration-150 ${
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        }`}
                        aria-label={tooltipEntry?.description ?? item.label}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="text-sm">{item.label}</span>
                        {isActive && !isCollapsed && (
                          <ChevronRight className="ml-auto h-3 w-3 opacity-60" />
                        )}
                      </SidebarMenuButton>
                    </SidebarNavTooltip>
                  </SidebarMenuItem>
                );
              })}

              {/* Parent Dashboard + Referrals — always visible */}
              {!isCollapsed && (
                <div className="px-2 pt-2 pb-1">
                  <div className="h-px bg-sidebar-border" />
                </div>
              )}
              {[parentMenuItem, referralMenuItem, billingMenuItem].map((item) => {
                const isActive = location.startsWith(item.path);
                const tooltipEntry = NAV_TOOLTIPS[item.tooltipKey];
                const showPendingBadge = item.path === "/parent" && pendingRequestCount > 0;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarNavTooltip
                      content={tooltipEntry}
                      sidebarExpanded={!isCollapsed}
                      side="right"
                    >
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={isCollapsed ? undefined : item.label}
                        className={`h-9 rounded-lg transition-all duration-150 ${
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        }`}
                        aria-label={tooltipEntry?.description ?? item.label}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="text-sm">{item.label}</span>
                        {isActive && !isCollapsed && (
                          <ChevronRight className="ml-auto h-3 w-3 opacity-60" />
                        )}
                      </SidebarMenuButton>
                    </SidebarNavTooltip>
                    {showPendingBadge && (
                      <SidebarMenuBadge
                        className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                        aria-label={`${pendingRequestCount} pending course request${pendingRequestCount !== 1 ? 's' : ''}`}
                      >
                        {pendingRequestCount > 99 ? "99+" : pendingRequestCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none"
                  aria-label={HEADER_TOOLTIPS.userMenu.description}
                  title={isCollapsed ? HEADER_TOOLTIPS.userMenu.title : undefined}
                >
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
                <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer" title={NAV_TOOLTIPS.settings.description}>
                  <User className="mr-2 h-4 w-4" />
                  Profile &amp; Settings
                </DropdownMenuItem>
                {user?.role === "admin" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation("/admin")} className="cursor-pointer" title={NAV_TOOLTIPS.admin.description}>
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Console
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive" title={NAV_TOOLTIPS.logout.description}>
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
        {/* Trial active banner */}
        {showTrialBanner && (() => {
          const isUrgent = trialDaysLeft <= 3;
          const bannerBg = isUrgent
            ? "bg-red-500/10 border-red-500/30"
            : "bg-amber-500/10 border-amber-500/30";
          const textColor = isUrgent
            ? "text-red-700 dark:text-red-400"
            : "text-amber-700 dark:text-amber-400";
          const pillBg = isUrgent
            ? "bg-red-500 text-white"
            : "bg-amber-500 text-white";
          const btnBg = isUrgent
            ? "bg-red-500 hover:bg-red-600"
            : "bg-amber-500 hover:bg-amber-600";
          const dayLabel =
            trialDaysLeft === 0
              ? "Expires today"
              : trialDaysLeft === 1
              ? "1 day left"
              : `${trialDaysLeft} days left`;
          return (
            <div className={`sticky top-0 z-50 flex items-center justify-between gap-3 border-b px-4 py-2.5 text-sm ${bannerBg}`}>
              <div className={`flex items-center gap-2.5 ${textColor}`}>
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${pillBg}`}>
                  {dayLabel}
                </span>
                <span className="hidden sm:inline">
                  <strong>Free trial</strong> — upgrade to keep full access after your trial ends.
                </span>
                <span className="sm:hidden text-xs">Upgrade to keep access.</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setLocation("/billing")}
                  className={`rounded-md px-3 py-1 text-xs font-semibold text-white transition-colors ${btnBg}`}
                >
                  Upgrade Now
                </button>
                <button
                  onClick={dismissTrialBanner}
                  aria-label="Dismiss trial banner"
                  className={`rounded p-1 transition-colors ${isUrgent ? "text-red-600 hover:bg-red-500/20" : "text-amber-600 hover:bg-amber-500/20"}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })()}

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
        {/* Post-trial locked-access overlay */}
        {isAccessLocked && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <Lock className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-foreground">
                {sub?.status === "past_due" ? "Payment required" : "Subscription ended"}
              </h2>
              <p className="mb-1 text-sm font-medium text-muted-foreground">
                {planDisplayName}
              </p>
              {periodEndDate && (
                <p className="mb-6 text-sm text-muted-foreground">
                  {sub?.status === "past_due"
                    ? `A payment is overdue. Your access will be restored once the payment is processed.`
                    : `Your subscription ended on ${periodEndDate}.`}
                </p>
              )}
              {!periodEndDate && (
                <p className="mb-6 text-sm text-muted-foreground">
                  {sub?.status === "past_due"
                    ? "A payment is overdue. Please update your payment method to restore access."
                    : "Your subscription has ended. Reactivate to continue learning."}
                </p>
              )}
              <PortalButton className="w-full mb-3" />
              <button
                className="text-xs text-muted-foreground underline hover:text-foreground mb-4 block w-full text-center"
                onClick={() => setLocation("/billing")}
              >
                View billing details
              </button>
              <p className="text-xs text-muted-foreground">
                Need help?{" "}
                <a href="mailto:support@educhamp.app" className="underline hover:text-foreground">
                  Contact support
                </a>
              </p>
            </div>
          </div>
        )}
        <main className="flex-1 min-h-screen">{children}</main>
      </SidebarInset>

      <CourseSwitcher
        open={courseSwitcherOpen}
        onClose={() => setCourseSwitcherOpen(false)}
      />
    </>
  );
}
