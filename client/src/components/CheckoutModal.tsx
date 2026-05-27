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
                Continue to Secure Checkout
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
