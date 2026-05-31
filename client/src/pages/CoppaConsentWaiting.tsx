/**
 * CoppaConsentWaiting.tsx
 *
 * Shown to students under 13 who have submitted a parental consent request
 * and are waiting for their parent to approve it.
 *
 * Polls trpc.coppa.consentStatus every 15 seconds.
 * Allows resending the consent email (rate-limited to once per 10 minutes).
 * Redirects to /dashboard on approval.
 */
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  ShieldCheck,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

const POLL_INTERVAL_MS = 15_000;
const RESEND_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

export default function CoppaConsentWaiting() {
  const [, navigate] = useLocation();

  // Consent status polling
  const { data: status, refetch } = trpc.coppa.consentStatus.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  // Resend mutation
  const [lastResent, setLastResent] = useState<number | null>(null);
  const [parentEmail, setParentEmail] = useState("");
  const [showResendForm, setShowResendForm] = useState(false);
  const resendMutation = trpc.coppa.requestConsent.useMutation({
    onSuccess: () => {
      setLastResent(Date.now());
      setShowResendForm(false);
      toast.success("Consent email resent. Ask your parent to check their inbox.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to resend. Please try again later.");
    },
  });

  // Redirect on approval
  useEffect(() => {
    if (status?.status === "approved") {
      toast.success("Parental consent approved! Welcome to EduChamp.");
      navigate("/dashboard");
    }
  }, [status?.status, navigate]);

  // If gate is not required, redirect to dashboard
  useEffect(() => {
    if (status && !status.required) {
      navigate("/dashboard");
    }
  }, [status, navigate]);

  const canResend =
    lastResent === null || Date.now() - lastResent > RESEND_COOLDOWN_MS;

  const resendCooldownSeconds = lastResent
    ? Math.max(0, Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - lastResent)) / 1000))
    : 0;

  function handleResend() {
    if (!parentEmail.trim()) {
      toast.error("Please enter your parent's email address.");
      return;
    }
    resendMutation.mutate({
      parentEmail: parentEmail.trim(),
      origin: window.location.origin,
    });
  }

  const consentStatus = status?.status;

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">EduChamp</span>
          </div>
          <p className="text-muted-foreground text-sm">Parental Consent Required</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-lg">
              {!status && "Checking status…"}
              {consentStatus === "not_requested" && "Request Parental Consent"}
              {consentStatus === "pending" && "Waiting for Parent Approval"}
              {consentStatus === "approved" && "Approved!"}
              {consentStatus === "denied" && "Access Denied"}
              {consentStatus === "expired" && "Consent Request Expired"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Loading */}
            {!status && (
              <div className="flex justify-center py-8">
                <Spinner className="h-8 w-8" />
              </div>
            )}

            {/* Pending — waiting for parent */}
            {consentStatus === "pending" && (
              <>
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="relative">
                    <Mail className="h-14 w-14 text-primary/60" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-primary" />
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    A consent email was sent to{" "}
                    <span className="font-medium text-foreground">
                      {(status as { parentEmail?: string })?.parentEmail ?? "your parent"}
                    </span>
                    . Ask them to check their inbox and click the approval link.
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Checking automatically every 15 seconds…</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  Check now
                </Button>

                {/* Resend section */}
                {!showResendForm ? (
                  <p className="text-center text-xs text-muted-foreground">
                    Email not received?{" "}
                    <button
                      className="text-primary underline disabled:opacity-50"
                      disabled={!canResend}
                      onClick={() => setShowResendForm(true)}
                    >
                      {canResend
                        ? "Resend email"
                        : `Resend available in ${Math.ceil(resendCooldownSeconds / 60)} min`}
                    </button>
                  </p>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="email"
                      placeholder="Parent's email address"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleResend}
                        disabled={resendMutation.isPending}
                      >
                        {resendMutation.isPending ? (
                          <><Spinner className="h-3.5 w-3.5 mr-2" />Sending…</>
                        ) : (
                          "Send"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowResendForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Not requested yet */}
            {consentStatus === "not_requested" && (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Because you are under 13, EduChamp needs a parent or guardian to approve your
                  account before you can start learning. Enter their email below to send the
                  approval request.
                </p>
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="Parent's email address"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button
                    className="w-full"
                    onClick={handleResend}
                    disabled={resendMutation.isPending}
                  >
                    {resendMutation.isPending ? (
                      <><Spinner className="h-4 w-4 mr-2" />Sending…</>
                    ) : (
                      <><Mail className="h-4 w-4 mr-2" />Send Consent Request</>
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* Expired */}
            {consentStatus === "expired" && (
              <>
                <div className="flex flex-col items-center gap-3 py-2">
                  <AlertTriangle className="h-12 w-12 text-yellow-500" />
                  <p className="text-sm text-muted-foreground text-center">
                    Your consent request expired after 7 days without a response. Please send a new
                    request to your parent.
                  </p>
                </div>
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="Parent's email address"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button
                    className="w-full"
                    onClick={handleResend}
                    disabled={resendMutation.isPending}
                  >
                    {resendMutation.isPending ? (
                      <><Spinner className="h-4 w-4 mr-2" />Sending…</>
                    ) : (
                      "Send New Request"
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* Denied */}
            {consentStatus === "denied" && (
              <div className="text-center space-y-4 py-2">
                <XCircle className="h-14 w-14 text-red-500 mx-auto" />
                <div>
                  <p className="font-semibold text-foreground">Access Denied by Parent</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Your parent denied the consent request. If you believe this was a mistake, ask
                    them to contact{" "}
                    <a href="mailto:hi@educhamp.app" className="text-primary underline">
                      hi@educhamp.app
                    </a>
                    .
                  </p>
                </div>
              </div>
            )}

            {/* Approved (brief flash before redirect) */}
            {consentStatus === "approved" && (
              <div className="text-center space-y-4 py-2">
                <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
                <p className="font-semibold text-foreground">Approved! Redirecting…</p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Questions?{" "}
          <a href="mailto:hi@educhamp.app" className="text-primary underline">
            hi@educhamp.app
          </a>
        </p>
      </div>
    </div>
  );
}
