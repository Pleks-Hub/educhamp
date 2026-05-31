import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { StreamdownRenderer, useStreamdownReady } from "@/components/StreamdownRenderer";
import {
  AlertTriangle,
  BookOpen,
  Brain,
  ChevronDown,
  ClipboardList,
  Download,
  FileText,
  Filter,
  History,
  Loader2,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Target,
  Users,
  WifiOff,
  Wrench,
  X,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/useMobile";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { CourseContextBanner } from "@/components/CourseContextBanner";
import { NavTooltip } from "@/components/NavTooltip";
import { TUTOR_TOOLTIPS } from "@/lib/tooltipContent";

// parent_summary is a parent-only mode; students see only the 7 learning modes
type TutorMode = "teach" | "practice" | "quiz" | "exam_review" | "exam_prep" | "remediation" | "parent_summary" | "misconception_drill";
const STUDENT_MODES: TutorMode[] = ["teach", "practice", "quiz", "exam_review", "exam_prep", "remediation", "misconception_drill"];

function getModes(courseLabel: string): {
  id: TutorMode;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
  starters: string[];
}[] {
  return [
    {
      id: "teach",
      label: "Teach",
      icon: BookOpen,
      description: "Explain concepts clearly with examples",
      color: "bg-blue-100 text-blue-700 border-blue-200",
      starters: [
        `Explain a key concept from ${courseLabel} with an example`,
        `What are the most important topics in ${courseLabel}?`,
        "Walk me through the current lesson step by step",
        "Explain this concept in simple terms",
      ],
    },
    {
      id: "practice",
      label: "Practice",
      icon: Target,
      description: "Guided problem-solving matched to your level",
      color: "bg-green-100 text-green-700 border-green-200",
      starters: [
        "Give me a practice problem based on my weakest skills",
        `Give me a challenging problem from ${courseLabel}`,
        "Help me work through a practice problem step by step",
        "Give me a word problem to solve",
      ],
    },
    {
      id: "quiz",
      label: "Quiz",
      icon: ClipboardList,
      description: "Test your knowledge interactively",
      color: "bg-purple-100 text-purple-700 border-purple-200",
      starters: [
        "Quiz me on my weakest unit",
        `Give me 5 questions on ${courseLabel}`,
        "Quiz me on what I've been learning",
        "Test me on everything I've learned so far",
      ],
    },
    {
      id: "exam_review",
      label: "Exam Review",
      icon: FileText,
      description: "Prepare for upcoming assessments",
      color: "bg-amber-100 text-amber-700 border-amber-200",
      starters: [
        "Create a personalized review plan for my exam",
        "What are the most important topics I should review?",
        "Give me a practice exam based on my progress",
        "Review the key formulas and concepts I need to know",
      ],
    },
    {
      id: "remediation",
      label: "Remediation",
      icon: Wrench,
      description: "Targeted support for skills below 60%",
      color: "bg-red-100 text-red-700 border-red-200",
      starters: [
        "Help me with my weakest skills",
        "I'm struggling with this topic — start from the beginning",
        "Reteach me the concepts I'm failing",
        "Break down the hardest topic for me step by step",
      ],
    },
    {
      id: "parent_summary",
      label: "Parent Summary",
      icon: Users,
      description: "Full progress report for parents & guardians",
      color: "bg-teal-100 text-teal-700 border-teal-200",
      starters: [
        "Generate a full progress report for my parent",
        "Summarize my learning progress this week",
        `What should my parent know about my ${courseLabel} progress?`,
        "Create a summary of my strengths and areas to improve",
      ],
    },
    {
      id: "exam_prep",
      label: "Exam Prep",
      icon: Sparkles,
      description: "STAAR EOC exam questions from the official bank",
      color: "bg-indigo-100 text-indigo-700 border-indigo-200",
      starters: [
        "Start my STAAR exam prep session",
        "Give me exam-style questions from this course",
        "I want to practice with official exam questions",
        "Run me through a full exam prep session",
      ],
    },
    {
      id: "misconception_drill",
      label: "Misconception Drill",
      icon: Brain,
      description: "Practice questions targeting common mistakes",
      color: "bg-orange-100 text-orange-700 border-orange-200",
      starters: [
        "Give me a question that tests a common misconception in this lesson",
        "Quiz me on the mistakes students usually make here",
        "I want to practice the tricky parts of this topic",
        "Show me a question designed to catch common errors",
      ],
    },
  ];
}

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isError?: boolean; // TUX-2: marks a failed assistant response for retry UI
};


// ─── HistoryPanel Component ───────────────────────────────────────────────────

const MODE_LABELS: Record<string, string> = {
  teach: "Teach",
  practice: "Practice",
  quiz: "Quiz",
  exam_review: "Exam Review",
  exam_prep: "Exam Prep",
  remediation: "Remediation",
  parent_summary: "Parent Summary",
  misconception_drill: "Misconception Drill",
};

interface HistoryPanelProps {
  sessions: Array<{
    id: number;
    unitId: number | null;
    mode: string;
    messages: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  isLoading: boolean;
  units: Array<{ id: number; unitNumber: number; title: string }>;
  unitFilter: string;
  modeFilter: string;
  page: number;
  pageSize: number;
  onUnitFilter: (v: string) => void;
  onModeFilter: (v: string) => void;
  onPageChange: (p: number) => void;
}

function HistoryPanel({
  sessions,
  total,
  isLoading,
  units,
  unitFilter,
  modeFilter,
  page,
  pageSize,
  onUnitFilter,
  onModeFilter,
  onPageChange,
}: HistoryPanelProps) {
  const totalPages = Math.ceil(total / pageSize);

  function exportCSV() {
    const rows = sessions.map((s) => {
      const msgs = (s.messages as Array<{ role: string; content: string; timestamp?: number }>) ?? [];
      const unit = units.find((u) => u.id === s.unitId);
      return [
        s.id,
        unit ? `U${unit.unitNumber}: ${unit.title}` : "",
        MODE_LABELS[s.mode] ?? s.mode,
        msgs.length,
        new Date(s.createdAt).toLocaleString(),
        new Date(s.updatedAt).toLocaleString(),
      ];
    });
    const header = ["Session ID", "Unit", "Mode", "Messages", "Started", "Last Active"];
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tutor-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    const data = sessions.map((s) => {
      const unit = units.find((u) => u.id === s.unitId);
      return {
        id: s.id,
        unit: unit ? { id: unit.id, number: unit.unitNumber, title: unit.title } : null,
        mode: s.mode,
        messages: s.messages,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tutor-sessions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Filter bar */}
      <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-3 flex-wrap shrink-0">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={unitFilter} onValueChange={onUnitFilter}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="All Units" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Units</SelectItem>
            {units.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                U{u.unitNumber}: {u.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={modeFilter} onValueChange={onModeFilter}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="All Modes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            {Object.entries(MODE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{total} session{total !== 1 ? "s" : ""}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={exportCSV}
            disabled={sessions.length === 0}
          >
            <Download className="h-3 w-3" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={exportJSON}
            disabled={sessions.length === 0}
          >
            <Download className="h-3 w-3" />
            JSON
          </Button>
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center space-y-3">
            <History className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No sessions found</p>
            <p className="text-xs text-muted-foreground/70">
              {unitFilter !== "all" || modeFilter !== "all"
                ? "Try adjusting your filters"
                : "Start a chat to see your session history here"}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl mx-auto">
            {sessions.map((s) => {
              const msgs = (s.messages as Array<{ role: string; content: string }>) ?? [];
              const unit = units.find((u) => u.id === s.unitId);
              const lastMsg = msgs.filter((m) => m.role === "assistant").at(-1);
              const preview = lastMsg?.content?.slice(0, 120) ?? "No messages yet";
              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/30 hover:bg-muted/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Brain className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {MODE_LABELS[s.mode] ?? s.mode}
                        </span>
                        {unit && (
                          <Badge variant="secondary" className="text-xs">
                            U{unit.unitNumber}: {unit.title}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">
                          {new Date(s.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {preview}{preview.length >= 120 ? "…" : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {msgs.length} message{msgs.length !== 1 ? "s" : ""} · Started {new Date(s.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t px-4 py-3 flex items-center justify-between shrink-0 bg-background">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Tutor() {
  const { user } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const unitParam = params.get("unit") ? parseInt(params.get("unit")!, 10) : undefined;
  const lessonIdParam = params.get("lesson") ? parseInt(params.get("lesson")!, 10) : undefined;
  const childIdParam = params.get("childId") ? parseInt(params.get("childId")!, 10) : undefined;
  const modeParam = params.get("mode") as TutorMode | null;

  const [mode, setMode] = useState<TutorMode>(modeParam ?? "teach");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  // Track whether vendor-shiki has loaded — show branded overlay on first message send
  const streamdownReady = useStreamdownReady();
  const [shikiLoadingVisible, setShikiLoadingVisible] = useState(false);
  // TUX-3: COPPA consent required inline banner
  const [coppaBlocked, setCoppaBlocked] = useState(false);
  // TUX-4: connection-lost persistent banner
  const [connectionLost, setConnectionLost] = useState(false);
  // TUX-5: last user message for retry
  const lastUserMessageRef = useRef<string>("");
  // Use useMobile hook for reactive mobile detection (avoids SSR issues and Safari quirks)
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false); // default closed; updated in effect below

  // The key fix: use a plain div ref, not ScrollArea, so we control scrolling directly
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingAbortRef = useRef<AbortController | null>(null);

  // Initialize sidebar state based on screen size after mount (avoids hydration mismatch)
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Use active-course units from dashboard instead of global getAllUnits
  const { data: dashboard } = trpc.progress.getDashboard.useQuery();
  // Active-course units are returned by getDashboard; fall back to empty array
  const units = dashboard?.units ?? [];
  const { data: personalization } = trpc.onboarding.getPersonalization.useQuery(undefined, {
    enabled: !!user,
  });
  // Resolve the name the AI tutor uses: preferredName > displayName first word > account first name
  const aiName = (personalization as any)?.preferredName ||
    personalization?.displayName?.split(" ")[0] ||
    user?.name?.split(" ")[0] ||
    "there";
  const customWelcome = (personalization as any)?.aiWelcomeMessage as string | undefined;
  const courseLabel = dashboard?.courseTitle ?? "your course";
  const isStudent = !user || user.accountType === "student" || !user.accountType;
  // Visible modes: students see 5 learning modes; parents/teachers see all 6
  const MODES = getModes(courseLabel);
  const visibleModes = MODES.filter((m) => isStudent ? STUDENT_MODES.includes(m.id) : true);
  const [selectedUnit, setSelectedUnit] = useState<number | undefined>(unitParam);
  const currentUnit = units.find((u) => u.unitNumber === selectedUnit);

  // ── History tab state ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");
  const [historyUnitFilter, setHistoryUnitFilter] = useState<string>("all");
  const [historyModeFilter, setHistoryModeFilter] = useState<string>("all");
  const [historyPage, setHistoryPage] = useState(0);
  const HISTORY_PAGE_SIZE = 15;

  const historyQuery = trpc.tutor.listSessions.useQuery(
    {
      unitId: historyUnitFilter !== "all" ? parseInt(historyUnitFilter, 10) : undefined,
      mode: historyModeFilter !== "all" ? (historyModeFilter as any) : undefined,
      limit: HISTORY_PAGE_SIZE,
      offset: historyPage * HISTORY_PAGE_SIZE,
    },
    { enabled: activeTab === "history" && !!user }
  );

  const clearMutation = trpc.tutor.clearSession.useMutation({
    onSuccess: () => {
      setMessages([]);
      setSessionId(null);
      toast.success("Conversation cleared");
    },
  });

  // ── Scroll helpers ────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  // Auto-scroll on every new token during streaming
  useLayoutEffect(() => {
    if (isStreaming) {
      scrollToBottom("instant");
    }
  }, [messages, isStreaming, scrollToBottom]);

  // Scroll to bottom when messages first appear (non-streaming)
  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      scrollToBottom("smooth");
    }
  }, [messages.length, isStreaming, scrollToBottom]);

  // Show/hide scroll-to-bottom button
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollButton(distanceFromBottom > 120);
  }, []);

  // TUX-1: Stop streaming
  const stopStreaming = useCallback(() => {
    streamingAbortRef.current?.abort();
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || isStreaming) return;
      if (!user) {
        toast.error("Please sign in to use the AI Tutor");
        return;
      }

      // TUX-2: store last user message for retry
      lastUserMessageRef.current = text;
      // TUX-4: clear connection-lost banner on new send
      setConnectionLost(false);
      // TUX-3: clear COPPA banner on new send
      setCoppaBlocked(false);

      const userMessage: Message = { role: "user", content: text, timestamp: Date.now() };
      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setInput("");
      // Show the shiki loading overlay only if the chunk hasn't loaded yet
      if (!streamdownReady) setShikiLoadingVisible(true);

      if (streamingAbortRef.current) streamingAbortRef.current.abort();
      const controller = new AbortController();
      streamingAbortRef.current = controller;

      // Add placeholder assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: Date.now() }]);

      (async () => {
        try {
          const res = await fetch("/api/tutor/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: text,
              mode: safeMode,
              unitId: currentUnit?.id,
              unitNumber: selectedUnit,
              lessonId: lessonIdParam,
              sessionId: sessionId ?? undefined,
              childId: childIdParam,
            }),
            signal: controller.signal,
          });

          // TUX-3: COPPA consent required — show inline banner instead of toast
          if (res.status === 403) {
            const body = await res.json().catch(() => ({}));
            if (body?.error === "COPPA_CONSENT_REQUIRED") {
              setCoppaBlocked(true);
              setMessages((prev) => prev.slice(0, -1)); // remove empty placeholder
              return;
            }
          }

          if (!res.ok || !res.body) {
            throw new Error(`Server error: ${res.status}`);
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const dataStr = trimmed.slice(5).trim();
              try {
                const event = JSON.parse(dataStr);
                if (event.type === "token") {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === "assistant") {
                      updated[updated.length - 1] = { ...last, content: last.content + event.content };
                    }
                    return updated;
                  });
                } else if (event.type === "done") {
                  if (event.sessionId && !sessionId) setSessionId(event.sessionId);
                } else if (event.type === "error") {
                  toast.error("Tutor error: " + event.message);
                }
              } catch {
                // skip malformed
              }
            }
          }
        } catch (err: unknown) {
          if ((err as Error).name === "AbortError") {
            // User stopped streaming — remove the empty placeholder if nothing was streamed
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              return last?.role === "assistant" && !last.content ? prev.slice(0, -1) : prev;
            });
          } else {
            // TUX-4: network error — show connection-lost banner and mark message as errored
            setConnectionLost(true);
            // TUX-2: mark the last assistant message as errored for retry UI
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = { ...last, isError: true, content: last.content || "" };
              }
              return updated;
            });
          }
        } finally {
          setIsStreaming(false);
          setShikiLoadingVisible(false);
        }
      })();
    },
    [input, isStreaming, user, mode, currentUnit, selectedUnit, sessionId, streamdownReady]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleModeChange = (newMode: TutorMode) => {
    setMode(newMode);
    setMessages([]);
    setSessionId(null);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  // If a student somehow has parent_summary mode set, reset to teach
  const safeMode: TutorMode = (isStudent && mode === "parent_summary") ? "teach" : mode;
  // Show the quick-action chip when in misconception_drill mode with a lesson context
  const showMisconceptionChip = safeMode !== "misconception_drill" && !!lessonIdParam;
  // Show exam prep chip when a courseId is in context and mode isn't already exam_prep
  const showExamPrepChip = safeMode !== "exam_prep" && !lessonIdParam;
  const currentModeConfig = MODES.find((m: { id: TutorMode }) => m.id === safeMode) ?? MODES[0];
  const ModeIcon = currentModeConfig.icon;

  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">Sign in to use AI Tutor</h2>
          <p className="text-sm text-muted-foreground">
            Get personalized AI tutoring for your course.
          </p>
          <Button onClick={() => { window.location.href = getLoginUrl(); }}>Sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden page-enter">
      {/* TUX-6: Mobile sidebar backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px]"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* ── Left Sidebar ──────────────────────────────────────────────────────────────────── */}
      <aside
        className={`${
          isMobile
            ? `fixed inset-y-0 left-0 z-40 w-72 bg-background border-r shadow-xl flex flex-col transition-transform duration-200 ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              }`
            : `${
                sidebarOpen ? "w-64" : "w-0"
              } shrink-0 border-r bg-muted/20 flex flex-col overflow-hidden transition-all duration-200`
        }`}
      >
        <div className="p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-bold text-foreground">EduBot</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{courseLabel} · AI Learning Coach</p>
        </div>

        {/* Mode Selection */}
        <div className="p-3 border-b shrink-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-2">
            Mode
          </p>
          <div className="space-y-0.5">
            {visibleModes.map((m) => {
              const Icon = m.icon;
              const isActive = mode === m.id;
              const modeTooltipKey = `mode${m.id.charAt(0).toUpperCase()}${m.id.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase())}` as keyof typeof TUTOR_TOOLTIPS;
              const modeTooltip = TUTOR_TOOLTIPS[modeTooltipKey];
              return (
                <NavTooltip key={m.id} content={modeTooltip ?? { title: m.label, description: m.description }} side="right" delayDuration={700}>
                  <button
                    onClick={() => handleModeChange(m.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-sm ${
                      isActive
                        ? "bg-primary text-primary-foreground font-medium shadow-sm"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{m.label}</span>
                  </button>
                </NavTooltip>
              );
            })}
          </div>
        </div>

        {/* Unit Context */}
        <div className="p-3 flex-1 overflow-y-auto min-h-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-2">
            Unit Context
          </p>
          <button
            onClick={() => setSelectedUnit(undefined)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-all mb-1 ${
              !selectedUnit ? "bg-muted font-semibold text-foreground" : "hover:bg-muted/60 text-muted-foreground"
            }`}
          >
            <MessageSquare className="h-3 w-3 shrink-0" />
            <span>General — {courseLabel}</span>
          </button>
          {units.map((unit) => (
            <button
              key={unit.id}
              onClick={() => setSelectedUnit(unit.unitNumber)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-all mb-0.5 ${
                selectedUnit === unit.unitNumber
                  ? "bg-muted font-semibold text-foreground"
                  : "hover:bg-muted/60 text-muted-foreground"
              }`}
            >
              <span className="font-mono text-[10px] shrink-0 w-8 text-primary">U{unit.unitNumber}</span>
              <span className="truncate">{unit.title}</span>
            </button>
          ))}
        </div>

        {/* Clear */}
        {messages.length > 0 && (
          <div className="p-3 border-t shrink-0">
            <NavTooltip content={TUTOR_TOOLTIPS.clearChat} side="right">
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2 text-xs text-muted-foreground"
                onClick={() => {
                  if (sessionId) clearMutation.mutate({ sessionId });
                  else { setMessages([]); setSessionId(null); }
                }}
              >
                <RefreshCw className="h-3 w-3" />
                Clear Conversation
              </Button>
            </NavTooltip>
          </div>
        )}
      </aside>

      {/* ── Main Chat Area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b flex items-center px-4 gap-3 bg-background shrink-0">
          {/* Visually-hidden h1 for screen readers */}
          <h1 className="sr-only">AI Tutor — EduBot</h1>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors shrink-0"
            title="Toggle sidebar"
            aria-label="Toggle tutor sidebar"
          >
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {activeTab === "chat" ? (
            <>
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${currentModeConfig.color}`}>
                <ModeIcon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold leading-tight">{currentModeConfig.label} Mode</h2>
                <p className="text-xs text-muted-foreground truncate">{currentModeConfig.description}</p>
              </div>
              {currentUnit && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  U{currentUnit.unitNumber}: {currentUnit.title}
                </Badge>
              )}
            </>
          ) : (
            <>
              <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 bg-violet-100 text-violet-700 border border-violet-200">
                <History className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold leading-tight">Session History</h2>
                <p className="text-xs text-muted-foreground">Browse and export past sessions</p>
              </div>
            </>
          )}
          {/* Tab toggle */}
          <div className="ml-auto flex items-center gap-1 bg-muted rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === "chat"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-3 w-3" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === "history"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="h-3 w-3" />
              History
            </button>
          </div>
        </div>

        {/* ── Parent-Led Learning Mode Banner ─────────────────────────────── */}
        {activeTab === "chat" && (personalization as any)?.parentLedMode && (
          <div className="mx-4 mt-3 mb-0 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 flex items-start gap-3 text-sm">
            <span className="text-xl shrink-0 mt-0.5">👨‍👩‍👧</span>
            <div className="space-y-1 min-w-0">
              <p className="font-semibold text-amber-900 dark:text-amber-200 leading-tight">Parent-Led Mode is ON</p>
              <p className="text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
                <strong>Parent:</strong> Read EduBot's responses aloud to your child. Tap a question below together, then help your child pick an answer.
                EduBot will use simple words and short sentences designed for young learners.
              </p>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <HistoryPanel
            sessions={historyQuery.data?.sessions ?? []}
            total={historyQuery.data?.total ?? 0}
            isLoading={historyQuery.isLoading}
            units={units}
            unitFilter={historyUnitFilter}
            modeFilter={historyModeFilter}
            page={historyPage}
            pageSize={HISTORY_PAGE_SIZE}
            onUnitFilter={(v) => { setHistoryUnitFilter(v); setHistoryPage(0); }}
            onModeFilter={(v) => { setHistoryModeFilter(v); setHistoryPage(0); }}
            onPageChange={setHistoryPage}
          />
        )}

        {/* ── Messages — the key fix: plain overflow-y-auto div, not ScrollArea ── */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto min-h-0 px-4 py-5"
        >
          {messages.length === 0 ? (
            /* Empty state with EduBot introduction */
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-5 max-w-xl mx-auto">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-semibold text-primary uppercase tracking-widest">EduBot</span>
                  <span className="text-xs text-muted-foreground">· AI Learning Coach</span>
                </div>
                <h3 className="font-semibold text-foreground text-base">
                  {customWelcome
                    ? customWelcome
                    : `Hi ${aiName}! I'm EduBot, your personal AI learning coach for ${courseLabel}.`}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {customWelcome
                    ? currentModeConfig.description
                    : `I'm here to help you understand lessons, explain difficult concepts, guide you through practice questions, track your progress, and prepare you for quizzes and exams.${currentUnit ? ` We're currently on Unit ${currentUnit.unitNumber}: ${currentUnit.title}.` : ""} Ask me anything — let's learn together!`}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {currentModeConfig.starters.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs text-left px-3.5 py-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/60 transition-all text-muted-foreground hover:text-foreground leading-snug"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5 max-w-3xl mx-auto pb-2">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-primary/20">
                      <Brain className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "max-w-[75%] bg-primary text-primary-foreground rounded-br-sm"
                        : msg.isError
                        ? "max-w-[85%] bg-destructive/5 border border-destructive/30 rounded-bl-sm shadow-sm"
                        : "max-w-[85%] bg-card border border-border rounded-bl-sm shadow-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      msg.isError ? (
                        /* TUX-2: Error state with retry button */
                        <div className="space-y-2">
                          {msg.content ? (
                            <StreamdownRenderer className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:leading-relaxed [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_strong]:font-semibold [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
                              {msg.content}
                            </StreamdownRenderer>
                          ) : (
                            <p className="text-xs text-destructive">Response failed. Please try again.</p>
                          )}
                          <button
                            onClick={() => {
                              setMessages((prev) => prev.slice(0, -1));
                              sendMessage(lastUserMessageRef.current);
                            }}
                            className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 font-medium transition-colors"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Retry
                          </button>
                        </div>
                      ) : msg.content ? (
                        <StreamdownRenderer className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:leading-relaxed [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_strong]:font-semibold [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
                          {msg.content}
                        </StreamdownRenderer>
                      ) : (
                        /* Typing indicator while streaming starts */
                        <div className="flex items-center gap-1.5 py-1">
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                        </div>
                      )
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-muted-foreground">
                      {user.name?.charAt(0).toUpperCase() ?? "S"}
                    </div>
                  )}
                </div>
              ))}
              {/* Invisible anchor for scroll-to-bottom */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Shiki / Streamdown loading overlay ─────────────────────────── */}
        {shikiLoadingVisible && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 text-center max-w-xs px-6">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background border-2 border-primary/30 flex items-center justify-center">
                  <Loader2 className="h-3 w-3 text-primary animate-spin" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">EduBot is warming up…</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Loading the AI renderer for the first time.<br />This only happens once per session.
                </p>
              </div>
              {/* Animated progress bar */}
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
            </div>
          </div>
        )}

        {/* Scroll-to-bottom button */}
        {showScrollButton && (
          <div className="absolute bottom-24 right-6 z-10">
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full h-9 w-9 p-0 shadow-md"
              onClick={() => scrollToBottom("smooth")}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ── Input Area ─────────────────────────────────────────────────────── */}
        <div className="border-t bg-background px-4 py-3 shrink-0">
          <div className="max-w-3xl mx-auto">
            {/* TUX-3: COPPA consent required inline banner */}
            {coppaBlocked && (
              <div role="alert" className="mb-3 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700 px-4 py-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-900 dark:text-amber-200 leading-tight">Parental consent required</p>
                  <p className="text-amber-800 dark:text-amber-300 text-xs mt-0.5 leading-relaxed">
                    A parent or guardian must approve AI Tutor access for your account.
                    Ask a parent to sign in and approve access in the{" "}
                    <a href="/parent" className="underline font-medium">Parent Dashboard</a>.
                  </p>
                </div>
                <button
                  onClick={() => setCoppaBlocked(false)}
                  className="shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors"
                  aria-label="Dismiss COPPA notice"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {/* TUX-4: Connection-lost persistent banner */}
            {connectionLost && (
              <div role="alert" className="mb-3 flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-2.5 text-sm">
                <WifiOff className="h-4 w-4 text-destructive shrink-0" aria-hidden="true" />
                <p className="flex-1 text-destructive text-xs font-medium">Connection lost. Check your network and try again.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => {
                    setConnectionLost(false);
                    setMessages((prev) => {
                      const last = prev[prev.length - 1];
                      return last?.role === "assistant" && last.isError ? prev.slice(0, -1) : prev;
                    });
                    sendMessage(lastUserMessageRef.current);
                  }}
                >
                  <RotateCcw className="h-3 w-3" />
                  Retry
                </Button>
                <button
                  onClick={() => setConnectionLost(false)}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Dismiss connection error"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {/* Misconception Drill quick-action chip — shown when a lesson is in context and mode isn't already misconception_drill */}
            {showMisconceptionChip && (
              <div className="mb-2 flex items-center gap-2">
                <button
                  onClick={() => {
                    handleModeChange("misconception_drill");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-medium transition-all shadow-sm"
                >
                  <Brain className="h-3 w-3" />
                  Practice on misconceptions
                </button>
                <span className="text-[10px] text-muted-foreground">Switch to misconception drill mode for this lesson</span>
              </div>
            )}
            {/* Exam Prep quick-action chip — shown when no lesson context and mode isn't already exam_prep */}
            {showExamPrepChip && (
              <div className="mb-2 flex items-center gap-2">
                <button
                  onClick={() => {
                    handleModeChange("exam_prep");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium transition-all shadow-sm"
                >
                  <Sparkles className="h-3 w-3" />
                  Start Exam Prep
                </button>
                <span className="text-[10px] text-muted-foreground">Practice with official exam-style questions</span>
              </div>
            )}
            <div className="flex gap-2 items-end bg-muted/40 border border-border rounded-2xl px-3 py-2 focus-within:border-primary/50 focus-within:bg-background transition-all">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === "parent_summary"
                    ? "Ask for a progress report or learning summary…"
                    : mode === "practice"
                    ? "Ask for a practice problem or say what you want to work on…"
                    : mode === "quiz"
                    ? "Ask to be quizzed on a topic or unit…"
                    : mode === "exam_review"
                    ? "Ask for an exam review plan or practice questions…"
                    : mode === "exam_prep"
                    ? "Start your STAAR exam prep session or answer a question…"
                    : mode === "remediation"
                    ? "Tell me what you're struggling with…"
                    : mode === "misconception_drill"
                    ? "Ask for a misconception-targeting question…"
                    : `Ask anything about ${courseLabel}…`
                }
                aria-label="Message EduBot"
                className="flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm min-h-[36px] max-h-32 py-1 px-0 placeholder:text-muted-foreground/60"
                rows={1}
                disabled={isStreaming}
              />
              {/* TUX-1: Stop button during streaming; send button otherwise */}
              {isStreaming ? (
                <Button
                  onClick={stopStreaming}
                  size="sm"
                  variant="destructive"
                  className="h-9 w-9 p-0 shrink-0 rounded-xl"
                  aria-label="Stop generating response"
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <NavTooltip content={TUTOR_TOOLTIPS.sendMessage} side="top">
                  <Button
                    onClick={() => sendMessage()}
                    disabled={!input.trim()}
                    size="sm"
                    className="h-9 w-9 p-0 shrink-0 rounded-xl"
                    aria-label={TUTOR_TOOLTIPS.sendMessage.description}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </NavTooltip>
              )}
            </div>
            {/* TUX-5: Character counter — shown when approaching the 4000-char limit */}
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[10px] text-muted-foreground">
                Enter to send · Shift+Enter for new line
              </p>
              {input.length > 3500 && (
                <p className={`text-[10px] font-medium tabular-nums ${
                  input.length >= 4000 ? "text-destructive" : "text-amber-600 dark:text-amber-400"
                }`}>
                  {4000 - input.length} remaining
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
