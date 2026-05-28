import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Tag,
  CreditCard,
  Shield,
  ArrowRight,
  X,
  Gift,
} from "lucide-react";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  planKey: "family" | "premium_family";
  planName: string;
  billingPeriod: "monthly" | "annual";
  amountCents: number;
}

export function CheckoutModal({
  open,
  onClose,
  planKey,
  planName,
  billingPeriod,
  amountCents,
}: CheckoutModalProps) {
  const [couponCode, setCouponCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [couponError, setCouponError] = useState("");

  const { data: user } = trpc.auth.me.useQuery();

  // Coupon validation query (only fires when appliedCode is set)
  const {
    data: couponResult,
    isFetching: validatingCoupon,
    refetch: revalidateCoupon,
  } = trpc.payment.validateCoupon.useQuery(
    {
      code: appliedCode,
      planKey,
      billingPeriod,
      userId: user?.id,
    },
    {
      enabled: !!appliedCode,
      retry: false,
    }
  );

  // Save billing period mutation
  const saveBillingPeriod = trpc.payment.saveBillingPeriod.useMutation();

  // Checkout session mutation
  const createCheckout = trpc.payment.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.info("Redirecting to secure checkout…");
        onClose();
      }
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to start checkout. Please try again.");
    },
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setCouponCode("");
      setAppliedCode("");
      setCouponError("");
    }
  }, [open]);

  const handleApplyCoupon = () => {
    const trimmed = couponCode.trim().toUpperCase();
    if (!trimmed) return;
    setCouponError("");
    setAppliedCode(trimmed);
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setAppliedCode("");
    setCouponError("");
  };

  useEffect(() => {
    if (couponResult && !couponResult.valid) {
      setCouponError((couponResult as any).reason ?? "Invalid coupon.");
      setAppliedCode("");
    }
  }, [couponResult]);

  const validCoupon =
    couponResult && couponResult.valid ? couponResult : null;

  const displayOriginal = amountCents;
  const displayDiscount = validCoupon ? validCoupon.discountAmountCents : 0;
  const displayFinal = validCoupon ? validCoupon.finalAmountCents : amountCents;

  const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Please sign in to continue.");
      return;
    }
    // Persist billing period to server
    await saveBillingPeriod.mutateAsync({ billingPeriod });

    createCheckout.mutate({
      planKey,
      billingPeriod,
      couponCode: validCoupon ? appliedCode : undefined,
      origin: window.location.origin,
    });
  };

  const isAnnual = billingPeriod === "annual";
  const perMonthDisplay = isAnnual
    ? fmt(Math.round(displayFinal / 12))
    : fmt(displayFinal);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-500" />
            Complete Your Subscription
          </DialogTitle>
          <DialogDescription>
            You're subscribing to <strong>{planName}</strong> —{" "}
            {isAnnual ? "billed annually" : "billed monthly"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Free trial banner */}
          <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800 px-3 py-2.5">
            <Gift className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">14-day free trial included</span>
              <span className="text-indigo-600/80 dark:text-indigo-400/80 ml-1">
                — first charge on {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Plan summary */}
          <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{planName}</span>
              <Badge variant="secondary">
                {isAnnual ? "Annual" : "Monthly"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Base price</span>
              <span>{fmt(displayOriginal)}{isAnnual ? "/yr" : "/mo"}</span>
            </div>
            {validCoupon && (
              <div className="flex items-center justify-between text-sm text-emerald-600">
                <span className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  {validCoupon.couponName}
                </span>
                <span>−{fmt(displayDiscount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between font-semibold">
              <span>Total</span>
              <span className="text-lg">
                {fmt(displayFinal)}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {isAnnual ? "/yr" : "/mo"}
                </span>
              </span>
            </div>
            {isAnnual && (
              <p className="text-xs text-muted-foreground text-right">
                That's {perMonthDisplay}/mo — save 20% vs monthly
              </p>
            )}
          </div>

          {/* Coupon code entry */}
          {!validCoupon ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Promo / Coupon Code</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code (e.g. WELCOME20)"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  className="uppercase"
                />
                <Button
                  variant="outline"
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim() || validatingCoupon}
                >
                  {validatingCoupon ? <Spinner className="h-4 w-4" /> : "Apply"}
                </Button>
              </div>
              {couponError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" />
                  {couponError}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-3 py-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {appliedCode} — {fmt(displayDiscount)} off
                </span>
              </div>
              <button
                onClick={handleRemoveCoupon}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Accepted payment methods */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">Accepted payment methods</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {/* Card */}
              <div className="flex items-center gap-1 rounded border px-2 py-1 bg-muted/40 text-xs font-medium">
                <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                Credit / Debit Card
              </div>
              {/* PayPal */}
              <div className="flex items-center gap-1 rounded border px-2 py-1 bg-[#FFC439]/10 border-[#FFC439]/40 text-xs font-medium text-[#003087]">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.26-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.477z"/>
                </svg>
                PayPal
              </div>
              {/* ACH */}
              <div className="flex items-center gap-1 rounded border px-2 py-1 bg-emerald-50 border-emerald-200 text-xs font-medium text-emerald-700">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M11.5 1L2 6v2h19V6L11.5 1zM2 21h19v-2H2v2zm0-5h19v-2H2v2zM4 10v7h2v-7H4zm5 0v7h2v-7H9zm5 0v7h2v-7h-2zm5 0v7h2v-7h-2z"/>
                </svg>
                Bank / ACH
              </div>
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 mt-0.5 shrink-0 text-indigo-400" />
            <span>
              Payments are processed securely by Stripe. EduChamp never stores
              your card details. Cancel anytime from your account settings.
            </span>
          </div>

          {/* CTA */}
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={handleCheckout}
            disabled={createCheckout.isPending || saveBillingPeriod.isPending}
          >
            {createCheckout.isPending ? (
              <>
                <Spinner className="h-4 w-4" />
                Opening Checkout…
              </>
            ) : (
              <>
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Use card <code className="font-mono">4242 4242 4242 4242</code> for
            test payments.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
