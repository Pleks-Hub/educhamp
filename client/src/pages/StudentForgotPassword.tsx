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
              <div className="space-y-5">
                {/* Success animation */}
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="relative">
                    {/* Animated ring pulse */}
                    <div className="absolute inset-0 h-20 w-20 rounded-full bg-emerald-200 animate-ping opacity-20" />
                    <div className="relative h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center animate-in zoom-in-50 duration-500">
                      <CheckCircle2 className="h-10 w-10 text-emerald-600 animate-in fade-in zoom-in-75 duration-700 delay-200" />
                    </div>
                  </div>
                  <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300">
                    <h3 className="text-lg font-semibold text-foreground">Reset link sent!</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      We've sent a password reset link to
                    </p>
                    <p className="text-sm font-medium text-foreground bg-muted/50 rounded-md px-3 py-1.5 inline-block">
                      {email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      The link is valid for 7 days.
                    </p>
                  </div>
                </div>

                {/* Spam folder warning — prominent */}
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500">
                  <div className="flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Mail className="h-4 w-4 text-amber-700" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-amber-900">Check your spam folder!</p>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Password reset emails sometimes end up in your <strong>Spam</strong> or <strong>Junk</strong> folder.
                        If you don't see it in your inbox within 2 minutes, please check there.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional tips */}
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2 animate-in fade-in duration-500 delay-700">
                  <p className="text-xs font-semibold text-slate-700">Still can't find it?</p>
                  <ul className="text-xs text-slate-600 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400 mt-0.5">•</span>
                      <span>Make sure you entered the email your parent used to enroll you</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400 mt-0.5">•</span>
                      <span>Search your email for <strong>"EduChamp"</strong> or <strong>"password reset"</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400 mt-0.5">•</span>
                      <span>Add <strong>noreply@educhamp.co</strong> to your contacts to prevent future filtering</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400 mt-0.5">•</span>
                      <span>Wait up to 5 minutes — email delivery can sometimes be delayed</span>
                    </li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-1 animate-in fade-in duration-500 delay-700">
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
