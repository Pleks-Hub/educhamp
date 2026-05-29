import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle, ArrowRight, BookOpen, Users, ClipboardList, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { trackTrialStarted } from "@/lib/analytics";

export default function CheckoutSuccess() {
  const [, navigate] = useLocation();
  const { data: user } = trpc.auth.me.useQuery();
  const { data: subscription } = trpc.payment.getMySubscription.useQuery(undefined, {
    enabled: !!user,
  });

  // Track trial_started conversion event once subscription data is available
  const tracked = useRef(false);
  useEffect(() => {
    if (!tracked.current && subscription) {
      tracked.current = true;
      trackTrialStarted({
        plan: subscription.planName,
        billingPeriod: subscription.billingPeriod as "monthly" | "annual",
      });
    }
  }, [subscription]);

  // Clear billing period from sessionStorage now that checkout is complete
  useEffect(() => {
    sessionStorage.removeItem("educhamp_billing_period");
    sessionStorage.removeItem("educhamp_selected_plan");
  }, []);

  const isParent = user?.accountType === "parent";

  // Personalised next steps based on account type
  const nextSteps = isParent
    ? [
        {
          icon: <Users className="h-5 w-5 text-primary" />,
          title: "Invite your child",
          description: "Add your child's account so they can start learning right away.",
          href: "/parent",
          cta: "Go to Parent Dashboard",
          primary: true,
        },
        {
          icon: <ClipboardList className="h-5 w-5 text-muted-foreground" />,
          title: "View the curriculum",
          description: "Explore 56+ courses aligned to your child's grade level.",
          href: "/courses",
          cta: "Browse Courses",
          primary: false,
        },
      ]
    : [
        {
          icon: <ClipboardList className="h-5 w-5 text-primary" />,
          title: "Take your placement test",
          description: "Find your exact starting point in minutes. No pressure — it adapts to you.",
          href: "/diagnostic",
          cta: "Start Placement Test",
          primary: true,
        },
        {
          icon: <UserCircle className="h-5 w-5 text-muted-foreground" />,
          title: "Complete your profile",
          description: "Tell EduBot your name and learning goals for a personalised experience.",
          href: "/profile",
          cta: "Set Up Profile",
          primary: false,
        },
      ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="max-w-lg w-full text-center space-y-6">
        {/* Success icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-6">
            <CheckCircle className="h-16 w-16 text-emerald-500" />
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {user?.name ? `Welcome, ${user.name.split(" ")[0]}!` : "Welcome to EduChamp!"}
          </h1>
          <p className="text-muted-foreground">
            Your subscription is active. Here's how to get the most out of EduChamp right now.
          </p>
        </div>

        {/* Subscription summary */}
        {subscription && (
          <div className="rounded-xl border bg-card p-4 text-left space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Your Plan
            </p>
            <div className="flex items-center justify-between">
              <span className="font-semibold capitalize">
                {subscription.planName.replace("_", " ")}
              </span>
              <span className="text-sm text-muted-foreground capitalize">
                {subscription.billingPeriod} billing
              </span>
            </div>
            {subscription.currentPeriodEnd && (
              <p className="text-xs text-muted-foreground">
                Next renewal:{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Personalised next steps */}
        <div className="space-y-3 text-left">
          <p className="text-sm font-semibold text-center text-muted-foreground uppercase tracking-wide">
            What's next
          </p>
          {nextSteps.map((step, i) => (
            <Link key={i} href={step.href}>
              <div
                className={`rounded-xl border p-4 flex items-start gap-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  step.primary
                    ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                    : "bg-card hover:bg-muted/50"
                }`}
              >
                <div className={`mt-0.5 p-2 rounded-lg ${step.primary ? "bg-primary/10" : "bg-muted"}`}>
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {/* Go to dashboard fallback */}
        <Button variant="ghost" asChild className="w-full gap-2">
          <Link href="/">
            <BookOpen className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </Button>

        {/* Receipt note */}
        <p className="text-xs text-muted-foreground">
          A receipt has been sent to your email. You can manage your subscription
          at any time from <Link href="/billing" className="underline underline-offset-2">Billing</Link>.
        </p>
      </div>
    </div>
  );
}
