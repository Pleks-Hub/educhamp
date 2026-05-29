import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { StreamdownRenderer, useStreamdownReady } from "@/components/StreamdownRenderer";
import {
  BookOpen,
  Brain,
  ChevronDown,
  ClipboardList,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/useMobile";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { CourseContextBanner } from "@/components/CourseContextBanner";
import { NavTooltip } from "@/components/NavTooltip";
import { TUTOR_TOOLTIPS } from "@/lib/tooltipContent";

// parent_summary is a parent-only mode; students see only the 5 learning modes
type TutorMode = "teach" | "practice" | "quiz" | "exam_review" | "remediation" | "parent_summary";
const STUDENT_MODES: TutorMode[] = ["teach", "practice", "quiz", "exam_review", "remediation"];

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
  ];
}

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export default function Tutor() {
  const { user } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const unitParam = params.get("unit") ? parseInt(params.get("unit")!, 10) : undefined;
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

  // ── Send message ──────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || isStreaming) return;
      if (!user) {
        toast.error("Please sign in to use the AI Tutor");
        return;
      }

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
              sessionId: sessionId ?? undefined,
              childId: childIdParam,
            }),
            signal: controller.signal,
          });

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
          if ((err as Error).name !== "AbortError") {
            toast.error("Connection error. Please try again.");
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
      {/* ── Left Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } shrink-0 border-r bg-muted/20 flex flex-col overflow-hidden transition-all duration-200`}
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
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors shrink-0"
            title="Toggle sidebar"
          >
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <div
            className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${currentModeConfig.color}`}
          >
            <ModeIcon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">{currentModeConfig.label} Mode</p>
            <p className="text-xs text-muted-foreground truncate">{currentModeConfig.description}</p>
          </div>
          {currentUnit && (
            <Badge variant="secondary" className="ml-auto text-xs shrink-0">
              U{currentUnit.unitNumber}: {currentUnit.title}
            </Badge>
          )}
        </div>

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
                        : "max-w-[85%] bg-card border border-border rounded-bl-sm shadow-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      msg.content ? (
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
                    : mode === "remediation"
                    ? "Tell me what you're struggling with…"
                    : `Ask anything about ${courseLabel}…`
                }
                className="flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm min-h-[36px] max-h-32 py-1 px-0 placeholder:text-muted-foreground/60"
                rows={1}
                disabled={isStreaming}
              />
              <NavTooltip content={TUTOR_TOOLTIPS.sendMessage} side="top">
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isStreaming}
                  size="sm"
                  className="h-9 w-9 p-0 shrink-0 rounded-xl"
                  aria-label={TUTOR_TOOLTIPS.sendMessage.description}
                >
                  {isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </NavTooltip>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
