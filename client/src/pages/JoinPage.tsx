import { useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GraduationCap, Users, Star, BookOpen, CheckCircle2,
  UserCheck, ArrowRight, Loader2
} from "lucide-react";

export default function JoinPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const params = new URLSearchParams(search);
  const refCode = params.get("ref") ?? "";
  const inviteToken = params.get("invite") ?? "";

  // Look up referral code
  const referralQuery = trpc.referral.lookupCode.useQuery(
    { code: refCode },
    { enabled: !!refCode }
  );

  // Look up student invite token
  const inviteQuery = trpc.onboarding.lookupStudentInvite.useQuery(
    { token: inviteToken },
    { enabled: !!inviteToken }
  );

  // If user is already logged in, redirect to appropriate onboarding
  useEffect(() => {
    if (!authLoading && user) {
      if (inviteToken) {
        navigate(`/onboarding/student?invite=${inviteToken}`);
      } else {
        navigate("/");
      }
    }
  }, [user, authLoading, inviteToken]);

  const isInviteFlow = !!inviteToken;
  const inviteInfo = inviteQuery.data?.invite;
  const referralInfo = referralQuery.data?.referral;
  const isLoading = (!!refCode && referralQuery.isLoading) || (!!inviteToken && inviteQuery.isLoading);

  function handleSignUp() {
    // Build return path so after OAuth we land on onboarding
    const returnPath = isInviteFlow
      ? `/onboarding/student?invite=${inviteToken}`
      : `/onboarding/parent`;
    // Store return path in sessionStorage so OAuth callback can redirect there
    sessionStorage.setItem("educhamp_post_login_redirect", returnPath);
    const loginUrl = getLoginUrl();
    window.location.href = loginUrl;
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-14 w-14 rounded-2xl mx-auto" />
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">EduChamp</h1>
          <p className="text-slate-600 mt-2 text-lg">Algebra I Mastery Platform</p>
        </div>

        {/* Invite-specific banner */}
        {isInviteFlow && inviteInfo && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
            <UserCheck className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900 text-sm">
                {inviteInfo.childName ? `Hi ${inviteInfo.childName}!` : "You've been invited!"}
              </p>
              <p className="text-sm text-emerald-700 mt-0.5">
                Your parent has invited you to join EduChamp. Sign in to link your account and get started.
              </p>
            </div>
          </div>
        )}

        {isInviteFlow && inviteQuery.data && !inviteQuery.data.valid && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            <span className="font-medium">This invite link is no longer valid. </span>
            Please ask your parent to send a new invite from their EduChamp dashboard.
          </div>
        )}

        {/* Referral banner */}
        {!isInviteFlow && referralInfo && (
          <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600 shrink-0" />
            You were invited to join EduChamp. Sign up to get started!
          </div>
        )}

        {/* Main card */}
        <Card className="shadow-xl border-0">
          <CardHeader className="pb-2">
            <CardTitle>
              {isInviteFlow ? "Accept Your Student Invite" : "Join EduChamp"}
            </CardTitle>
            <CardDescription>
              {isInviteFlow
                ? "Sign in with your Manus account to link to your parent and start learning."
                : "Create your free account to start mastering Algebra I with AI-powered tutoring."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Features */}
            <div className="space-y-2">
              {[
                { icon: BookOpen, text: "Adaptive Algebra I curriculum (8 units)" },
                { icon: Star, text: "AI tutor that adapts to your learning pace" },
                { icon: CheckCircle2, text: "Placement test to find your starting point" },
                { icon: Users, text: "Parent dashboard for real-time progress tracking" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-slate-700">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  {text}
                </div>
              ))}
            </div>

            <Button className="w-full h-11 text-base" onClick={handleSignUp}>
              {isInviteFlow ? (
                <><UserCheck className="h-4 w-4 mr-2" /> Accept Invite & Sign In</>
              ) : (
                <><ArrowRight className="h-4 w-4 mr-2" /> Get Started Free</>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By signing up, you agree to EduChamp's Terms of Service and Privacy Policy.
            </p>
          </CardContent>
        </Card>

        {/* Note for students: must use parent invite */}
        {!isInviteFlow && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <span className="font-medium">Students:</span> Student accounts must be created by a parent or guardian.
            Ask your parent to sign up first and send you an invite link from their dashboard.
          </div>
        )}
      </div>
    </div>
  );
}
