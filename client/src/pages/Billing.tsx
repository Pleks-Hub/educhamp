import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Zap,
  Calendar,
  DollarSign,
  ArrowRight,
  ArrowUpDown,
  Check,
} from "lucide-react";
import { useLocation } from "wouter";
import { NavTooltip } from "@/components/NavTooltip";
import { BILLING_TOOLTIPS } from "@/lib/tooltipContent";

const STATUS_BADGE: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  active: { label: "Active", class: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  trialing: { label: "Trial", class: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  past_due: { label: "Past Due", class: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle },
  canceled: { label: "Canceled", class: "bg-red-100 text-red-600 border-red-200", icon: AlertTriangle },
  unpaid: { label: "Unpaid", class: "bg-rose-100 text-rose-700 border-rose-200", icon: AlertTriangle },
  incomplete: { label: "Incomplete", class: "bg-slate-100 text-slate-600 border-slate-200", icon: Clock },
};

const PLAN_DISPLAY: Record<string, { name: string; color: string }> = {
  family: { name: "Family Plan", color: "text-indigo-600" },
  premium_family: { name: "Premium Family", color: "text-purple-600" },
  isd_school: { name: "ISD / School", color: "text-blue-600" },
};

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function fmtAmount(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const PLAN_OPTIONS = [
  {
    key: "family" as const,
    name: "Family Plan",
    description: "Up to 3 students, full curriculum access",
    monthlyPrice: "$19.99",
    annualPrice: "$15.99",
    selectedColor: "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-400",
    idleColor: "border-indigo-200 bg-indigo-50 hover:border-indigo-300",
    badge: null as string | null,
  },
  {
    key: "premium_family" as const,
    name: "Premium Family",
    description: "Unlimited students, priority AI tutor, advanced analytics",
    monthlyPrice: "$29.99",
    annualPrice: "$23.99",
    selectedColor: "border-purple-500 bg-purple-50 ring-2 ring-purple-400",
    idleColor: "border-purple-200 bg-purple-50 hover:border-purple-300",
    badge: "Most Popular" as string | null,
  },
];

export default function Billing() {
  const [, navigate] = useLocation();
  const [portalLoading, setPortalLoading] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"family" | "premium_family">("family");
  const [selectedBilling, setSelectedBilling] = useState<"monthly" | "annual">("monthly");
  const [changePlanLoading, setChangePlanLoading] = useState(false);

  const { data: sub, isLoading } = trpc.payment.getMySubscription.useQuery();

  // Show success toast when returning from plan change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("plan_changed") === "1") {
      toast.success("Plan updated successfully! Your new plan is now active.");
      window.history.replaceState({}, "", "/billing");
    }
  }, []);

  // Pre-select current plan when modal opens
  useEffect(() => {
    if (changePlanOpen && sub) {
      if (sub.planName === "family" || sub.planName === "premium_family") {
        setSelectedPlan(sub.planName);
      }
      setSelectedBilling((sub.billingPeriod as "monthly" | "annual") ?? "monthly");
    }
  }, [changePlanOpen, sub]);

  const changePlanMutation = trpc.payment.changePlan.useMutation({
    onSuccess: ({ url }) => {
      if (url) {
        toast.info("Redirecting to Stripe to complete your plan change…");
        window.open(url, "_blank");
      }
      setChangePlanLoading(false);
      setChangePlanOpen(false);
    },
    onError: (err) => {
      toast.error(err.message ?? "Could not initiate plan change.");
      setChangePlanLoading(false);
    },
  });

  const createPortal = trpc.payment.createPortalSession.useMutation({
    onSuccess: ({ url }) => {
      window.open(url, "_blank");
      setPortalLoading(false);
    },
    onError: (err) => {
      toast.error(err.message ?? "Could not open billing portal.");
      setPortalLoading(false);
    },
  });

  const handleOpenPortal = () => {
    setPortalLoading(true);
    createPortal.mutate({ origin: window.location.origin });
  };

  const handleChangePlan = () => {
    setChangePlanLoading(true);
    changePlanMutation.mutate({
      planKey: selectedPlan,
      billingPeriod: selectedBilling,
      origin: window.location.origin,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading billing info…
      </div>
    );
  }

  const statusInfo = sub?.status ? STATUS_BADGE[sub.status] : null;
  const planInfo = sub?.planName ? PLAN_DISPLAY[sub.planName] : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your EduChamp subscription, payment methods, and billing history.
        </p>
      </div>

      {/* Current subscription card */}
      {sub ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-500" />
                Current Subscription
              </CardTitle>
              {statusInfo && (
                <Badge
                  variant="outline"
                  className={`flex items-center gap-1 capitalize ${statusInfo.class}`}
                >
                  <statusInfo.icon className="h-3 w-3" />
                  {statusInfo.label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Plan</p>
                <p className={`font-semibold ${planInfo?.color ?? "text-foreground"}`}>
                  {planInfo?.name ?? sub.planName}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Billing</p>
                <p className="font-semibold capitalize">{sub.billingPeriod}</p>
              </div>
              {sub.amountCents !== null && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Amount</p>
                  <p className="font-semibold">
                    {fmtAmount(sub.amountCents)}
                    <span className="text-muted-foreground font-normal text-xs ml-1">
                      /{sub.billingPeriod === "annual" ? "yr" : "mo"}
                    </span>
                  </p>
                </div>
              )}
              {sub.currentPeriodEnd && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    {sub.cancelAtPeriodEnd ? "Ends" : "Renews"}
                  </p>
                  <p className="font-semibold flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {fmtDate(sub.currentPeriodEnd)}
                  </p>
                </div>
              )}
              {sub.trialEnd && new Date(sub.trialEnd) > new Date() && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Trial ends</p>
                  <p className="font-semibold text-blue-600 flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5" />
                    {fmtDate(sub.trialEnd)}
                  </p>
                </div>
              )}
            </div>

            {sub.cancelAtPeriodEnd && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                Your subscription is set to cancel on {fmtDate(sub.currentPeriodEnd)}. Reactivate below to continue access.
              </div>
            )}

            <Separator />

            <div className="flex flex-col sm:flex-row gap-2">
              {/* Change Plan — primary CTA */}
              <NavTooltip content="Switch to a different plan or billing period." side="top">
                <Button
                  variant="default"
                  className="flex-1 gap-2"
                  onClick={() => setChangePlanOpen(true)}
                  disabled={!sub.stripeCustomerId}
                >
                  <ArrowUpDown className="h-4 w-4" />
                  Change Plan
                </Button>
              </NavTooltip>
              {/* Manage billing portal — secondary */}
              <NavTooltip content={BILLING_TOOLTIPS.manageSubscription} side="top">
                <Button
                  variant="outline"
                  onClick={handleOpenPortal}
                  disabled={portalLoading || !sub.stripeCustomerId}
                  className="flex-1 gap-2"
                >
                  {portalLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Manage Billing
                </Button>
              </NavTooltip>
            </div>
            {!sub.stripeCustomerId && (
              <p className="text-xs text-muted-foreground">
                Stripe portal not available for this subscription.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Use <strong>Change Plan</strong> to switch plans in-app. Use <strong>Manage Billing</strong> to update payment methods, download invoices, or cancel.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* No subscription */
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">No active subscription</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You are currently on the free plan. Upgrade to unlock all features.
              </p>
            </div>
            <NavTooltip content={BILLING_TOOLTIPS.upgrade} side="top">
              <Button onClick={() => navigate("/#pricing")} className="gap-2">
                View Plans <ArrowRight className="h-4 w-4" />
              </Button>
            </NavTooltip>
          </CardContent>
        </Card>
      )}

      {/* Payment history note */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Payment History
          </CardTitle>
          <CardDescription>
            View and download all past invoices and receipts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Full payment history, invoices, and receipts are available in the{" "}
            <button
              className="text-indigo-600 hover:underline font-medium"
              onClick={handleOpenPortal}
              disabled={portalLoading || !sub?.stripeCustomerId}
            >
              Stripe billing portal
            </button>
            . Click "Manage Billing & Invoices" above to access them.
          </p>
        </CardContent>
      </Card>

      {/* Help */}
      <p className="text-xs text-center text-muted-foreground">
        Questions about billing?{" "}
        <a href="mailto:support@educhamp.app" className="text-indigo-600 hover:underline">
          Contact support
        </a>
      </p>

      {/* ── Change Plan Modal ────────────────────────────────────────────────────────── */}
      <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5 text-indigo-500" />
              Change Your Plan
            </DialogTitle>
            <DialogDescription>
              Select the plan and billing period you want to switch to. You will be redirected to Stripe to confirm the change.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Billing period toggle */}
            <div className="flex rounded-lg border p-1 gap-1 bg-muted/40">
              <button
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                  selectedBilling === "monthly"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setSelectedBilling("monthly")}
              >
                Monthly
              </button>
              <button
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                  selectedBilling === "annual"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setSelectedBilling("annual")}
              >
                Annual
                <span className="ml-1.5 text-xs text-emerald-600 font-semibold">Save 20%</span>
              </button>
            </div>

            {/* Plan cards */}
            <div className="space-y-3">
              {PLAN_OPTIONS.map((plan) => {
                const isSelected = selectedPlan === plan.key;
                const price = selectedBilling === "annual" ? plan.annualPrice : plan.monthlyPrice;
                const isCurrentPlan = sub?.planName === plan.key && sub?.billingPeriod === selectedBilling;

                return (
                  <button
                    key={plan.key}
                    className={`w-full text-left rounded-xl border p-4 transition-all duration-150 ${
                      isSelected ? plan.selectedColor : plan.idleColor
                    }`}
                    onClick={() => setSelectedPlan(plan.key)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{plan.name}</span>
                          {plan.badge && (
                            <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 rounded-full px-2 py-0.5 font-medium">
                              {plan.badge}
                            </span>
                          )}
                          {isCurrentPlan && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 font-medium">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="font-bold text-base">{price}</span>
                          <span className="text-xs text-muted-foreground">/mo</span>
                          {selectedBilling === "annual" && (
                            <p className="text-xs text-muted-foreground">billed annually</p>
                          )}
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? "border-indigo-500 bg-indigo-500" : "border-muted-foreground/40"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              You will be taken to Stripe to confirm payment. Proration is handled automatically.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setChangePlanOpen(false)} disabled={changePlanLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleChangePlan}
              disabled={changePlanLoading}
              className="gap-2"
            >
              {changePlanLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpDown className="h-4 w-4" />
              )}
              Confirm & Proceed to Stripe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
