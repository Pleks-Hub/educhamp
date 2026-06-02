import { useState, useEffect, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  CreditCard,
  Shield,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Lock,
  Sparkles,
  Users,
  BookOpen,
  Brain,
} from "lucide-react";
import { useLocation } from "wouter";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "");

const PLAN_FEATURES: Record<string, { name: string; price: string; students: number; features: string[]; color: string; popular?: boolean }> = {
  free: {
    name: "Free Plan",
    price: "$0",
    students: 1,
    features: ["1 student", "Full curriculum access", "AI tutor (basic)", "Progress tracking"],
    color: "border-slate-200 bg-slate-50",
  },
  family: {
    name: "Family Plan",
    price: "$19.99/mo",
    students: 3,
    features: ["Up to 3 students", "Full curriculum access", "AI tutor (enhanced)", "Detailed analytics", "Priority support"],
    color: "border-indigo-200 bg-indigo-50",
  },
  premium_family: {
    name: "Premium Family",
    price: "$29.99/mo",
    students: 5,
    features: ["Up to 5 students", "Full curriculum access", "AI tutor (priority)", "Advanced analytics", "Priority support", "Early access to new features"],
    color: "border-purple-200 bg-purple-50",
    popular: true,
  },
};

function CardCaptureForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSetupIntent = trpc.payment.createSetupIntent.useMutation();
  const confirmCard = trpc.payment.confirmCardAndActivateFreePlan.useMutation();
  const utils = trpc.useUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create SetupIntent
      const { clientSecret, stripeCustomerId } = await createSetupIntent.mutateAsync({
        origin: window.location.origin,
      });

      if (!clientSecret) {
        throw new Error("Could not create setup intent");
      }

      // Step 2: Confirm card with Stripe
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { setupIntent, error: stripeError } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (stripeError) {
        throw new Error(stripeError.message ?? "Card verification failed");
      }

      if (!setupIntent?.payment_method) {
        throw new Error("No payment method returned");
      }

      // Step 3: Confirm card and activate free plan
      await confirmCard.mutateAsync({
        paymentMethodId: setupIntent.payment_method as string,
        stripeCustomerId,
      });

      // Invalidate billing queries
      utils.payment.getBillingStatus.invalidate();
      utils.payment.getMySubscription.invalidate();

      toast.success("Card saved! Your free plan is now active.");
      onSuccess();
    } catch (err: any) {
      const msg = err?.message ?? "Failed to save card. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Card information</label>
        <div className="rounded-lg border border-input bg-background px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#1a1a2e",
                  "::placeholder": { color: "#9ca3af" },
                  fontFamily: "system-ui, -apple-system, sans-serif",
                },
                invalid: { color: "#ef4444" },
              },
              hidePostalCode: false,
            }}
            onChange={(e) => {
              setCardComplete(e.complete);
              setError(e.error?.message ?? null);
            }}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        <span>Your card is securely processed by Stripe. We never store your full card number.</span>
      </div>

      <Button
        type="submit"
        className="w-full gap-2"
        size="lg"
        disabled={loading || !cardComplete || !stripe}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving card...
          </>
        ) : (
          <>
            <Shield className="h-4 w-4" />
            Save card & activate free plan
          </>
        )}
      </Button>
    </form>
  );
}

export default function BillingSetup() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"card" | "plan" | "done">("card");
  const { data: billingStatus, isLoading } = trpc.payment.getBillingStatus.useQuery();

  // If user already has card on file, skip to plan selection or done
  useEffect(() => {
    if (billingStatus?.cardOnFile && billingStatus?.hasSubscription) {
      setStep("done");
    }
  }, [billingStatus]);

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (step === "done" || (billingStatus?.cardOnFile && billingStatus?.hasSubscription)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">You're all set!</h1>
          <p className="text-muted-foreground mt-2">
            Your billing is configured and your {billingStatus?.planName === "free" ? "free" : billingStatus?.planName} plan is active.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate("/dashboard")} className="gap-2" size="lg">
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate("/billing")} size="sm">
            Manage billing settings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
          <CreditCard className="h-7 w-7 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Set up billing</h1>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          A payment card on file is required to use EduChamp. You won't be charged — your free plan starts immediately.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3">
        <div className={`flex items-center gap-2 text-sm font-medium ${step === "card" ? "text-indigo-600" : "text-muted-foreground"}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === "card" ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"}`}>
            1
          </div>
          Card
        </div>
        <div className="w-8 h-px bg-border" />
        <div className={`flex items-center gap-2 text-sm font-medium ${step === "plan" ? "text-indigo-600" : "text-muted-foreground"}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === "plan" ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"}`}>
            2
          </div>
          Plan
        </div>
      </div>

      {step === "card" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-indigo-500" />
              Payment card
            </CardTitle>
            <CardDescription>
              Add a card to keep on file. You won't be charged for the free plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise}>
              <CardCaptureForm
                onSuccess={() => setStep("plan")}
              />
            </Elements>
          </CardContent>
        </Card>
      )}

      {step === "plan" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                Choose your plan
              </CardTitle>
              <CardDescription>
                Your free plan is active. Upgrade anytime to unlock more students and features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(PLAN_FEATURES).map(([key, plan]) => (
                <div
                  key={key}
                  className={`rounded-xl border p-4 ${plan.color} relative`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2.5 right-3 bg-purple-600 text-white text-xs">
                      Most Popular
                    </Badge>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{plan.name}</h3>
                      <p className="text-lg font-bold mt-0.5">{plan.price}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {plan.students} student{plan.students > 1 ? "s" : ""}
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {key !== "free" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => navigate(`/#pricing`)}
                    >
                      Upgrade to {plan.name}
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="text-center">
            <Button onClick={() => navigate("/dashboard")} className="gap-2" size="lg">
              Continue with Free Plan <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              You can upgrade anytime from the Billing page.
            </p>
          </div>
        </div>
      )}

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          SSL encrypted
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          PCI compliant
        </div>
        <div className="flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5" />
          Powered by Stripe
        </div>
      </div>
    </div>
  );
}
