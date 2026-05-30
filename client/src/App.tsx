import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PaletteProvider } from "./contexts/PaletteContext";
import { CelebrationProvider } from "./components/CelebrationOverlay";
import { Skeleton } from "@/components/ui/skeleton";

// ── Eagerly loaded (always needed on first paint) ─────────────────────────────
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "@/pages/NotFound";
import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";

// ── Lazily loaded — split into separate chunks ────────────────────────────────
const Curriculum = lazy(() => import("./pages/Curriculum"));
const UnitDetail = lazy(() => import("./pages/UnitDetail"));
const LessonDetail = lazy(() => import("./pages/LessonDetail"));
const Tutor = lazy(() => import("./pages/Tutor"));
const Diagnostic = lazy(() => import("./pages/Diagnostic"));
const Progress = lazy(() => import("./pages/Progress"));
const Skills = lazy(() => import("./pages/Skills"));
const Quiz = lazy(() => import("./pages/Quiz"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const JoinPage = lazy(() => import("./pages/JoinPage"));
const ParentOnboarding = lazy(() => import("./pages/ParentOnboarding"));
const StudentOnboarding = lazy(() => import("./pages/StudentOnboarding"));
const Referrals = lazy(() => import("./pages/Referrals"));
const CourseWelcome = lazy(() => import("./pages/CourseWelcome"));
const CourseCatalog = lazy(() => import("./pages/CourseCatalog"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NewsletterConsole = lazy(() => import("./pages/NewsletterConsole"));
const ChatManagement = lazy(() => import("./pages/ChatManagement"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const Billing = lazy(() => import("./pages/Billing"));
const CourseRequestResult = lazy(() => import("./pages/CourseRequestResult"));
const Verify2FA = lazy(() => import("./pages/Verify2FA"));
const EarlyDiagnostic = lazy(() => import("./pages/EarlyDiagnostic"));
const GamificationHub = lazy(() => import("./pages/GamificationHub"));
const RewardsMarketplace = lazy(() => import("./pages/RewardsMarketplace"));
const AdventureMap = lazy(() => import("./pages/AdventureMap"));
const ConsentApproval = lazy(() => import("./pages/ConsentApproval"));

// ── Page-level loading fallback ───────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 w-full">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Switch>
        {/* Public routes — no auth required, no sidebar */}
        <Route path="/landing" component={LandingPage} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/accept-invite" component={AcceptInvite} />
        <Route path="/join" component={JoinPage} />
        <Route path="/onboarding/parent" component={ParentOnboarding} />
        <Route path="/onboarding/student" component={StudentOnboarding} />
        <Route path="/checkout/success" component={CheckoutSuccess} />
        <Route path="/course-request/result" component={CourseRequestResult} />
        <Route path="/verify-2fa" component={Verify2FA} />
        <Route path="/consent/approve" component={ConsentApproval} />
        <Route path="/consent/deny" component={ConsentApproval} />

        {/* Admin console — standalone, no sidebar */}
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/newsletter" component={NewsletterConsole} />
        <Route path="/admin/chat" component={ChatManagement} />

        {/* App routes — wrapped in DashboardLayout */}
        <Route>
          <DashboardLayout>
            <Suspense fallback={<PageSkeleton />}>
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/courses" component={CourseCatalog} />
                <Route path="/curriculum" component={Curriculum} />
                <Route path="/curriculum/unit/:unitNumber" component={UnitDetail} />
                <Route path="/curriculum/unit/:unitNumber/lesson/:lessonId" component={LessonDetail} />
                <Route path="/curriculum/unit/:unitNumber/quiz" component={Quiz} />
                <Route path="/tutor" component={Tutor} />
                <Route path="/diagnostic" component={Diagnostic} />
                <Route path="/diagnostic/early" component={EarlyDiagnostic} />
                <Route path="/course-welcome" component={CourseWelcome} />
                <Route path="/progress" component={Progress} />
                <Route path="/skills" component={Skills} />
                <Route path="/parent" component={ParentDashboard} />
                <Route path="/profile" component={Profile} />
                <Route path="/referrals" component={Referrals} />
                <Route path="/billing" component={Billing} />
                <Route path="/gamification" component={GamificationHub} />
                <Route path="/rewards" component={RewardsMarketplace} />
                <Route path="/adventure-map" component={AdventureMap} />
                <Route path="/404" component={NotFound} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </DashboardLayout>
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <PaletteProvider>
          <CelebrationProvider>
            <TooltipProvider>
              <Toaster richColors position="top-right" />
              <Router />
            </TooltipProvider>
          </CelebrationProvider>
        </PaletteProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
