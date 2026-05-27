import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  User, Shield, ShieldCheck, ShieldOff, KeyRound, Copy, RefreshCw,
  CheckCircle2, AlertTriangle, Loader2, QrCode, Palette
} from "lucide-react";
import { usePalette, PALETTES, type PaletteId } from "@/contexts/PaletteContext";

// ─── 2FA Setup Flow ───────────────────────────────────────────────────────────

function TwoFactorSetup({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<"qr" | "verify" | "backup">("qr");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [qrData, setQrData] = useState<{ qrCodeDataUrl: string; secret: string } | null>(null);

  const setup2FA = trpc.authEnhancements.setup2FA.useMutation({
    onSuccess: (data) => {
      setQrData(data);
      setStep("qr");
    },
    onError: (err) => toast.error(err.message),
  });

  const verify2FA = trpc.authEnhancements.verify2FA.useMutation({
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setStep("backup");
      toast.success("Two-factor authentication enabled!");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!qrData && !setup2FA.isPending) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Two-factor authentication adds an extra layer of security to your account.
          You'll need an authenticator app like Google Authenticator or Authy.
        </p>
        <Button onClick={() => setup2FA.mutate()} className="gap-2">
          <QrCode className="h-4 w-4" />
          Set Up 2FA
        </Button>
      </div>
    );
  }

  if (setup2FA.isPending) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Generating QR code…</span>
      </div>
    );
  }

  if (step === "qr" && qrData) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Scan this QR code with your authenticator app:
          </p>
          <img
            src={qrData.qrCodeDataUrl}
            alt="2FA QR Code"
            className="mx-auto rounded-lg border p-2 bg-white"
            style={{ width: 180, height: 180 }}
          />
        </div>
        <div className="bg-muted rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Or enter this code manually:</p>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono flex-1 break-all">{qrData.secret}</code>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => { navigator.clipboard.writeText(qrData.secret); toast.success("Secret copied!"); }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <Button className="w-full" onClick={() => setStep("verify")}>
          I've scanned the code
        </Button>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app to confirm setup:
        </p>
        <div className="space-y-2">
          <Label htmlFor="totp-code">Verification Code</Label>
          <Input
            id="totp-code"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="text-center text-lg tracking-widest font-mono"
          />
        </div>
        <Button
          className="w-full"
          onClick={() => verify2FA.mutate({ code })}
          disabled={code.length !== 6 || verify2FA.isPending}
        >
          {verify2FA.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying…</> : "Verify & Enable"}
        </Button>
        {verify2FA.isError && (
          <p className="text-sm text-destructive text-center">{verify2FA.error.message}</p>
        )}
      </div>
    );
  }

  if (step === "backup") {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">Save your backup codes</p>
          </div>
          <p className="text-xs text-amber-700">
            Store these codes somewhere safe. Each can be used once if you lose access to your authenticator app.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {backupCodes.map((code, i) => (
            <code key={i} className="text-xs font-mono bg-muted rounded px-2 py-1 text-center">{code}</code>
          ))}
        </div>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => {
            navigator.clipboard.writeText(backupCodes.join("\n"));
            toast.success("Backup codes copied!");
          }}
        >
          <Copy className="h-4 w-4" />
          Copy All Codes
        </Button>
        <Button className="w-full" onClick={onDone}>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Done — 2FA is Active
        </Button>
      </div>
    );
  }

  return null;
}

// ─── 2FA Management (when enabled) ───────────────────────────────────────────

function TwoFactorManage({ backupCodesRemaining, onDisabled }: { backupCodesRemaining: number; onDisabled: () => void }) {
  const [disableCode, setDisableCode] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [refreshCode, setRefreshCode] = useState("");
  const [showRefresh, setShowRefresh] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);

  const disable2FA = trpc.authEnhancements.disable2FA.useMutation({
    onSuccess: () => {
      toast.success("Two-factor authentication disabled.");
      onDisabled();
    },
    onError: (err) => toast.error(err.message),
  });

  const generateBackupCodes = trpc.authEnhancements.generateBackupCodes.useMutation({
    onSuccess: (data) => {
      setNewBackupCodes(data.backupCodes);
      toast.success("New backup codes generated!");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-600" />
        <span className="font-medium text-emerald-700">2FA is active</span>
        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Enabled</Badge>
      </div>

      <div className="text-sm text-muted-foreground">
        Backup codes remaining: <strong>{backupCodesRemaining}</strong>
      </div>

      {/* Refresh backup codes */}
      {!showRefresh ? (
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowRefresh(true)}>
          <RefreshCw className="h-3.5 w-3.5" />
          Generate New Backup Codes
        </Button>
      ) : (
        <div className="space-y-3 border rounded-lg p-4">
          <p className="text-sm font-medium">Enter your current TOTP code to generate new backup codes:</p>
          <Input
            placeholder="000000"
            maxLength={6}
            value={refreshCode}
            onChange={(e) => setRefreshCode(e.target.value.replace(/\D/g, ""))}
            className="text-center text-lg tracking-widest font-mono"
          />
          {newBackupCodes.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {newBackupCodes.map((code, i) => (
                  <code key={i} className="text-xs font-mono bg-muted rounded px-2 py-1 text-center">{code}</code>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => { navigator.clipboard.writeText(newBackupCodes.join("\n")); toast.success("Copied!"); }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy All
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="w-full"
              onClick={() => generateBackupCodes.mutate({ code: refreshCode })}
              disabled={refreshCode.length !== 6 || generateBackupCodes.isPending}
            >
              {generateBackupCodes.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="w-full" onClick={() => { setShowRefresh(false); setRefreshCode(""); setNewBackupCodes([]); }}>
            Cancel
          </Button>
        </div>
      )}

      <Separator />

      {/* Disable 2FA */}
      {!showDisable ? (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => setShowDisable(true)}
        >
          <ShieldOff className="h-3.5 w-3.5" />
          Disable 2FA
        </Button>
      ) : (
        <div className="space-y-3 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm font-medium text-destructive">Enter your TOTP code or a backup code to disable 2FA:</p>
          <Input
            placeholder="Code or backup code"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value.toUpperCase())}
            className="font-mono"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => disable2FA.mutate({ code: disableCode })}
              disabled={!disableCode || disable2FA.isPending}
            >
              {disable2FA.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disable 2FA"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowDisable(false); setDisableCode(""); }}>
              Cancel
            </Button>
          </div>
          {disable2FA.isError && (
            <p className="text-xs text-destructive">{disable2FA.error.message}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────

export default function Profile() {
  const { user } = useAuth();
  const [show2FASetup, setShow2FASetup] = useState(false);

  const { data: twoFAStatus, refetch: refetch2FA } = trpc.authEnhancements.get2FAStatus.useQuery(undefined, {
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Please sign in to view your profile.</p>
      </div>
    );
  }

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          Profile &amp; Settings
        </h1>
        <p className="text-muted-foreground mt-1">Manage your account and security settings.</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
              {initials}
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-lg">{user.name ?? "Unknown"}</div>
              <div className="text-sm text-muted-foreground">{user.email ?? "No email"}</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">
                  {user.accountType === "parent" ? "Parent / Guardian" : "Student"}
                </Badge>
                {user.loginMethod && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {user.loginMethod}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2FA Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security with a time-based one-time password (TOTP) app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {twoFAStatus?.isEnabled ? (
            <TwoFactorManage
              backupCodesRemaining={twoFAStatus.backupCodesRemaining}
              onDisabled={() => { refetch2FA(); setShow2FASetup(false); }}
            />
          ) : show2FASetup ? (
            <TwoFactorSetup onDone={() => { refetch2FA(); setShow2FASetup(false); }} />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldOff className="h-4 w-4" />
                <span className="text-sm">Two-factor authentication is not enabled.</span>
              </div>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShow2FASetup(true)}
              >
                <KeyRound className="h-4 w-4" />
                Enable 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personalization */}
      <PersonalizationCard />

      {/* Account Security Note */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> EduChamp uses secure single sign-on.
              Your account credentials are managed by your identity provider. To update your email or
              password, please visit your account settings through the sign-in portal.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Personalization Card ─────────────────────────────────────────────────────
function PersonalizationCard() {
  const { palette, setPalette, isSaving } = usePalette();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [displayName, setDisplayName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [aiWelcomeMessage, setAiWelcomeMessage] = useState("");
  const [initialized, setInitialized] = useState(false);

  const saveMutation = trpc.onboarding.savePersonalization.useMutation({
    onSuccess: () => {
      utils.onboarding.getPersonalization.invalidate();
      toast.success("Settings saved!");
    },
    onError: () => toast.error("Failed to save settings."),
  });

  const { data: personalization } = trpc.onboarding.getPersonalization.useQuery(undefined, {
    enabled: !!user,
  });

  // Populate fields from server on first load
  useEffect(() => {
    if (personalization && !initialized) {
      setDisplayName(personalization.displayName ?? "");
      setPreferredName((personalization as any).preferredName ?? "");
      setAiWelcomeMessage((personalization as any).aiWelcomeMessage ?? "");
      setInitialized(true);
    }
  }, [personalization, initialized]);

  const handleSaveNames = () => {
    saveMutation.mutate({
      displayName: displayName.trim() || undefined,
      preferredName: preferredName.trim() || null,
      aiWelcomeMessage: aiWelcomeMessage.trim() || null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Personalization
        </CardTitle>
        <CardDescription>Customise your colours, name, and AI tutor experience.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Colour Palette */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Colour Palette</Label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPalette(p.id as PaletteId)}
                className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                  palette === p.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <div className="flex gap-0.5">
                  <div className={`h-5 w-5 rounded-full ${p.primary}`} />
                  <div className={`h-5 w-5 rounded-full ${p.accent}`} />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground leading-tight text-center">
                  {p.label}
                </span>
                {palette === p.id && (
                  <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                    <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
          {isSaving && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving palette…
            </p>
          )}
        </div>

        <Separator />

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-sm font-medium">Display Name</Label>
          <p className="text-xs text-muted-foreground">Override how your name appears across EduChamp (optional).</p>
          <Input
            id="displayName"
            placeholder={user?.name ?? "Your display name"}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="max-w-xs"
            maxLength={128}
          />
        </div>

        <Separator />

        {/* Preferred Name / Nickname for AI */}
        <div className="space-y-2">
          <Label htmlFor="preferredName" className="text-sm font-medium">AI Nickname</Label>
          <p className="text-xs text-muted-foreground">
            What should your AI tutor call you? Leave blank to use your display name.
            Examples: <span className="font-medium">"Alex"</span>, <span className="font-medium">"Champ"</span>, <span className="font-medium">"Ms. Johnson"</span>.
          </p>
          <Input
            id="preferredName"
            placeholder={user?.name?.split(" ")[0] ?? "Nickname"}
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            className="max-w-xs"
            maxLength={64}
          />
        </div>

        <Separator />

        {/* Custom AI Welcome Message */}
        <div className="space-y-2">
          <Label htmlFor="aiWelcomeMessage" className="text-sm font-medium">Custom AI Welcome Message</Label>
          <p className="text-xs text-muted-foreground">
            Personalise the greeting your AI tutor shows when you open a chat session.
            Leave blank for the default welcome.
          </p>
          <Textarea
            id="aiWelcomeMessage"
            placeholder="e.g. Hey! Ready to crush some algebra today? Let's go! 🚀"
            value={aiWelcomeMessage}
            onChange={(e) => setAiWelcomeMessage(e.target.value)}
            className="resize-none"
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{aiWelcomeMessage.length}/500</p>
        </div>

        <Button
          onClick={handleSaveNames}
          disabled={saveMutation.isPending}
          className="gap-1.5"
        >
          {saveMutation.isPending ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
          ) : (
            "Save Preferences"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
