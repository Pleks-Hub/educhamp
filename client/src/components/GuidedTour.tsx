/**
 * GuidedTour.tsx
 * First-login welcome modal that walks new students through the platform.
 * Shown once after onboarding is complete, dismissed via localStorage flag.
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  ClipboardList,
  Brain,
  BarChart2,
  Users,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";

const TOUR_KEY = "educhamp_tour_v1_seen";

interface TourStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  tip?: string;
}

const STUDENT_STEPS: TourStep[] = [
  {
    icon: <GraduationCap className="h-10 w-10 text-primary" />,
    title: "Welcome to EduChamp!",
    description:
      "EduChamp is your personalised learning companion for Katy ISD courses. You can study multiple subjects, track your progress, and get help from an AI tutor — all in one place.",
    badge: "Let's get started",
    badgeColor: "bg-primary text-primary-foreground",
  },
  {
    icon: <ClipboardList className="h-10 w-10 text-amber-500" />,
    title: "Step 1 — Take the Placement Test",
    description:
      "Your first step is the Diagnostic Assessment. It takes about 15 minutes and places you at the right starting point in your course so you don't waste time on things you already know.",
    badge: "Recommended first action",
    badgeColor: "bg-amber-100 text-amber-800",
    tip: "Find it in the sidebar under Diagnostic.",
  },
  {
    icon: <BookOpen className="h-10 w-10 text-blue-500" />,
    title: "Step 2 — Follow Your Learning Path",
    description:
      "Your Curriculum page shows all units in your active course. Units unlock one at a time — complete all lessons in a unit and pass the quiz to unlock the next one. Your progress is saved automatically.",
    badge: "Sequential progression",
    badgeColor: "bg-blue-100 text-blue-800",
    tip: "Locked units show a padlock icon. Hover to see what's required.",
  },
  {
    icon: <Brain className="h-10 w-10 text-purple-500" />,
    title: "Step 3 — Ask the AI Tutor",
    description:
      "Stuck on a concept? Open the AI Tutor from any lesson or from the sidebar. It knows your current unit, your mastery scores, and your learning goals — so it gives you personalised help, not generic answers.",
    badge: "Available 24/7",
    badgeColor: "bg-purple-100 text-purple-800",
    tip: "Try asking: \"Explain solving two-step equations with an example.\"",
  },
  {
    icon: <BarChart2 className="h-10 w-10 text-green-500" />,
    title: "Step 4 — Track Your Progress",
    description:
      "The Progress page shows your mastery score for every skill. The Dashboard shows your active course, completed units, and recent quiz scores. You can enrol in multiple courses and switch between them from the sidebar.",
    badge: "Multi-course support",
    badgeColor: "bg-green-100 text-green-800",
    tip: "Use the course switcher (book icon in the sidebar) to add or switch courses.",
  },
  {
    icon: <Users className="h-10 w-10 text-rose-500" />,
    title: "Your Parent Can See Your Progress",
    description:
      "If your parent or guardian linked your account, they can see your quiz scores, skill mastery, and learning goals — but they cannot change your course or answers. They're here to support you!",
    badge: "Parent visibility",
    badgeColor: "bg-rose-100 text-rose-800",
  },
  {
    icon: <CheckCircle2 className="h-10 w-10 text-primary" />,
    title: "You're all set!",
    description:
      "Start with the Diagnostic Assessment to get your personalised placement, then follow your learning path unit by unit. Good luck — you've got this!",
    badge: "Ready to learn",
    badgeColor: "bg-primary text-primary-foreground",
    tip: "You can replay this tour anytime from your Profile settings.",
  },
];

const PARENT_STEPS: TourStep[] = [
  {
    icon: <GraduationCap className="h-10 w-10 text-primary" />,
    title: "Welcome to EduChamp!",
    description:
      "EduChamp helps you monitor and support your child's learning journey across all their Katy ISD courses. Here's a quick overview of what you can do.",
    badge: "Parent & Guardian Guide",
    badgeColor: "bg-primary text-primary-foreground",
  },
  {
    icon: <Users className="h-10 w-10 text-blue-500" />,
    title: "Add Your Child",
    description:
      "Go to the Parent Dashboard and click \"Enrol Child\". You can send your child a secure invite link, link an existing account by email, or create a new student account. You can add multiple children.",
    badge: "Multiple children supported",
    badgeColor: "bg-blue-100 text-blue-800",
    tip: "Your child must accept the invite and complete their profile before you can see their progress.",
  },
  {
    icon: <BarChart2 className="h-10 w-10 text-green-500" />,
    title: "Monitor Progress Across All Courses",
    description:
      "Each child's card shows their active course, completed units, quiz scores, and skill mastery. Click a child's card to see a detailed breakdown by course, including skill gaps and learning insights.",
    badge: "Per-course progress cards",
    badgeColor: "bg-green-100 text-green-800",
  },
  {
    icon: <Sparkles className="h-10 w-10 text-purple-500" />,
    title: "Set Goals & Add Notes",
    description:
      "In the child detail panel, use the Goals & Notes tab to set study goals (e.g. \"Master linear equations by June\") and add private notes about your child's learning. The AI tutor will use these goals to personalise its coaching.",
    badge: "AI-aligned goals",
    badgeColor: "bg-purple-100 text-purple-800",
  },
  {
    icon: <CheckCircle2 className="h-10 w-10 text-primary" />,
    title: "You're all set!",
    description:
      "Start by adding your child from the Parent Dashboard. Once they complete the Diagnostic Assessment, you'll see their personalised learning path and progress here.",
    badge: "Ready",
    badgeColor: "bg-primary text-primary-foreground",
  },
];

interface GuidedTourProps {
  accountType?: string;
  forceShow?: boolean;
  onClose?: () => void;
}

export function GuidedTour({ accountType, forceShow, onClose }: GuidedTourProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const steps = accountType === "parent" ? PARENT_STEPS : STUDENT_STEPS;

  useEffect(() => {
    if (forceShow) {
      setOpen(true);
      setStep(0);
      return;
    }
    const seen = localStorage.getItem(TOUR_KEY);
    if (!seen) {
      // Small delay so the page renders first
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [forceShow]);

  function handleClose() {
    localStorage.setItem(TOUR_KEY, "1");
    setOpen(false);
    onClose?.();
  }

  function handleNext() {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleClose();
    }
  }

  function handlePrev() {
    setStep((s) => Math.max(0, s - 1));
  }

  const current = steps[step];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden" aria-describedby="tour-description">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-6 space-y-4">
          {/* Step indicator */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Step {step + 1} of {steps.length}
            </span>
            {current.badge && (
              <Badge className={`text-xs ${current.badgeColor}`}>
                {current.badge}
              </Badge>
            )}
          </div>

          {/* Icon + title */}
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="rounded-2xl bg-muted/50 p-4">
              {current.icon}
            </div>
            <h2 className="text-xl font-bold tracking-tight">{current.title}</h2>
          </div>

          {/* Description */}
          <p id="tour-description" className="text-sm text-muted-foreground leading-relaxed text-center">
            {current.description}
          </p>

          {/* Tip */}
          {current.tip && (
            <div className="rounded-lg bg-muted/60 border px-4 py-2.5 flex items-start gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">{current.tip}</p>
            </div>
          )}

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 pt-1">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === step ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={step === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-muted-foreground text-xs"
            >
              Skip tour
            </Button>

            <Button size="sm" onClick={handleNext} className="gap-1">
              {step === steps.length - 1 ? "Get started" : "Next"}
              {step < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
