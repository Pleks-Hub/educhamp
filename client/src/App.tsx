import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
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

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/curriculum" component={Curriculum} />
        <Route path="/curriculum/unit/:unitNumber" component={UnitDetail} />
        <Route path="/curriculum/unit/:unitNumber/lesson/:lessonId" component={LessonDetail} />
        <Route path="/curriculum/unit/:unitNumber/quiz" component={Quiz} />
        <Route path="/tutor" component={Tutor} />
        <Route path="/diagnostic" component={Diagnostic} />
        <Route path="/progress" component={Progress} />
        <Route path="/skills" component={Skills} />
        <Route path="/parent" component={ParentDashboard} />
        <Route path="/accept-invite" component={AcceptInvite} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
