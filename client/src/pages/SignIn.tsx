/**
 * Unified Sign In Page
 *
 * Public page at /sign-in
 * Provides a single entry point for ALL users:
 * - Parents/Teachers: Sign in with Apple/Google (OAuth)
 * - Students: Sign in with email + password OR Apple/Google if their account is linked
 *
 * Detects Apple devices and shows appropriate Apple Sign-In info.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowLeft, Info, Users, BookOpen } from "lucide-react";
import { Link } from "wouter";

/**
 * Detect if the user is on an Apple device.
 * Checks for iPhone, iPad, iPod, or Mac with Safari (excluding Chrome on Mac).
 */
function isAppleDevice(): boolean {
  const ua = navigator.userAgent;
  const isAppleHardware = /iPhone|iPad|iPod|Macintosh/.test(ua);
  const isWebKit = /AppleWebKit/.test(ua);
  const isChromeOnMac = /Macintosh/.test(ua) && /Chrome\//.test(ua);
  return isAppleHardware && isWebKit && !isChromeOnMac;
}

export default function SignIn() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAppleInfo, setShowAppleInfo] = useState(false);
  const [activeTab, setActiveTab] = useState("parent");

  const loginMutation = trpc.studentAuth.loginWithPassword.useMutation({
    onSuccess: () => {
      navigate("/");
    },
  });

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    loginMutation.mutate({ email, password });
  };

  const handleOAuthSignIn = () => {
    window.location.href = getLoginUrl();
  };

  const appleDevice = isAppleDevice();

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-900">Welcome to EduChamp</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Sign in to continue learning</p>
          </div>
        </div>

        <Card className="shadow-lg border-slate-200/80">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription>
              Choose how you'd like to sign in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="parent" className="gap-1.5 text-xs sm:text-sm">
                  <Users className="h-3.5 w-3.5" />
                  Parent / Teacher
                </TabsTrigger>
                <TabsTrigger value="student" className="gap-1.5 text-xs sm:text-sm">
                  <BookOpen className="h-3.5 w-3.5" />
                  Student
                </TabsTrigger>
              </TabsList>

              {/* Parent / Teacher Tab */}
              <TabsContent value="parent" className="mt-4 space-y-4">
                <div className="text-center space-y-2 py-2">
                  <p className="text-sm text-muted-foreground">
                    Sign in with your Apple or Google account to access your dashboard.
                  </p>
                </div>

                <Button
                  className="w-full h-11 text-sm font-medium"
                  onClick={handleOAuthSignIn}
                >
                  Continue with Apple / Google
                </Button>

                {/* Apple device info for non-Apple users */}
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
                        If you're on a Windows PC or Android device, please sign in with Google instead.
                      </div>
                    )}
                  </div>
                )}

                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    Don't have an account?{" "}
                    <Link href="/landing" className="text-indigo-600 hover:underline font-medium">
                      Sign up free
                    </Link>
                  </p>
                </div>
              </TabsContent>

              {/* Student Tab */}
              <TabsContent value="student" className="mt-4 space-y-4">
                {/* Email + Password Form */}
                <form onSubmit={handleStudentSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 h-10"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                      <Link href="/student-forgot-password" className="text-xs text-indigo-600 hover:underline">
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
                        className="pl-9 pr-10 h-10"
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

                  <Button type="submit" className="w-full h-10" disabled={loginMutation.isPending}>
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
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                {/* OAuth Sign In for students too */}
                <Button
                  variant="outline"
                  className="w-full h-10"
                  onClick={handleOAuthSignIn}
                >
                  Sign in with Apple / Google
                </Button>

                {/* Apple device info for non-Apple users */}
                {!appleDevice && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
                    <strong>Note:</strong> Apple Sign-In is only available on Apple devices (iPhone, iPad, Mac with Safari).
                    On this device, use your email and password or sign in with Google.
                  </div>
                )}

                {/* Help text */}
                <div className="text-center space-y-1.5 pt-1">
                  <p className="text-xs text-muted-foreground">
                    Don't have a password yet? Check your email for a setup link from your parent.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Back to home */}
        <div className="text-center">
          <Link href="/landing">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
