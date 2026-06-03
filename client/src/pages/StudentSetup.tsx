/**
 * Student Setup Page
 *
 * Public page at /student-setup?token=XXX
 * Allows parent-enrolled students to create a password for their account.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, Lock, Eye, EyeOff, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "wouter";

// Password strength checker
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 4) return { score: 2, label: "Fair", color: "bg-yellow-500" };
  if (score <= 5) return { score: 3, label: "Good", color: "bg-blue-500" };
  return { score: 4, label: "Strong", color: "bg-emerald-500" };
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function StudentSetup() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Validate token
  const tokenQuery = trpc.studentAuth.validateSetupToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  // Create password mutation
  const createPassword = trpc.studentAuth.createPassword.useMutation({
    onSuccess: () => {
      // Redirect to home after successful password creation (session cookie is set)
      setTimeout(() => navigate("/"), 1500);
    },
  });

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordValid = PASSWORD_REGEX.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = passwordValid && passwordsMatch && !createPassword.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    createPassword.mutate({ token, password, confirmPassword });
  };

  // No token provided
  if (!token) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8 space-y-4">
            <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <XCircle className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="font-semibold text-lg">Invalid Link</h3>
            <p className="text-sm text-muted-foreground">
              This link is missing required information. Please check the email from your parent and try again.
            </p>
            <Link href="/student-login">
              <Button variant="outline" className="mt-4">Go to Student Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (tokenQuery.isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground mt-4">Verifying your setup link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Token invalid/expired
  if (tokenQuery.data && !tokenQuery.data.valid) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8 space-y-4">
            <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-7 w-7 text-amber-600" />
            </div>
            <h3 className="font-semibold text-lg">Link Expired or Used</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {tokenQuery.data.reason || "This setup link is no longer valid."}
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/student-login">
                <Button variant="default" className="w-full">Sign In with Password</Button>
              </Link>
              <p className="text-xs text-muted-foreground">
                Ask your parent to resend the setup email from their dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (createPassword.isSuccess) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8 space-y-4">
            <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-lg">You're all set!</h3>
            <p className="text-sm text-muted-foreground">
              Welcome to EduChamp, {tokenQuery.data?.studentName}! Redirecting you to your dashboard...
            </p>
            <div className="animate-pulse flex items-center justify-center gap-2 text-primary text-sm">
              <ArrowRight className="h-4 w-4" />
              <span>Loading your courses...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main form
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
            <p className="text-xs text-muted-foreground">Set Up Your Account</p>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">
              Welcome, {tokenQuery.data?.studentName || "Student"}!
            </CardTitle>
            <CardDescription>
              Create a password to access your learning dashboard.
              {tokenQuery.data?.email && (
                <span className="block mt-1 font-medium text-foreground">{tokenQuery.data.email}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Strength indicator */}
                {password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i <= strength.score ? strength.color : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs ${strength.score <= 1 ? "text-red-600" : strength.score <= 2 ? "text-yellow-600" : "text-emerald-600"}`}>
                      {strength.label}
                    </p>
                  </div>
                )}
                {/* Requirements */}
                {password && !passwordValid && (
                  <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                    <li className={password.length >= 8 ? "text-emerald-600" : ""}>
                      {password.length >= 8 ? "✓" : "○"} At least 8 characters
                    </li>
                    <li className={/[A-Z]/.test(password) ? "text-emerald-600" : ""}>
                      {/[A-Z]/.test(password) ? "✓" : "○"} One uppercase letter
                    </li>
                    <li className={/[a-z]/.test(password) ? "text-emerald-600" : ""}>
                      {/[a-z]/.test(password) ? "✓" : "○"} One lowercase letter
                    </li>
                    <li className={/\d/.test(password) ? "text-emerald-600" : ""}>
                      {/\d/.test(password) ? "✓" : "○"} One number
                    </li>
                  </ul>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-600">Passwords do not match</p>
                )}
                {passwordsMatch && (
                  <p className="text-xs text-emerald-600">✓ Passwords match</p>
                )}
              </div>

              {/* Error */}
              {createPassword.error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {createPassword.error.message}
                </div>
              )}

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {createPassword.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Creating account...
                  </span>
                ) : (
                  "Create Password & Sign In"
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Already have a password?{" "}
                <Link href="/student-login" className="text-primary hover:underline">
                  Sign in here
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
