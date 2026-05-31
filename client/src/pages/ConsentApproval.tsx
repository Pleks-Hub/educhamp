/**
 * ConsentApproval.tsx
 *
 * Public page visited by a parent/guardian via the tokenised link in the
 * COPPA consent email. Handles both /consent/approve?token=... and
 * /consent/deny?token=... routes.
 *
 * No authentication required — the token IS the credential.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle, XCircle, AlertTriangle, ShieldCheck } from "lucide-react";

type PageMode = "approve" | "deny";
type PageState = "loading" | "confirming" | "success" | "denied" | "error";

export default function ConsentApproval() {
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";
  const mode: PageMode = location.startsWith("/consent/deny") ? "deny" : "approve";

  const [state, setState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const { data: consentRequest, isLoading: requestLoading } = trpc.coppa.getConsentRequest.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const approveMutation = trpc.coppa.approveConsent.useMutation({
    onSuccess: () => setState("success"),
    onError: (err) => {
      setErrorMsg(err.message);
      setState("error");
    },
  });

  const denyMutation = trpc.coppa.denyConsent.useMutation({
    onSuccess: () => setState("denied"),
    onError: (err) => {
      setErrorMsg(err.message);
      setState("error");
    },
  });

  useEffect(() => {
    if (!requestLoading) {
      if (!consentRequest || consentRequest.isExpired) {
        setErrorMsg(
          consentRequest?.isExpired
            ? "This consent link has expired. Please ask your child to request a new one."
            : "This consent link is invalid or has already been used."
        );
        setState("error");
      } else if (consentRequest.status === "approved") {
        setState("success");
      } else if (consentRequest.status === "denied") {
        setState("denied");
      } else {
        setState("confirming");
      }
    }
  }, [requestLoading, consentRequest]);

  if (!token) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-muted-foreground">No consent token found in the URL.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">EduChamp</span>
          </div>
          <p className="text-muted-foreground text-sm">Parental Consent Portal</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-lg">
              {state === "loading" && "Loading…"}
              {state === "confirming" && (mode === "approve" ? "Approve Account Access" : "Deny Account Access")}
              {state === "success" && "Access Approved"}
              {state === "denied" && "Access Denied"}
              {state === "error" && "Link Unavailable"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Loading */}
            {(state === "loading" || requestLoading) && (
              <div className="flex justify-center py-8">
                <Spinner className="h-8 w-8" />
              </div>
            )}

            {/* Confirming — Approve */}
            {state === "confirming" && mode === "approve" && (
              <>
                <div className="bg-muted/40 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                  <p>
                    By approving, you confirm that you are the parent or legal guardian of this student
                    and consent to EduChamp collecting their learning activity data (quiz scores,
                    lesson progress, grade level) for educational purposes.
                  </p>
                  <p>
                    EduChamp does not sell personal data. Full privacy policy:{" "}
                    <a
                      href="https://educhamp.app/privacy"
                      className="text-primary underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      educhamp.app/privacy
                    </a>
                  </p>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => approveMutation.mutate({ token, origin: window.location.origin })}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? (
                    <><Spinner className="h-4 w-4 mr-2" /> Approving…</>
                  ) : (
                    <><CheckCircle className="h-4 w-4 mr-2" /> Approve Access</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setState("confirming")}
                  disabled={approveMutation.isPending}
                  asChild
                >
                  <a href={`/consent/deny?token=${token}`}>I do not consent — Deny Access</a>
                </Button>
              </>
            )}

            {/* Confirming — Deny */}
            {state === "confirming" && mode === "deny" && (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  If you deny access, your child's account will remain locked and they will not be
                  able to use EduChamp.
                </p>
                <Button
                  variant="destructive"
                  className="w-full"
                  size="lg"
                  onClick={() => denyMutation.mutate({ token })}
                  disabled={denyMutation.isPending}
                >
                  {denyMutation.isPending ? (
                    <><Spinner className="h-4 w-4 mr-2" /> Processing…</>
                  ) : (
                    <><XCircle className="h-4 w-4 mr-2" /> Confirm Deny</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <a href={`/consent/approve?token=${token}`}>← Go back and approve instead</a>
                </Button>
              </>
            )}

            {/* Success */}
            {state === "success" && (
              <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <div>
                  <p className="font-semibold text-foreground text-lg">Access Approved</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Your child can now log in and start learning on EduChamp. Thank you for keeping
                    their account safe.
                  </p>
                </div>
              </div>
            )}

            {/* Denied */}
            {state === "denied" && (
              <div className="text-center space-y-4">
                <XCircle className="h-16 w-16 text-red-500 mx-auto" />
                <div>
                  <p className="font-semibold text-foreground text-lg">Access Denied</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Your child's account has been locked. If you change your mind, ask them to
                    request consent again from the app.
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {state === "error" && (
              <div className="text-center space-y-4">
                <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
                <div>
                  <p className="font-semibold text-foreground text-lg">Link Unavailable</p>
                  <p className="text-muted-foreground text-sm mt-1">{errorMsg}</p>
                </div>
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
