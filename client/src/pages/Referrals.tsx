import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Share2, Copy, Link2, Users, TrendingUp, Gift,
  Loader2, CheckCircle2, ExternalLink, Plus
} from "lucide-react";

export default function Referrals() {
  const { user } = useAuth();
  const [targetRole, setTargetRole] = useState<"parent" | "student" | "teacher">("parent");
  const [note, setNote] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: codes, refetch } = trpc.referral.listMyCodes.useQuery();
  const createCode = trpc.referral.createCode.useMutation({
    onSuccess: () => {
      refetch();
      setNote("");
      toast.success("Referral link created!");
    },
    onError: (e) => toast.error(e.message),
  });

  function getReferralUrl(code: string) {
    return `${window.location.origin}/join?ref=${code}`;
  }

  async function copyLink(code: string) {
    await navigator.clipboard.writeText(getReferralUrl(code));
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success("Link copied to clipboard!");
  }

  async function shareLink(code: string) {
    const url = getReferralUrl(code);
    if (navigator.share) {
      await navigator.share({
        title: "Join EduChamp — Adaptive Learning Platform",
        text: "I'm using EduChamp to learn smarter with AI tutoring. Join me!",
        url,
      });
    } else {
      await copyLink(code);
    }
  }

  const totalClicks = codes?.reduce((s, c) => s + c.clickCount, 0) ?? 0;
  const totalSignups = codes?.reduce((s, c) => s + c.signupCount, 0) ?? 0;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Gift className="h-6 w-6 text-primary" />
          Refer & Invite
        </h1>
        <p className="text-slate-500 mt-1">
          Invite parents, students, or teachers to EduChamp. Share your personalised link and track who joins.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-slate-900">{codes?.length ?? 0}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Link2 className="h-3 w-3" /> Links created
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-slate-900">{totalClicks}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" /> Total clicks
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-emerald-600">{totalSignups}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Users className="h-3 w-3" /> Sign-ups
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create new link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create a Referral Link
          </CardTitle>
          <CardDescription>Generate a personalised invite link to share with others.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Who are you inviting?</Label>
              <Select value={targetRole} onValueChange={v => setTargetRole(v as any)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parents / Guardians</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="teacher">Teachers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                placeholder="e.g. Shared on Facebook"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <Button
            onClick={() => createCode.mutate({ targetRole, note: note || undefined })}
            disabled={createCode.isPending}
            className="w-full"
          >
            {createCode.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
            Generate Link
          </Button>
        </CardContent>
      </Card>

      {/* Existing codes */}
      {codes && codes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Your Referral Links</h2>
          {codes.map(code => (
            <Card key={code.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {code.targetRole ?? "parent"}
                      </Badge>
                      {code.note && (
                        <span className="text-xs text-muted-foreground truncate">{code.note}</span>
                      )}
                    </div>
                    <div className="font-mono text-sm bg-slate-50 border rounded px-2 py-1 truncate text-slate-700">
                      {getReferralUrl(code.code)}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> {code.clickCount} clicks
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <Users className="h-3 w-3" /> {code.signupCount} sign-ups
                      </span>
                      <span>{new Date(code.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink(code.code)}
                    >
                      {copiedCode === code.code
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareLink(code.code)}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {codes && codes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Gift className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No referral links yet. Create your first one above!</p>
        </div>
      )}
    </div>
  );
}
