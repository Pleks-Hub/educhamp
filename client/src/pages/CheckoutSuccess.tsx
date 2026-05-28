import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle, ArrowRight, BookOpen } from "lucide-react";
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-6">
            <CheckCircle className="h-16 w-16 text-emerald-500" />
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to EduChamp!
          </h1>
          <p className="text-muted-foreground">
            Your subscription is now active. You're all set to start learning.
          </p>
        </div>

        {/* Subscription summary */}
        {subscription && (
          <div className="rounded-xl border bg-card p-4 text-left space-y-2">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
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

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link href="/dashboard">
              <BookOpen className="h-4 w-4" />
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>

        {/* Receipt note */}
        <p className="text-xs text-muted-foreground">
          A receipt has been sent to your email. You can manage your subscription
          at any time from your account settings.
        </p>
      </div>
    </div>
  );
}
