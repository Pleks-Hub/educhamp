import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PaletteProvider } from "./contexts/PaletteContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Curriculum from "./pages/Curriculum";
import UnitDetail from "./pages/UnitDetail";
import LessonDetail from "./pages/LessonDetail";
import Tutor from "./pages/Tutor";
import Diagnostic from "./pages/Diagnostic";
import Progress from "./pages/Progress";
import Skills from "./pages/Skills";
import Quiz from "./pages/Quiz";
import ParentDashboard from "./pages/ParentDashboard";
import AcceptInvite from "./pages/AcceptInvite";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import JoinPage from "./pages/JoinPage";
import LandingPage from "./pages/LandingPage";
import ParentOnboarding from "./pages/ParentOnboarding";
import StudentOnboarding from "./pages/StudentOnboarding";
import Referrals from "./pages/Referrals";
import CourseWelcome from "./pages/CourseWelcome";
import CourseCatalog from "./pages/CourseCatalog";
import AdminDashboard from "./pages/AdminDashboard";
import NewsletterConsole from "./pages/NewsletterConsole";
import ChatManagement from "./pages/ChatManagement";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import Billing from "./pages/Billing";

function Router() {
  return (
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
      {/* Admin console — standalone, no sidebar */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/newsletter" component={NewsletterConsole} />
      <Route path="/admin/chat" component={ChatManagement} />

      {/* App routes — wrapped in DashboardLayout */}
      <Route>
        <DashboardLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/courses" component={CourseCatalog} />
            <Route path="/curriculum" component={Curriculum} />
            <Route path="/curriculum/unit/:unitNumber" component={UnitDetail} />
            <Route path="/curriculum/unit/:unitNumber/lesson/:lessonId" component={LessonDetail} />
            <Route path="/curriculum/unit/:unitNumber/quiz" component={Quiz} />
            <Route path="/tutor" component={Tutor} />
            <Route path="/diagnostic" component={Diagnostic} />
            <Route path="/course-welcome" component={CourseWelcome} />
            <Route path="/progress" component={Progress} />
            <Route path="/skills" component={Skills} />
            <Route path="/parent" component={ParentDashboard} />
            <Route path="/profile" component={Profile} />
            <Route path="/referrals" component={Referrals} />
            <Route path="/billing" component={Billing} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <PaletteProvider>
          <TooltipProvider>
            <Toaster richColors position="top-right" />
            <Router />
          </TooltipProvider>
        </PaletteProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
