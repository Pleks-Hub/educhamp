import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  Download,
  FileText,
  Receipt,
  Filter,
  X,
  ChevronDown,
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
  free: { name: "Free Plan", color: "text-slate-600" },
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

type SortOption = "newest" | "oldest" | "amount_high" | "amount_low";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "amount_high", label: "Amount: High to Low" },
  { value: "amount_low", label: "Amount: Low to High" },
];

function PaymentHistorySection() {
  const { data, isLoading } = trpc.payment.listMyInvoices.useQuery();

  const invoices = data?.invoices ?? [];

  // Filter & sort state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = dateFrom !== "" || dateTo !== "";
  const activeFilterCount = (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const filteredAndSorted = useMemo(() => {
    let result = [...invoices];

    // Apply date range filter
    if (dateFrom) {
      const fromTs = new Date(dateFrom).getTime();
      result = result.filter((inv) => inv.date >= fromTs);
    }
    if (dateTo) {
      const toTs = new Date(dateTo).setHours(23, 59, 59, 999);
      result = result.filter((inv) => inv.date <= toTs);
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => b.date - a.date);
        break;
      case "oldest":
        result.sort((a, b) => a.date - b.date);
        break;
      case "amount_high":
        result.sort((a, b) => (b.amountPaid || b.amountDue) - (a.amountPaid || a.amountDue));
        break;
      case "amount_low":
        result.sort((a, b) => (a.amountPaid || a.amountDue) - (b.amountPaid || b.amountDue));
        break;
    }

    return result;
  }, [invoices, dateFrom, dateTo, sortBy]);

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
  };

  const fmtInvDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const fmtInvAmount = (cents: number, currency: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "usd" }).format(cents / 100);

  const statusColor: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
    open: "bg-blue-100 text-blue-700 border-blue-200",
    draft: "bg-slate-100 text-slate-600 border-slate-200",
    void: "bg-slate-100 text-slate-500 border-slate-200",
    uncollectible: "bg-red-100 text-red-600 border-red-200",
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              Payment History
            </CardTitle>
            <CardDescription className="mt-1">
              View and download invoices and receipts for all past payments.
            </CardDescription>
          </div>
          {invoices.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="relative shrink-0"
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Filter & Sort
              {hasActiveFilters && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          )}
        </div>

        {/* Filter & Sort Controls */}
        {showFilters && invoices.length > 0 && (
          <div className="mt-3 p-3 rounded-lg border bg-muted/30 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              {/* Date From */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
              {/* Date To */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
              {/* Sort By */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Sort by</label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="h-8 appearance-none rounded-md border border-input bg-background pl-2.5 pr-7 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-pointer"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear dates
                </Button>
              )}
            </div>
            {/* Results summary */}
            <p className="text-xs text-muted-foreground">
              Showing {filteredAndSorted.length} of {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
              {hasActiveFilters && " (filtered)"}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto" />
            <p className="text-sm text-muted-foreground">
              No invoices yet. They will appear here after your first payment.
            </p>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Filter className="h-8 w-8 text-muted-foreground/50 mx-auto" />
            <p className="text-sm text-muted-foreground">
              No invoices match your filters.
            </p>
            <Button variant="link" size="sm" onClick={clearFilters} className="text-indigo-600">
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAndSorted.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {inv.number || inv.id.slice(0, 16)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${statusColor[inv.status ?? ""] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {inv.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fmtInvDate(inv.date)}
                    {inv.description ? ` — ${inv.description}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold shrink-0">
                  {fmtInvAmount(inv.amountPaid || inv.amountDue, inv.currency)}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {inv.invoicePdf && (
                    <a
                      href={inv.invoicePdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4 text-indigo-600" />
                    </a>
                  )}
                  {inv.hostedInvoiceUrl && (
                    <a
                      href={inv.hostedInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
                      title="View invoice online"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Billing() {
  const [, navigate] = useLocation();
  const [portalLoading, setPortalLoading] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"family" | "premium_family">("family");
  const [selectedBilling, setSelectedBilling] = useState<"monthly" | "annual">("monthly");
  const [changePlanLoading, setChangePlanLoading] = useState(false);

  const { data: sub, isLoading } = trpc.payment.getMySubscription.useQuery();
  const { data: billingStatus } = trpc.payment.getBillingStatus.useQuery();

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
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        {/* Subscription card skeleton */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
          <Skeleton className="h-px w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="h-9 flex-1 rounded-lg" />
          </div>
        </div>
        {/* Payment history skeleton */}
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
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

            {/* Card on file info */}
            {billingStatus?.cardOnFile && sub?.cardLast4 && (
              <div className="rounded-lg bg-muted/50 border px-4 py-3 flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize">
                    {sub.cardBrand ?? "Card"} ending in {sub.cardLast4}
                  </p>
                  {sub.cardExpMonth && sub.cardExpYear && (
                    <p className="text-xs text-muted-foreground">
                      Expires {String(sub.cardExpMonth).padStart(2, "0")}/{sub.cardExpYear}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                  Active
                </Badge>
              </div>
            )}

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
        /* No subscription — redirect to billing setup */
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Set up billing to get started</h3>
              <p className="text-sm text-muted-foreground mt-1">
                A payment card on file is required. Add a card to activate your free plan.
              </p>
            </div>
            <Button onClick={() => navigate("/billing/setup")} className="gap-2">
              Set up billing <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment History — Invoice List */}
      <PaymentHistorySection />

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
