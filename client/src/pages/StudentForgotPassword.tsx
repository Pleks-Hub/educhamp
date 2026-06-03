/**
 * Student Forgot Password Page
 *
 * Public page at /student-forgot-password
 * Allows students with local auth to request a password reset email.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function StudentForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const requestReset = trpc.studentAuth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    requestReset.mutate({ email });
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
            <p className="text-xs text-muted-foreground">Password Reset</p>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">
              {submitted ? "Check your email" : "Forgot your password?"}
            </CardTitle>
            <CardDescription>
              {submitted
                ? "If an account with that email exists, we've sent a password reset link."
                : "Enter your email address and we'll send you a link to reset your password."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {submitted ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium">Reset link sent!</p>
                    <p className="text-xs text-muted-foreground">
                      Check your inbox at <strong>{email}</strong> for a link to create a new password.
                      The link expires in 7 days.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
                  <strong>Didn't receive it?</strong> Check your spam folder, or make sure you entered the email address your parent used to enroll you.
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                  }}
                >
                  Try a different email
                </Button>

                <Link href="/student-login">
                  <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to sign in
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      autoComplete="email"
                      required
                      autoFocus
                    />
                  </div>
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

                <div className="text-center pt-2">
                  <Link href="/student-login">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to sign in
                    </Button>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
