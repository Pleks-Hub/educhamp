import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Brain, GraduationCap, BarChart3, MessageCircle,
  ChevronRight, ChevronLeft, Sparkles, CheckCircle2, Rocket
} from "lucide-react";

const STEPS = [
  {
    icon: Sparkles,
    title: "Welcome to EduChamp!",
    description: "Your AI-powered learning platform is ready. Let's take a quick tour of what you can do here.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: BookOpen,
    title: "Browse Your Courses",
    description: "Access your enrolled courses from the Curriculum page. Each course has units, lessons, and practice problems tailored to your level.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Brain,
    title: "AI Tutor — Your Study Buddy",
    description: "Chat with EduBot anytime! It can teach concepts, quiz you, help with practice problems, and review for exams — all adapted to your current skill level.",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: GraduationCap,
    title: "Diagnostic Assessment",
    description: "Take a quick placement test to find your starting point. The AI will adapt your learning path based on your strengths and areas to improve.",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: BarChart3,
    title: "Track Your Progress",
    description: "See your mastery level for each skill, track quiz scores, and watch yourself improve over time. Your parent can also see your progress!",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
  },
  {
    icon: Rocket,
    title: "You're All Set!",
    description: "Start learning at your own pace. Remember — every expert was once a beginner. Let's get started!",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
  },
];

export default function StudentWelcome() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;
  const firstName = user?.name?.split(" ")[0] || "Student";

  const handleFinish = () => {
    // Store that onboarding is complete in localStorage
    localStorage.setItem("educhamp_student_onboarded", "true");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentStep ? "w-8 bg-primary" : i < currentStep ? "w-2 bg-primary/60" : "w-2 bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>

        <Card className="border-0 shadow-xl bg-card/95 backdrop-blur-sm">
          <CardContent className="p-8 text-center space-y-6">
            {/* Icon */}
            <div className={`mx-auto w-20 h-20 rounded-2xl ${step.bgColor} flex items-center justify-center transition-all duration-300`}>
              <step.icon className={`h-10 w-10 ${step.color}`} />
            </div>

            {/* Greeting on first step */}
            {isFirst && (
              <Badge variant="secondary" className="text-sm px-3 py-1">
                Hi {firstName}! 👋
              </Badge>
            )}

            {/* Title & Description */}
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground">{step.title}</h1>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </div>

            {/* Feature highlights on last step */}
            {isLast && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { icon: BookOpen, label: "Courses" },
                  { icon: Brain, label: "AI Tutor" },
                  { icon: GraduationCap, label: "Quizzes" },
                  { icon: BarChart3, label: "Progress" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-foreground font-medium">{label}</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 ml-auto" />
                  </div>
                ))}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4">
              {!isFirst ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep((s) => s - 1)}
                  className="gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFinish}
                  className="text-muted-foreground"
                >
                  Skip Tour
                </Button>
              )}

              {isLast ? (
                <Button onClick={handleFinish} className="gap-1.5 px-6">
                  Start Learning
                  <Rocket className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => setCurrentStep((s) => s + 1)} className="gap-1.5">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skip link */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          You can always revisit this from your Profile settings.
        </p>
      </div>
    </div>
  );
}
