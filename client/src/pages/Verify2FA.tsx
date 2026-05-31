import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { ShieldCheck, KeyRound, AlertCircle } from "lucide-react";

export default function Verify2FA() {
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBackup, setUseBackup] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [useBackup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-2fa-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Full session cookie is now set — redirect to home
        navigate("/");
      } else {
        setError(data.error ?? "Invalid code. Please try again.");
        setCode("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (val: string) => {
    if (useBackup) {
      setCode(val.toUpperCase());
    } else {
      // Only allow digits for TOTP
      const digits = val.replace(/\D/g, "").slice(0, 6);
      setCode(digits);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Two-Factor Authentication</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your account is protected by two-factor authentication.
          </p>
        </div>

        <Card className="shadow-lg border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              {useBackup ? (
                <>
                  <KeyRound className="w-4 h-4 text-muted-foreground" />
                  Enter a backup code
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Enter your authenticator code
                </>
              )}
            </CardTitle>
            <CardDescription>
              {useBackup
                ? "Enter one of the 10-character backup codes you saved when you enabled 2FA."
                : "Open your authenticator app and enter the 6-digit code for EduChamp."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">{useBackup ? "Backup Code" : "Authentication Code"}</Label>
                <Input
                  id="code"
                  ref={inputRef}
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder={useBackup ? "XXXXXXXXXX" : "000000"}
                  className={`text-center text-xl tracking-widest font-mono ${
                    useBackup ? "uppercase" : ""
                  }`}
                  autoComplete="one-time-code"
                  inputMode={useBackup ? "text" : "numeric"}
                  maxLength={useBackup ? 10 : 6}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  isLoading ||
                  (useBackup ? code.length < 6 : code.length !== 6)
                }
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="w-4 h-4" />
                    Verifying…
                  </span>
                ) : (
                  "Verify & Sign In"
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                onClick={() => {
                  setUseBackup((v) => !v);
                  setCode("");
                  setError(null);
                }}
              >
                {useBackup
                  ? "Use authenticator app instead"
                  : "Use a backup code instead"}
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-border/40 text-center">
              <a
                href="/api/oauth/logout"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in with a different account
              </a>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          This challenge expires in 5 minutes. If it expires,{" "}
          <a href="/" className="underline hover:text-foreground transition-colors">
            sign in again
          </a>
          .
        </p>
      </div>
    </div>
  );
}
