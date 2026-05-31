/**
 * Newsletter Management Console
 * Admin-only page for managing subscribers, creating campaigns, and using the AI News Bot.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Mail, Users, BarChart3, Sparkles, Plus, Send, Trash2, Edit2,
  Download, RefreshCw, ArrowLeft, Eye, CheckCircle2, Clock, XCircle,
  FileText, Bot, Target, TrendingUp, Loader2,
} from "lucide-react";

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: any; label: string; value: number | string; color: string; sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-slate-100 text-slate-700" },
    scheduled: { label: "Scheduled", className: "bg-amber-100 text-amber-700" },
    sent: { label: "Sent", className: "bg-emerald-100 text-emerald-700" },
    cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
  };
  const s = map[status] ?? { label: status, className: "bg-slate-100 text-slate-700" };
  return <Badge className={`${s.className} border-0 font-medium`}>{s.label}</Badge>;
}

// ─── Subscribers Tab ──────────────────────────────────────────────────────────
function SubscribersTab() {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<"all" | "landing_page" | "onboarding" | "dashboard">("all");
  const [status, setStatus] = useState<"all" | "active" | "unsubscribed">("active");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.newsletter.subscribers.list.useQuery({
    search: search || undefined,
    source,
    status,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });
  const { data: stats } = trpc.newsletter.subscribers.stats.useQuery();
  const { data: csvData } = trpc.newsletter.subscribers.exportCsv.useQuery(undefined, { enabled: false });
  const unsubscribeMutation = trpc.newsletter.subscribers.unsubscribe.useMutation({
    onSuccess: () => {
      utils.newsletter.subscribers.list.invalidate();
      utils.newsletter.subscribers.stats.invalidate();
      toast.success("Subscriber unsubscribed");
    },
  });
  const deleteMutation = trpc.newsletter.subscribers.delete.useMutation({
    onSuccess: () => {
      utils.newsletter.subscribers.list.invalidate();
      utils.newsletter.subscribers.stats.invalidate();
      toast.success("Subscriber deleted");
    },
  });

  async function handleExport() {
    try {
      const result = await utils.client.newsletter.subscribers.exportCsv.query();
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `educhamp-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.count} subscribers`);
    } catch {
      toast.error("Export failed");
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Subscribers" value={stats?.total ?? 0} color="bg-indigo-500" />
        <StatCard icon={CheckCircle2} label="Active" value={stats?.active ?? 0} color="bg-emerald-500" />
        <StatCard icon={XCircle} label="Unsubscribed" value={stats?.unsubscribed ?? 0} color="bg-slate-400" />
        <StatCard icon={Target} label="From Landing Page" value={stats?.bySource?.landing_page ?? 0} color="bg-violet-500" />
      </div>

      {/* Filters + Export */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search email or name..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="max-w-xs"
        />
        <Select value={source} onValueChange={v => { setSource(v as any); setPage(0); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="landing_page">Landing Page</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="dashboard">Dashboard</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={v => { setStatus(v as any); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExport} className="gap-2 ml-auto">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Subscribed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.subscribers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No subscribers found
                </TableCell>
              </TableRow>
            ) : data?.subscribers.map(sub => (
              <TableRow key={sub.id}>
                <TableCell className="font-mono text-sm">{sub.email}</TableCell>
                <TableCell>{sub.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{sub.source.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {sub.subscribedAt ? new Date(sub.subscribedAt).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell>
                  {sub.isActive
                    ? <Badge className="bg-emerald-100 text-emerald-700 border-0">Active</Badge>
                    : <Badge className="bg-slate-100 text-slate-600 border-0">Unsubscribed</Badge>
                  }
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {sub.isActive && (
                      <Button size="sm" variant="ghost" className="text-amber-600 h-7 px-2"
                        onClick={() => unsubscribeMutation.mutate({ id: sub.id })}>
                        Unsub
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-red-500 h-7 px-2"
                      onClick={() => deleteMutation.mutate({ id: sub.id })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.total)} of {data.total}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={(page + 1) * PAGE_SIZE >= data.total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Draft Dialog ──────────────────────────────────────────────────────────
function AIDraftDialog({ open, onClose, onApply }: {
  open: boolean;
  onClose: () => void;
  onApply: (draft: { subject: string; bodyHtml: string; bodyText: string; title: string }) => void;
}) {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<"professional" | "friendly" | "motivational" | "informational">("friendly");
  const [segment, setSegment] = useState<"all" | "students" | "parents" | "landing_page">("all");
  const [includeCourseTips, setIncludeCourseTips] = useState(true);
  const aiDraft = trpc.newsletter.campaigns.aiDraft.useMutation();

  async function handleGenerate() {
    if (!topic.trim()) { toast.error("Please enter a topic"); return; }
    try {
      const draft = await aiDraft.mutateAsync({ topic, tone, segment, includeCourseTips });
      onApply(draft);
      onClose();
      toast.success("AI draft applied! Review and edit before sending.");
    } catch {
      toast.error("AI draft generation failed. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-600" />
            AI News Bot — Generate Newsletter Draft
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Topic / Prompt</label>
            <Textarea
              placeholder="e.g., 'Back to school tips for AP students', 'New AP Calculus BC course features', 'Study habits for exam season'..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Tone</label>
              <Select value={tone} onValueChange={v => setTone(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="motivational">Motivational</SelectItem>
                  <SelectItem value="informational">Informational</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Audience</label>
              <Select value={segment} onValueChange={v => setSegment(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subscribers</SelectItem>
                  <SelectItem value="students">Students</SelectItem>
                  <SelectItem value="parents">Parents</SelectItem>
                  <SelectItem value="landing_page">Landing Page Leads</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeCourseTips}
              onChange={e => setIncludeCourseTips(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Include course tips / learning insights</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={aiDraft.isPending} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            {aiDraft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {aiDraft.isPending ? "Generating..." : "Generate Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Campaign Editor ──────────────────────────────────────────────────────────
function CampaignEditor({ campaignId, onBack }: { campaignId: number | null; onBack: () => void }) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [segment, setSegment] = useState<"all" | "students" | "parents" | "landing_page">("all");
  const [scheduledAt, setScheduledAt] = useState("");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: existing, isLoading } = trpc.newsletter.campaigns.get.useQuery(
    { id: campaignId! },
    { enabled: campaignId !== null }
  );

  // Initialize form from existing campaign
  if (existing && !initialized) {
    setTitle(existing.title);
    setSubject(existing.subject);
    setBodyHtml(existing.bodyHtml);
    setBodyText(existing.bodyText ?? "");
    setSegment(existing.segment as any);
    setScheduledAt(existing.scheduledAt ? new Date(existing.scheduledAt).toISOString().slice(0, 16) : "");
    setInitialized(true);
  }

  const createMutation = trpc.newsletter.campaigns.create.useMutation({
    onSuccess: () => {
      utils.newsletter.campaigns.list.invalidate();
      utils.newsletter.campaigns.analytics.invalidate();
      toast.success("Campaign saved as draft");
      onBack();
    },
  });
  const updateMutation = trpc.newsletter.campaigns.update.useMutation({
    onSuccess: () => {
      utils.newsletter.campaigns.list.invalidate();
      toast.success("Campaign updated");
      onBack();
    },
  });
  const markSentMutation = trpc.newsletter.campaigns.markSent.useMutation({
    onSuccess: (data) => {
      utils.newsletter.campaigns.list.invalidate();
      utils.newsletter.campaigns.analytics.invalidate();
      toast.success(`Campaign sent to ${data.recipientCount} recipients!`);
      onBack();
    },
  });

  function handleSave() {
    if (!title || !subject || !bodyHtml) {
      toast.error("Title, subject, and body are required");
      return;
    }
    const payload = {
      title, subject, bodyHtml,
      bodyText: bodyText || undefined,
      segment,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
    };
    if (campaignId) {
      updateMutation.mutate({ id: campaignId, ...payload });
    } else {
      createMutation.mutate({ ...payload, aiGenerated: false });
    }
  }

  function handleSend() {
    if (!campaignId) { toast.error("Save the campaign first"); return; }
    if (!confirm(`Send this campaign to all ${segment === "all" ? "active" : segment} subscribers? This cannot be undone.`)) return;
    markSentMutation.mutate({ id: campaignId });
  }

  function applyAiDraft(draft: { subject: string; bodyHtml: string; bodyText: string; title: string }) {
    setTitle(prev => prev || draft.title);
    setSubject(draft.subject);
    setBodyHtml(draft.bodyHtml);
    setBodyText(draft.bodyText);
  }

  if (isLoading && campaignId) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  }

  const isSent = existing?.status === "sent";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Campaigns
        </Button>
        <h2 className="text-xl font-semibold">
          {campaignId ? "Edit Campaign" : "New Campaign"}
        </h2>
        {existing && <StatusBadge status={existing.status} />}
        {existing?.aiGenerated && (
          <Badge className="bg-indigo-100 text-indigo-700 border-0 gap-1">
            <Bot className="h-3 w-3" /> AI Generated
          </Badge>
        )}
      </div>

      {isSent && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          This campaign has already been sent and cannot be edited.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Campaign Title (internal)</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Back to School 2025" disabled={isSent} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email Subject Line</label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="What students see in their inbox..." disabled={isSent} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  HTML Body
                  <Button variant="ghost" size="sm" className="ml-2 h-6 px-2 text-xs"
                    onClick={() => setPreviewMode(p => !p)}>
                    <Eye className="h-3 w-3 mr-1" /> {previewMode ? "Edit" : "Preview"}
                  </Button>
                </label>
                {previewMode ? (
                  <div
                    className="border rounded-lg p-4 min-h-[300px] bg-white overflow-auto text-sm"
                    dangerouslySetInnerHTML={{ __html: bodyHtml }}
                  />
                ) : (
                  <Textarea
                    value={bodyHtml}
                    onChange={e => setBodyHtml(e.target.value)}
                    placeholder="<p>Hello {{name}},</p>..."
                    rows={12}
                    className="font-mono text-xs"
                    disabled={isSent}
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Plain Text Version (optional)</label>
                <Textarea
                  value={bodyText}
                  onChange={e => setBodyText(e.target.value)}
                  placeholder="Plain text fallback for email clients that don't support HTML..."
                  rows={4}
                  disabled={isSent}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: settings */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Send Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Audience Segment</label>
                <Select value={segment} onValueChange={v => setSegment(v as any)} disabled={isSent}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Active Subscribers</SelectItem>
                    <SelectItem value="students">Students (onboarding)</SelectItem>
                    <SelectItem value="parents">Parents (onboarding)</SelectItem>
                    <SelectItem value="landing_page">Landing Page Leads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Schedule Send (optional)</label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  disabled={isSent}
                />
                <p className="text-xs text-muted-foreground mt-1">Leave blank to save as draft</p>
              </div>
            </CardContent>
          </Card>

          {!isSent && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-600" /> AI News Bot
                </CardTitle>
                <CardDescription>Generate a newsletter draft with AI</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => setAiDialogOpen(true)}
                >
                  <Sparkles className="h-4 w-4" /> Generate with AI
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-2">
            {!isSent && (
              <>
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                  <FileText className="h-4 w-4" /> Save Draft
                </Button>
                {campaignId && (
                  <Button
                    onClick={handleSend}
                    disabled={markSentMutation.isPending}
                    variant="outline"
                    className="gap-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                  >
                    {markSentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send Campaign
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <AIDraftDialog
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        onApply={applyAiDraft}
      />
    </div>
  );
}

// ─── Campaigns Tab ────────────────────────────────────────────────────────────
function CampaignsTab() {
  const [editingId, setEditingId] = useState<number | null | "new">(undefined as any);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "scheduled" | "sent" | "cancelled">("all");
  const utils = trpc.useUtils();

  const { data: analytics } = trpc.newsletter.campaigns.analytics.useQuery();
  const { data, isLoading } = trpc.newsletter.campaigns.list.useQuery({ status: statusFilter });
  const deleteMutation = trpc.newsletter.campaigns.delete.useMutation({
    onSuccess: () => {
      utils.newsletter.campaigns.list.invalidate();
      utils.newsletter.campaigns.analytics.invalidate();
      toast.success("Campaign deleted");
    },
  });

  if (editingId !== undefined) {
    return (
      <CampaignEditor
        campaignId={editingId === "new" ? null : editingId}
        onBack={() => setEditingId(undefined as any)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Mail} label="Total Campaigns" value={analytics?.total ?? 0} color="bg-indigo-500" />
        <StatCard icon={Send} label="Sent" value={analytics?.sent ?? 0} color="bg-emerald-500"
          sub={`${analytics?.totalRecipients ?? 0} total recipients`} />
        <StatCard icon={TrendingUp} label="Avg Open Rate" value={`${analytics?.avgOpenRate ?? 0}%`} color="bg-amber-500" />
        <StatCard icon={Clock} label="Scheduled" value={analytics?.scheduled ?? 0} color="bg-violet-500" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setEditingId("new")} className="gap-2 ml-auto bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> New Campaign
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Segment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Sent / Scheduled</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <Mail className="h-10 w-10 text-slate-300" />
                    <p>No campaigns yet. Create your first campaign!</p>
                    <Button onClick={() => setEditingId("new")} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="h-4 w-4" /> New Campaign
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : data?.campaigns.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium max-w-[180px] truncate">{c.title}</TableCell>
                <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{c.subject}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs capitalize">{c.segment.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell className="text-sm">{c.recipientCount ?? 0}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.sentAt
                    ? new Date(c.sentAt).toLocaleDateString()
                    : c.scheduledAt
                    ? new Date(c.scheduledAt).toLocaleDateString()
                    : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="h-7 px-2"
                      onClick={() => setEditingId(c.id)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    {c.status !== "sent" && (
                      <Button size="sm" variant="ghost" className="text-red-500 h-7 px-2"
                        onClick={() => deleteMutation.mutate({ id: c.id })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NewsletterConsole() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">This page is only accessible to administrators.</p>
            <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/admin")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Admin Console
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Newsletter Console</h1>
              <p className="text-xs text-muted-foreground">Manage subscribers, campaigns, and AI-generated content</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="campaigns">
          <TabsList className="mb-6">
            <TabsTrigger value="campaigns" className="gap-2">
              <Mail className="h-4 w-4" /> Campaigns
            </TabsTrigger>
            <TabsTrigger value="subscribers" className="gap-2">
              <Users className="h-4 w-4" /> Subscribers
            </TabsTrigger>
          </TabsList>
          <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
          <TabsContent value="subscribers"><SubscribersTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
