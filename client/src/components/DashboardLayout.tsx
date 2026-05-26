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
import { useIsMobile } from "@/hooks/useMobile";
import {
  BarChart3,
  BookOpen,
  Brain,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
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
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import CourseSwitcher from "./CourseSwitcher";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: BookOpen, label: "Curriculum", path: "/curriculum" },
  { icon: Brain, label: "AI Tutor", path: "/tutor" },
  { icon: ClipboardList, label: "Diagnostic", path: "/diagnostic" },
  { icon: BarChart3, label: "Progress", path: "/progress" },
  { icon: Sigma, label: "Skill Index", path: "/skills" },
];

// Parent Dashboard is shown to all authenticated users — any user can enrol children
const parentMenuItem = { icon: Users, label: "Parent Dashboard", path: "/parent" };
const referralMenuItem = { icon: Share2, label: "Refer & Invite", path: "/referrals" };

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <GraduationCap className="h-9 w-9 text-primary-foreground" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">EduChamp</h1>
              <p className="text-sm text-muted-foreground mt-1">Algebra I · Katy ISD</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-xl font-semibold">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Access your personalized Algebra I learning path, AI tutor, and progress dashboard.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full shadow-md hover:shadow-lg transition-all"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Sign in to EduChamp
          </Button>
        </div>
      </div>
    );
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
                  <div className="h-7 w-7 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
                    <GraduationCap className="h-4 w-4 text-sidebar-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-sidebar-foreground truncate leading-none">EduChamp</p>
                    <button
                      onClick={() => setCourseSwitcherOpen(true)}
                      className="text-[10px] text-sidebar-foreground/50 truncate mt-0.5 hover:text-sidebar-foreground/80 transition-colors text-left"
                      title="Switch course"
                    >
                      Switch course ↗
                    </button>
                  </div>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Navigation */}
          <SidebarContent className="py-3">
            <SidebarMenu className="px-2 gap-0.5">
              {menuItems.map((item) => {
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

              {/* Parent Dashboard + Referrals — always visible */}
              {!isCollapsed && (
                <div className="px-2 pt-2 pb-1">
                  <div className="h-px bg-sidebar-border" />
                </div>
              )}
              {[parentMenuItem, referralMenuItem].map((item) => {
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
        {/* Mobile top bar */}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <span className="font-semibold text-sm">{activeItem?.label ?? "EduChamp"}</span>
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
