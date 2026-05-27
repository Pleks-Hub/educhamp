import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, CheckCircle2, XCircle, Loader2, ArrowLeft, ExternalLink } from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function ResetPassword() {
  const [token, setToken] = useState<string | null>(null);
  const [consumed, setConsumed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
  }, []);

  const { data: validity, isLoading } = trpc.authEnhancements.validateResetToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token }
  );

  const consumeToken = trpc.authEnhancements.consumeResetToken.useMutation({
    onSuccess: () => setConsumed(true),
  });

  if (!token) {
    return <InvalidState reason="No reset token found in the URL." />;
  }

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Validating your reset link…</p>
        </div>
      </PageShell>
    );
  }

  if (!validity?.valid) {
    return <InvalidState reason={validity?.reason ?? "Invalid or expired reset link."} />;
  }

  if (consumed) {
    return (
      <PageShell>
        <div className="text-center space-y-4 py-4">
          <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Reset link confirmed</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              Your reset request has been acknowledged. Since EduChamp uses Manus OAuth,
              please sign in again using the button below.
            </p>
          </div>
          <Button
            className="gap-2"
            onClick={() => { window.location.href = getLoginUrl(); }}
          >
            <ExternalLink className="h-4 w-4" />
            Sign in with Manus
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">About EduChamp authentication</p>
          <p>
            EduChamp uses Manus OAuth for secure sign-in — there are no passwords to reset.
            Clicking "Confirm &amp; Sign In" will acknowledge this request and redirect you to the
            Manus login page.
          </p>
        </div>

        <Button
          className="w-full"
          onClick={() => consumeToken.mutate({ token: token! })}
          disabled={consumeToken.isPending}
        >
          {consumeToken.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</>
          ) : (
            "Confirm & Sign In"
          )}
        </Button>

        {consumeToken.isError && (
          <p className="text-sm text-destructive text-center">{consumeToken.error.message}</p>
        )}

        <div className="text-center">
          <Link href="/">
            <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to home
            </button>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold">EduChamp</h1>
            <p className="text-xs text-muted-foreground">Adaptive Learning · Katy ISD</p>
          </div>
        </div>
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Account Access</CardTitle>
            <CardDescription>Verify your identity to continue.</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}

function InvalidState({ reason }: { reason: string }) {
  return (
    <PageShell>
      <div className="text-center space-y-4 py-4">
        <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <XCircle className="h-7 w-7 text-red-600" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Link invalid or expired</h3>
          <p className="text-sm text-muted-foreground mt-1">{reason}</p>
        </div>
        <Link href="/forgot-password">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Request a new link
          </Button>
        </Link>
      </div>
    </PageShell>
  );
}
