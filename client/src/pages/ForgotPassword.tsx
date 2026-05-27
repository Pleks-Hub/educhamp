import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const requestReset = trpc.authEnhancements.requestPasswordReset.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    requestReset.mutate({ email, origin: window.location.origin });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
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
            <CardTitle className="text-xl">Reset your access</CardTitle>
            <CardDescription>
              Enter your email and we'll send a secure login link to the platform owner, who will forward it to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center space-y-4 py-4">
                <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Request submitted</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                    If an account with that email exists, a reset link has been sent to the platform administrator.
                    Please check back with them shortly.
                  </p>
                </div>
                <Link href="/">
                  <Button variant="outline" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!email || requestReset.isPending}
                >
                  {requestReset.isPending ? "Sending…" : "Send Reset Request"}
                </Button>

                {requestReset.isError && (
                  <p className="text-sm text-destructive text-center">{requestReset.error.message}</p>
                )}

                <div className="text-center">
                  <Link href="/">
                    <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to sign in
                    </button>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          EduChamp uses secure single sign-on. If you're having trouble signing in,
          contact your platform administrator.
        </p>
      </div>
    </div>
  );
}
