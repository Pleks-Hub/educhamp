/**
 * DemoRequestsTab — Admin CRM for ISD/School demo requests
 * Displays all submitted demo requests with search, filter, status management,
 * assignment, and email reply workflow.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Building2, Mail, Phone, Users, Calendar, MessageSquare,
  Search, Filter, RefreshCw, Eye, Send, Edit2, CheckCircle2,
  Clock, Star, Sparkles, ChevronLeft, ChevronRight,
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700 border-blue-200" },
  contacted: { label: "Contacted", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  demo_scheduled: { label: "Demo Scheduled", color: "bg-purple-100 text-purple-700 border-purple-200" },
  proposal_sent: { label: "Proposal Sent", color: "bg-orange-100 text-orange-700 border-orange-200" },
  closed_won: { label: "Closed Won", color: "bg-green-100 text-green-700 border-green-200" },
  closed_lost: { label: "Closed Lost", color: "bg-red-100 text-red-700 border-red-200" },
  on_hold: { label: "On Hold", color: "bg-slate-100 text-slate-600 border-slate-200" },
};

const INTEREST_LABELS: Record<string, string> = {
  demo: "🎯 Demo",
  pilot: "🚀 Pilot",
  district_license: "🏫 District License",
  campus_license: "🏛️ Campus License",
  partnership: "🤝 Partnership",
  curriculum_licensing: "📚 Curriculum Licensing",
  other: "💬 General Inquiry",
};

type DemoRequest = {
  id: number;
  fullName: string;
  schoolName: string;
  roleTitle: string;
  email: string;
  phone?: string | null;
  numStudents?: string | null;
  gradeLevels?: string | null;
  subjects?: string | null;
  challenges?: string | null;
  interestType: string;
  preferredTime?: string | null;
  notes?: string | null;
  status: string;
  assignedTo?: string | null;
  adminNotes?: string | null;
  respondedAt?: Date | null;
  createdAt: Date;
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.color}`}>
      {s.label}
    </span>
  );
}

export function DemoRequestsTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [interestFilter, setInterestFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<DemoRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyStatus, setReplyStatus] = useState<"contacted" | "demo_scheduled" | "proposal_sent" | "closed_won" | "closed_lost" | "on_hold">("contacted");
  const [editNotesOpen, setEditNotesOpen] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editAssignee, setEditAssignee] = useState("");

  const utils = trpc.useUtils();

  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout((handleSearchChange as any)._t);
    (handleSearchChange as any)._t = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const { data: stats } = trpc.admin.getDemoRequestStats.useQuery();
  const { data, isLoading, refetch } = trpc.admin.listDemoRequests.useQuery({
    search: debouncedSearch || undefined,
    status: statusFilter as "all" | "new" | "contacted" | "demo_scheduled" | "proposal_sent" | "closed_won" | "closed_lost" | "on_hold",
    interestType: interestFilter as "all" | "demo" | "pilot" | "district_license" | "campus_license" | "partnership" | "curriculum_licensing" | "other",
    page,
    pageSize: 25,
  });

  const updateMutation = trpc.admin.updateDemoRequest.useMutation({
    onSuccess: () => {
      utils.admin.listDemoRequests.invalidate();
      utils.admin.getDemoRequestStats.invalidate();
      toast.success("Request updated");
    },
  });

  const respondMutation = trpc.admin.respondToDemoRequest.useMutation({
    onSuccess: () => {
      utils.admin.listDemoRequests.invalidate();
      utils.admin.getDemoRequestStats.invalidate();
      setReplyOpen(false);
      setReplyMessage("");
      toast.success("Reply sent successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  function openDetail(req: DemoRequest) {
    setSelectedRequest(req);
    setDetailOpen(true);
  }

  function openReply(req: DemoRequest) {
    setSelectedRequest(req);
    setReplyMessage("");
    setReplyStatus("contacted");
    setReplyOpen(true);
  }

  function openEditNotes(req: DemoRequest) {
    setSelectedRequest(req);
    setEditNotes(req.adminNotes ?? "");
    setEditAssignee(req.assignedTo ?? "");
    setEditNotesOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Requests", value: stats?.total ?? 0, icon: Building2, color: "text-indigo-600" },
          { label: "New", value: stats?.new ?? 0, icon: Star, color: "text-blue-600" },
          { label: "Contacted", value: stats?.contacted ?? 0, icon: Mail, color: "text-yellow-600" },
          { label: "Demo Scheduled", value: stats?.scheduled ?? 0, icon: Calendar, color: "text-purple-600" },
          { label: "Closed Won", value: stats?.won ?? 0, icon: CheckCircle2, color: "text-green-600" },
        ].map(s => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center gap-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, school, or email…"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([v, s]) => (
              <SelectItem key={v} value={v}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={interestFilter} onValueChange={v => { setInterestFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Interest Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Interest Types</SelectItem>
            {Object.entries(INTEREST_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>School / ISD</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                      <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No demo requests yet</p>
                      <p className="text-sm mt-1">Requests submitted via the landing page will appear here.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map(req => (
                    <TableRow key={req.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm text-slate-900">{req.fullName}</p>
                          <p className="text-xs text-slate-500">{req.roleTitle}</p>
                          <a href={`mailto:${req.email}`} className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />{req.email}
                          </a>
                          {req.phone && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />{req.phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-slate-800">{req.schoolName}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs">{INTEREST_LABELS[req.interestType] ?? req.interestType}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">{req.numStudents ?? "—"}</span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={req.status}
                          onValueChange={v => updateMutation.mutate({ id: req.id, status: v as "new" | "contacted" | "demo_scheduled" | "proposal_sent" | "closed_won" | "closed_lost" | "on_hold" })}
                        >
                          <SelectTrigger className="h-7 text-xs w-36 border-0 p-0 shadow-none">
                            <StatusBadge status={req.status} />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABELS).map(([v, s]) => (
                              <SelectItem key={v} value={v}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-500">{req.assignedTo ?? "—"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-400">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                        {req.respondedAt && (
                          <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3" />Replied
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(req as DemoRequest)} title="View details">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openReply(req as DemoRequest)} title="Send reply">
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditNotes(req as DemoRequest)} title="Edit notes">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Showing {Math.min((page - 1) * 25 + 1, total)}–{Math.min(page * 25, total)} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Detail Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              {selectedRequest?.schoolName}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Full Name", value: selectedRequest.fullName },
                  { label: "Role / Title", value: selectedRequest.roleTitle },
                  { label: "Email", value: selectedRequest.email },
                  { label: "Phone", value: selectedRequest.phone ?? "—" },
                  { label: "Number of Students", value: selectedRequest.numStudents ?? "—" },
                  { label: "Interest Type", value: INTEREST_LABELS[selectedRequest.interestType] ?? selectedRequest.interestType },
                  { label: "Preferred Time", value: selectedRequest.preferredTime ?? "—" },
                  { label: "Status", value: <StatusBadge status={selectedRequest.status} /> },
                  { label: "Assigned To", value: selectedRequest.assignedTo ?? "Unassigned" },
                  { label: "Submitted", value: new Date(selectedRequest.createdAt).toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-slate-800 font-medium">{value}</p>
                  </div>
                ))}
              </div>
              {selectedRequest.gradeLevels && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Grade Levels</p>
                  <div className="flex flex-wrap gap-1">
                    {(JSON.parse(selectedRequest.gradeLevels) as string[]).map(g => (
                      <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedRequest.subjects && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Subjects of Interest</p>
                  <div className="flex flex-wrap gap-1">
                    {(JSON.parse(selectedRequest.subjects) as string[]).map(s => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedRequest.challenges && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Learning Challenges</p>
                  <p className="text-slate-700 bg-slate-50 rounded p-3">{selectedRequest.challenges}</p>
                </div>
              )}
              {selectedRequest.notes && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Additional Notes</p>
                  <p className="text-slate-700 bg-slate-50 rounded p-3">{selectedRequest.notes}</p>
                </div>
              )}
              {selectedRequest.adminNotes && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Admin Notes</p>
                  <p className="text-slate-700 bg-amber-50 border border-amber-200 rounded p-3">{selectedRequest.adminNotes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
            <Button onClick={() => { setDetailOpen(false); if (selectedRequest) openReply(selectedRequest); }} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Send className="w-4 h-4" /> Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reply Dialog ── */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-indigo-600" />
              Reply to {selectedRequest?.fullName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
              <p><strong>To:</strong> {selectedRequest?.email}</p>
              <p><strong>School:</strong> {selectedRequest?.schoolName}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Reply Message</Label>
              <Textarea
                placeholder="Write your reply here. This will be sent as a branded EduChamp email to the requester."
                value={replyMessage}
                onChange={e => setReplyMessage(e.target.value)}
                rows={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Update Status To</Label>
              <Select value={replyStatus} onValueChange={v => setReplyStatus(v as typeof replyStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="demo_scheduled">Demo Scheduled</SelectItem>
                  <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                  <SelectItem value="closed_won">Closed Won</SelectItem>
                  <SelectItem value="closed_lost">Closed Lost</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyOpen(false)}>Cancel</Button>
            <Button
              disabled={replyMessage.trim().length < 10 || respondMutation.isPending}
              onClick={() => selectedRequest && respondMutation.mutate({ id: selectedRequest.id, replyMessage, newStatus: replyStatus })}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              {respondMutation.isPending ? "Sending…" : <><Send className="w-4 h-4" /> Send Reply</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Notes Dialog ── */}
      <Dialog open={editNotesOpen} onOpenChange={setEditNotesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Notes &amp; Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Input
                placeholder="Team member name or email"
                value={editAssignee}
                onChange={e => setEditAssignee(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Internal Admin Notes</Label>
              <Textarea
                placeholder="Internal notes visible only to admins…"
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNotesOpen(false)}>Cancel</Button>
            <Button
              disabled={updateMutation.isPending}
              onClick={() => selectedRequest && updateMutation.mutate({
                id: selectedRequest.id,
                assignedTo: editAssignee || undefined,
                adminNotes: editNotes || undefined,
              }, { onSuccess: () => setEditNotesOpen(false) })}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
