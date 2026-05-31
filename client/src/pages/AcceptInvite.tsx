import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import {
  Users, CheckCircle2, AlertTriangle, Clock, ShieldAlert, ArrowRight, LogIn
} from "lucide-react";
import { Link, useLocation } from "wouter";

function parseToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

export default function AcceptInvite() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const token = parseToken();

  const [accepted, setAccepted] = useState(false);

  // previewInvitation is now a public procedure — load it immediately so unauthenticated
  // visitors can see who invited them before they sign in.
  const { data: preview, isLoading: previewLoading, error: previewError } = trpc.coParent.previewInvitation.useQuery(
    { token: token ?? "" },
    { enabled: !!token }
  );

  const acceptMutation = trpc.coParent.acceptInvitation.useMutation({
    onSuccess: () => {
      setAccepted(true);
      toast.success("You now have access to this student's progress dashboard.");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!token) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-8 space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold">Invalid Invitation Link</h2>
            <p className="text-muted-foreground text-sm">
              This invitation link is missing a token. Please ask the parent to resend the invitation.
            </p>
            <Link href="/">
              <Button className="mt-2">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not signed in — prompt login
  if (!isAuthenticated) {
    const loginUrl = getLoginUrl();
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center pb-2">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Co-Parent Invitation</CardTitle>
            <CardDescription>
              You've been invited to monitor a student's progress on EduChamp.
              Sign in to accept the invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {preview && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm space-y-1 text-center">
                <p className="font-medium text-foreground">Invited by: {preview.inviteeName ?? preview.inviteeEmail}</p>
                {preview.relationship && (
                  <p className="text-muted-foreground capitalize">Relationship: {preview.relationship}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Expires: {new Date(preview.expiresAt).toLocaleDateString()}
                </p>
              </div>
            )}
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1 text-center">
              <p className="text-muted-foreground">Sign in with your EduChamp account to continue.</p>
              <p className="text-xs text-muted-foreground">
                If you don't have an account, you'll be able to create one.
              </p>
            </div>
            <a href={loginUrl}>
              <Button className="w-full gap-2">
                <LogIn className="h-4 w-4" />
                Sign In to Accept Invitation
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Accepted state
  if (accepted) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-8 space-y-4">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
            <h2 className="text-2xl font-bold">Invitation Accepted!</h2>
            <p className="text-muted-foreground text-sm">
              You now have view access to this student's progress dashboard.
              Head to the Parent Dashboard to see their mastery scores, quiz results, and learning path.
            </p>
            <Link href="/parent">
              <Button className="gap-2 mt-2">
                Go to Parent Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Student account trying to accept
  if (user?.accountType === "student") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-10 pb-8 space-y-4 text-center">
            <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold">Student Account Detected</h2>
            <p className="text-muted-foreground text-sm">
              You are currently signed in as a <strong>student</strong>. A parent or guardian account
              cannot also be a student account on EduChamp.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              Please sign out and sign in with a different account (or create a new one) to accept
              this co-parent invitation.
            </div>
            <Link href="/">
              <Button variant="outline" className="mt-2">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Preview loading or error
  if (previewLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (previewError) {
    const msg = previewError.message;
    const isExpired = msg.toLowerCase().includes("expired");
    const isRevoked = msg.toLowerCase().includes("revoked");
    const isAccepted = msg.toLowerCase().includes("already been accepted");

    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-8 space-y-4">
            {isExpired ? (
              <Clock className="h-12 w-12 text-amber-500 mx-auto" />
            ) : isAccepted ? (
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            ) : (
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            )}
            <h2 className="text-xl font-bold">
              {isExpired ? "Invitation Expired" : isRevoked ? "Invitation Revoked" : isAccepted ? "Already Accepted" : "Invalid Invitation"}
            </h2>
            <p className="text-muted-foreground text-sm">{msg}</p>
            {isAccepted && (
              <Link href="/parent">
                <Button className="gap-2 mt-2">
                  Go to Parent Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
            {!isAccepted && (
              <Link href="/">
                <Button variant="outline" className="mt-2">Go to Dashboard</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show invitation preview and accept button
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-2">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Co-Parent Invitation</CardTitle>
          <CardDescription>
            You've been invited to monitor a student's progress on EduChamp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          {preview && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Invitation for</span>
                <span className="text-sm font-medium">{preview.inviteeEmail}</span>
              </div>
              {preview.inviteeName && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Your name</span>
                  <span className="text-sm font-medium">{preview.inviteeName}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Your role</span>
                <Badge variant="outline" className="capitalize">{preview.relationship}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expires</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(preview.expiresAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>View-only access:</strong> As a co-parent or guardian, you can view this student's
            progress, mastery scores, and quiz results. You cannot modify their learning data.
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Signed in as <strong>{user?.name ?? user?.email}</strong>.
            This access will be linked to your current account.
          </div>

          <Button
            className="w-full gap-2"
            onClick={() => acceptMutation.mutate({ token })}
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Accepting…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Accept Invitation
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
