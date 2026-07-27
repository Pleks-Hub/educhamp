/**
 * Forgot Password Page (Parent / Teacher)
 *
 * For OAuth-based users (parents/teachers), there's no password to reset.
 * This page explains the situation clearly and offers helpful options.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, ArrowLeft, KeyRound, ExternalLink, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

export default function ForgotPassword() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold">EduChamp</h1>
            <p className="text-xs text-muted-foreground">Account Recovery</p>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Need help signing in?</CardTitle>
            <CardDescription>
              Parent and teacher accounts use Apple or Google sign-in — no password needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary action: Sign in with OAuth */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <KeyRound className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Sign in with Apple or Google</p>
                  <p className="text-xs text-muted-foreground">Use the same account you signed up with</p>
                </div>
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => { window.location.href = getLoginUrl(); }}
              >
                <ExternalLink className="h-4 w-4" />
                Continue to Sign In
              </Button>
            </div>

            {/* Help section */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" />
                Common issues
              </p>
              <ul className="text-xs text-blue-700 space-y-1.5 list-disc list-inside">
                <li><strong>Wrong account?</strong> Make sure you're using the same Apple ID or Google account you originally signed up with.</li>
                <li><strong>Apple Sign-In not showing?</strong> Apple Sign-In only works on Apple devices (iPhone, iPad, Mac with Safari).</li>
                <li><strong>Multiple Google accounts?</strong> Try signing out of Google first, then sign in with the correct account.</li>
                <li><strong>Student account?</strong> Students use email + password. <Link href="/student-forgot-password" className="underline font-medium">Reset student password here</Link>.</li>
              </ul>
            </div>

            {/* Student password reset link */}
            <div className="rounded-lg border border-dashed p-3 space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                Are you a <strong>student</strong> trying to reset your password?
              </p>
              <Link href="/student-forgot-password">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Go to Student Password Reset
                </Button>
              </Link>
            </div>

            {/* Back to sign in */}
            <div className="text-center pt-1">
              <Link href="/sign-in">
                <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
