import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  MessageCircle, Search, Filter, Users, Mail, Phone,
  CheckCircle, Clock, Archive, Eye, StickyNote, X,
  ArrowLeft, Download, RefreshCw, ChevronLeft, ChevronRight,
  User, Bot, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type StatusFilter = "all" | "active" | "converted" | "archived";

function statusBadge(status: string) {
  switch (status) {
    case "converted": return <Badge className="bg-emerald-100 text-emerald-700 border-0">Converted</Badge>;
    case "archived": return <Badge className="bg-slate-100 text-slate-600 border-0">Archived</Badge>;
    default: return <Badge className="bg-blue-100 text-blue-700 border-0">Active</Badge>;
  }
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ChatManagement() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [hasContact, setHasContact] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [showNoteEditor, setShowNoteEditor] = useState(false);

  const PAGE_SIZE = 15;

  const { data: stats } = trpc.landing.adminGetChatStats.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const { data: sessionsData, isLoading: sessionsLoading, refetch } = trpc.landing.adminGetSessions.useQuery(
    { search: search || undefined, status: statusFilter, hasContact, page, pageSize: PAGE_SIZE },
    { enabled: !!user && user.role === "admin" }
  );

  const { data: conversationData, isLoading: convLoading } = trpc.landing.adminGetConversation.useQuery(
    { sessionId: selectedSessionId! },
    { enabled: selectedSessionId !== null && !!user && user.role === "admin" }
  );

  const updateSession = trpc.landing.adminUpdateSession.useMutation({
    onSuccess: () => { refetch(); toast.success("Session updated"); },
    onError: () => toast.error("Failed to update session"),
  });

  if (authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <p className="font-semibold text-slate-900 mb-1">Access Denied</p>
            <p className="text-sm text-slate-500 mb-4">Admin access required.</p>
            <Button onClick={() => navigate("/admin")} variant="outline" size="sm">Back to Admin</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sessions = sessionsData?.sessions ?? [];
  const total = sessionsData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleExportCSV() {
    const rows = sessions.map(s => [
      s.id,
      s.visitorName ?? "",
      s.visitorEmail ?? "",
      s.visitorPhone ?? "",
      s.status,
      s.messageCount,
      s.source ?? "",
      formatDate(s.createdAt),
    ]);
    const header = ["ID", "Name", "Email", "Phone", "Status", "Messages", "Source", "Created"];
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleSaveNote() {
    if (!selectedSessionId) return;
    updateSession.mutate({ sessionId: selectedSessionId, adminNote: noteText });
    setShowNoteEditor(false);
  }

  const selectedSession = conversationData?.session;
  const messages = conversationData?.messages ?? [];

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Admin
            </Button>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-indigo-600" />
              <h1 className="font-bold text-slate-900">Chat Management</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Sessions", value: stats?.total ?? 0, icon: MessageCircle, color: "text-indigo-600 bg-indigo-50" },
            { label: "Active", value: stats?.active ?? 0, icon: Clock, color: "text-blue-600 bg-blue-50" },
            { label: "Converted (Lead)", value: stats?.converted ?? 0, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
            { label: "With Email", value: stats?.withEmail ?? 0, icon: Mail, color: "text-amber-600 bg-amber-50" },
          ].map(s => (
            <Card key={s.label} className="border-slate-100">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${s.color}`}>
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{s.value.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Session List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters */}
            <Card className="border-slate-100">
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="pl-9 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as StatusFilter); setPage(1); }}>
                    <SelectTrigger className="flex-1 text-sm h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant={hasContact === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHasContact(prev => prev === true ? undefined : true)}
                    className="text-xs gap-1"
                  >
                    <Mail className="h-3 w-3" /> Has Email
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Session rows */}
            <div className="space-y-2">
              {sessionsLoading ? (
                <div className="text-center py-8 text-slate-400 text-sm">Loading sessions...</div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No sessions found</div>
              ) : sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => {
                    setSelectedSessionId(session.id);
                    setNoteText(session.adminNotes ?? "");
                    setShowNoteEditor(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedSessionId === session.id
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {session.visitorName ?? "Anonymous Visitor"}
                        </p>
                        {session.visitorEmail && (
                          <p className="text-xs text-slate-500 truncate">{session.visitorEmail}</p>
                        )}
                      </div>
                    </div>
                    {statusBadge(session.status)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                    <span>{session.messageCount} messages</span>
                    <span>{formatDate(session.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{total} total</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-slate-600 px-2">{page} / {totalPages}</span>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Conversation Viewer */}
          <div className="lg:col-span-3">
            {selectedSessionId === null ? (
              <Card className="border-slate-100 h-full flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center text-slate-400 py-12">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Select a session to view the conversation</p>
                  <p className="text-sm mt-1">Click any session on the left to view messages</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-slate-100">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        {selectedSession?.visitorName ?? "Anonymous Visitor"}
                      </CardTitle>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {selectedSession?.visitorEmail && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Mail className="h-3 w-3" /> {selectedSession.visitorEmail}
                          </span>
                        )}
                        {selectedSession?.visitorPhone && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Phone className="h-3 w-3" /> {selectedSession.visitorPhone}
                          </span>
                        )}
                        {selectedSession && statusBadge(selectedSession.status)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNoteEditor(!showNoteEditor)}
                        className="gap-1.5 text-xs"
                      >
                        <StickyNote className="h-3.5 w-3.5" /> Note
                      </Button>
                      <Select
                        value={selectedSession?.status ?? "active"}
                        onValueChange={v => updateSession.mutate({ sessionId: selectedSessionId, status: v as "active" | "converted" | "archived" })}
                      >
                        <SelectTrigger className="h-8 text-xs w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Admin note editor */}
                  {showNoteEditor && (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        placeholder="Add a follow-up note about this lead..."
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        className="text-sm resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveNote} className="text-xs">Save Note</Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowNoteEditor(false)} className="text-xs">Cancel</Button>
                      </div>
                    </div>
                  )}

                  {selectedSession?.adminNotes && !showNoteEditor && (
                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      <span className="font-medium">Note: </span>{selectedSession.adminNotes}
                    </div>
                  )}
                </CardHeader>

                <CardContent className="p-4">
                  {convLoading ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Loading conversation...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">No messages recorded</div>
                  ) : (
                    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                      {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          {msg.role === "assistant" && (
                            <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Bot className="h-3.5 w-3.5 text-indigo-600" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                              msg.role === "user"
                                ? "bg-indigo-600 text-white rounded-br-sm"
                                : "bg-slate-100 text-slate-800 rounded-bl-sm"
                            }`}
                          >
                            {msg.content}
                            <p className={`text-xs mt-1 ${msg.role === "user" ? "text-indigo-200" : "text-slate-400"}`}>
                              {formatDate(msg.createdAt)}
                            </p>
                          </div>
                          {msg.role === "user" && (
                            <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <User className="h-3.5 w-3.5 text-slate-600" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Session metadata */}
                  {selectedSession && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      <span>Source: {selectedSession.source ?? "unknown"}</span>
                      <span>Started: {formatDate(selectedSession.createdAt)}</span>
                      <span>Messages: {selectedSession.messageCount}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
