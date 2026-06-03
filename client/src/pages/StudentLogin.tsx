/**
 * Student Login Page
 *
 * Public page at /student-login
 * Allows parent-enrolled students to sign in with email + password.
 * Also shows info about Apple Sign-In availability.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowLeft, Info } from "lucide-react";
import { Link } from "wouter";

/**
 * Detect if the user is on an Apple device.
 * Checks for iPhone, iPad, iPod, or Mac with AppleWebKit (excluding Chrome on Mac).
 */
function isAppleDevice(): boolean {
  const ua = navigator.userAgent;
  const isAppleHardware = /iPhone|iPad|iPod|Macintosh/.test(ua);
  const isWebKit = /AppleWebKit/.test(ua);
  // Chrome on Mac also has AppleWebKit, but also has "Chrome/"
  // Safari on Mac has AppleWebKit but NOT "Chrome/"
  const isChromeOnMac = /Macintosh/.test(ua) && /Chrome\//.test(ua);
  return isAppleHardware && isWebKit && !isChromeOnMac;
}

export default function StudentLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAppleInfo, setShowAppleInfo] = useState(false);

  const loginMutation = trpc.studentAuth.loginWithPassword.useMutation({
    onSuccess: () => {
      navigate("/");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    loginMutation.mutate({ email, password });
  };

  const handleOAuthSignIn = () => {
    window.location.href = getLoginUrl();
  };

  const appleDevice = isAppleDevice();

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
            <p className="text-xs text-muted-foreground">Student Sign In</p>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <CardDescription>
              Use the email and password you set up, or sign in with your Apple/Google account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email + Password Form */}
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
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {loginMutation.error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {loginMutation.error.message}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* OAuth Sign In */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleOAuthSignIn}
            >
              Sign in with Apple / Google
            </Button>

            {/* Apple device info */}
            {!appleDevice && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAppleInfo(!showAppleInfo)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
                >
                  <Info className="h-3.5 w-3.5" />
                  <span>Apple Sign-In requires an Apple device</span>
                </button>
                {showAppleInfo && (
                  <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
                    <strong>Apple Sign-In</strong> is only available on Apple devices (iPhone, iPad, Mac with Safari).
                    If you're on a Windows PC or Android device, please use your email and password, or sign in with Google instead.
                  </div>
                )}
              </div>
            )}

            {/* Help text */}
            <div className="text-center space-y-2 pt-2">
              <p className="text-xs text-muted-foreground">
                Don't have a password yet? Check your email for a setup link from your parent.
              </p>
              <Link href="/landing">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
