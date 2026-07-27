/**
 * Student Forgot Password Page
 *
 * Public page at /student-forgot-password
 * Allows students with local auth to request a password reset email.
 * Provides multiple recovery options for better UX.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  GraduationCap,
  Mail,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  KeyRound,
  Users,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import { Link } from "wouter";

export default function StudentForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const requestReset = trpc.studentAuth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    requestReset.mutate({ email, origin: window.location.origin });
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold">EduChamp</h1>
            <p className="text-xs text-muted-foreground">Password Recovery</p>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">
              {submitted ? "Check your email" : "Reset your password"}
            </CardTitle>
            <CardDescription>
              {submitted
                ? "We've sent you a link to create a new password."
                : "Choose how you'd like to regain access to your account."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {submitted ? (
              <div className="space-y-4">
                {/* Success state */}
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="text-sm font-medium">Reset link sent!</p>
                    <p className="text-xs text-muted-foreground">
                      Check your inbox at <strong>{email}</strong> for a link to create a new password.
                      The link expires in 7 days.
                    </p>
                  </div>
                </div>

                {/* Helpful tips */}
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-800">Didn't receive it?</p>
                  <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                    <li>Check your spam or junk folder</li>
                    <li>Make sure you entered the email your parent used to enroll you</li>
                    <li>Wait a few minutes — emails can sometimes be delayed</li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      setSubmitted(false);
                      setEmail("");
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try a different email
                  </Button>

                  <Link href="/sign-in">
                    <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to sign in
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Primary option: Email reset */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Reset via email</p>
                      <p className="text-xs text-muted-foreground">We'll send a reset link to your email</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-email" className="text-xs">Email address</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                        autoFocus
                      />
                    </div>

                    {/* Error */}
                    {requestReset.error && (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                        {requestReset.error.message}
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={requestReset.isPending || !email}>
                      {requestReset.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </span>
                      ) : (
                        "Send Reset Link"
                      )}
                    </Button>
                  </form>
                </div>

                {/* Alternative options toggle */}
                <button
                  type="button"
                  onClick={() => setShowAlternatives(!showAlternatives)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  {showAlternatives ? "Hide other options" : "Other ways to regain access"}
                </button>

                {/* Alternative recovery options */}
                {showAlternatives && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Ask parent */}
                    <div className="rounded-lg border border-dashed p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-amber-600" />
                        <p className="text-sm font-medium">Ask your parent or guardian</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your parent can reset your password from their dashboard.
                        Ask them to go to <strong>My Children → [Your Name] → Reset Password</strong>.
                      </p>
                    </div>

                    {/* Sign in with Apple/Google */}
                    <div className="rounded-lg border border-dashed p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-indigo-600" />
                        <p className="text-sm font-medium">Sign in with Apple or Google</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        If your account is linked to Apple or Google, you can sign in without a password.
                      </p>
                      <Link href="/sign-in">
                        <Button variant="outline" size="sm" className="w-full text-xs mt-1">
                          Try Apple / Google Sign In
                        </Button>
                      </Link>
                    </div>

                    {/* Contact admin */}
                    <div className="rounded-lg border border-dashed p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-slate-600" />
                        <p className="text-sm font-medium">Still can't get in?</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        If none of the above options work, ask your parent or teacher to contact
                        the EduChamp administrator for help recovering your account.
                      </p>
                    </div>
                  </div>
                )}

                {/* Back to sign in */}
                <div className="text-center pt-2">
                  <Link href="/sign-in">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to sign in
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
