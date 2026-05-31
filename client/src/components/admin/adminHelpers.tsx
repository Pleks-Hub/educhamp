/**
 * Shared helpers used across multiple AdminDashboard tab components.
 * Extracted to avoid duplication when tabs are split into lazy chunks.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RotateCcw, MailX } from "lucide-react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────
export const GRADE_LEVELS = [
  "Pre-K", "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
  "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
];

export const GRADE_PROMOTIONS: Record<string, string> = {
  "Pre-K": "Kindergarten", "Kindergarten": "Grade 1", "Grade 1": "Grade 2", "Grade 2": "Grade 3",
  "Grade 3": "Grade 4", "Grade 4": "Grade 5", "Grade 5": "Grade 6",
  "Grade 6": "Grade 7", "Grade 7": "Grade 8", "Grade 8": "Grade 9",
  "Grade 9": "Grade 10", "Grade 10": "Grade 11", "Grade 11": "Grade 12",
};

export const ALL_RESOURCES = ["users", "courses", "cms", "rbac", "reports", "diagnostics", "settings", "enrollments"];
export const ALL_ACTIONS = ["view", "create", "edit", "delete", "approve", "export"];

export const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  suspended: "bg-amber-100 text-amber-800",
  deactivated: "bg-orange-100 text-orange-800",
  pending_verification: "bg-blue-100 text-blue-800",
  archived: "bg-gray-100 text-gray-600",
  deleted: "bg-red-100 text-red-800",
};

export const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  suspended: "Suspended",
  deactivated: "Deactivated",
  pending_verification: "Pending Verification",
  archived: "Archived",
  deleted: "Deleted",
};

export const DEFAULT_SETTINGS = [
  { key: "platform.name", value: "EduChamp", label: "Platform Name", category: "general" },
  { key: "platform.tagline", value: "Adaptive Learning for Every Student", label: "Tagline", category: "general" },
  { key: "enrollment.open", value: "true", label: "Open Enrollment", category: "enrollment" },
  { key: "enrollment.require_parent_invite", value: "true", label: "Require Parent Invite for Students", category: "enrollment" },
  { key: "ai.tutor_enabled", value: "true", label: "AI Tutor Enabled", category: "ai" },
  { key: "ai.diagnostic_randomize", value: "true", label: "Randomise Diagnostic Questions", category: "ai" },
  { key: "notifications.welcome_email", value: "true", label: "Send Welcome Notification on Sign-up", category: "notifications" },
  { key: "notifications.parent_digest", value: "false", label: "Weekly Parent Digest", category: "notifications" },
];

// ─── Suppression Badge ────────────────────────────────────────────────────────
export function SuppressionBadge({ email, onUnsuppress }: { email: string; onUnsuppress?: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: suppression, refetch } = trpc.admin.getSuppressionStatus.useQuery(
    { email },
    { enabled: !!email, staleTime: 60_000 }
  );
  const unsuppress = trpc.admin.unsuppressEmail.useMutation({
    onSuccess: () => {
      toast.success(`${email} unsuppressed — emails will resume`);
      setOpen(false);
      refetch();
      onUnsuppress?.();
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to unsuppress email");
      setOpen(false);
    },
  });
  if (!suppression) return null;
  const suppressedDate = new Date(suppression.suppressedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <>
      <div className="flex items-center gap-1 mt-0.5">
        <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0 h-4 gap-0.5 cursor-default" title={`Suppressed: ${suppression.reason} on ${suppressedDate}`}>
          <MailX className="h-2.5 w-2.5" />
          {suppression.reason}
        </Badge>
        <button
          className="h-4 w-4 rounded hover:bg-emerald-100 flex items-center justify-center transition-colors"
          title="Unsuppress email"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          disabled={unsuppress.isPending}
        >
          <RotateCcw className="h-2.5 w-2.5 text-emerald-600" />
        </button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Unsuppress Email Address?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-muted px-4 py-3 text-sm space-y-1">
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium font-mono">{email}</span></div>
              <div><span className="text-muted-foreground">Reason:</span> <span className="font-medium capitalize">{suppression.reason}</span></div>
              <div><span className="text-muted-foreground">Suppressed on:</span> <span className="font-medium">{suppressedDate}</span></div>
            </div>
            <p className="text-sm text-muted-foreground">
              This will re-enable transactional email delivery to this address. Only unsuppress if you are confident the issue has been resolved.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={unsuppress.isPending}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => unsuppress.mutate({ suppressionId: suppression.id })}
              disabled={unsuppress.isPending}
            >
              {unsuppress.isPending ? "Unsuppressing…" : "Confirm Unsuppress"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
