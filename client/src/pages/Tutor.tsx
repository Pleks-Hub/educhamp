import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Streamdown } from "streamdown";
import {
  BookOpen,
  Brain,
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
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

type TutorMode = "teach" | "practice" | "quiz" | "exam_review" | "remediation" | "parent_summary";

const MODES: { id: TutorMode; label: string; icon: React.ElementType; description: string; color: string }[] = [
  {
    id: "teach",
    label: "Teach",
    icon: BookOpen,
    description: "Explain concepts clearly with examples",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    id: "practice",
    label: "Practice",
    icon: Target,
    description: "Guided problem-solving with hints",
    color: "bg-green-100 text-green-700 border-green-200",
  },
  {
    id: "quiz",
    label: "Quiz",
    icon: ClipboardList,
    description: "Test your knowledge interactively",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  {
    id: "exam_review",
    label: "Exam Review",
    icon: FileText,
    description: "Prepare for upcoming assessments",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    id: "remediation",
    label: "Remediation",
    icon: Wrench,
    description: "Targeted support for weak areas",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  {
    id: "parent_summary",
    label: "Parent Summary",
    icon: Users,
    description: "Progress updates for guardians",
    color: "bg-teal-100 text-teal-700 border-teal-200",
  },
];

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

  const [mode, setMode] = useState<TutorMode>("teach");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: units } = trpc.curriculum.getUnits.useQuery();
  const [selectedUnit, setSelectedUnit] = useState<number | undefined>(unitParam);

  const currentUnit = units?.find((u) => u.unitNumber === selectedUnit);

  // Real SSE streaming — no tRPC mutation needed for chat
  const streamingAbortRef = useRef<AbortController | null>(null);

  const clearMutation = trpc.tutor.clearSession.useMutation({
    onSuccess: () => {
      setMessages([]);
      setSessionId(null);
      toast.success("Conversation cleared");
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || isStreaming) return;
    if (!user) {
      toast.error("Please sign in to use the AI Tutor");
      return;
    }

    const userMessage: Message = { role: "user", content: input.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setInput("");

    // Abort any in-flight stream
    if (streamingAbortRef.current) streamingAbortRef.current.abort();
    const controller = new AbortController();
    streamingAbortRef.current = controller;

    // Add a placeholder assistant message that we'll stream into
    const assistantPlaceholder: Message = { role: "assistant", content: "", timestamp: Date.now() };
    setMessages((prev) => [...prev, assistantPlaceholder]);
    const assistantIndex = messages.length + 1; // user msg is at messages.length

    (async () => {
      try {
        const res = await fetch("/api/tutor/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage.content,
            mode,
            unitId: currentUnit?.id,
            unitNumber: selectedUnit,
            sessionId: sessionId ?? undefined,
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
                  if (last && last.role === "assistant") {
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
      }
    })();
  };

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
  };

  const currentModeConfig = MODES.find((m) => m.id === mode)!;
  const ModeIcon = currentModeConfig.icon;

  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">Sign in to use AI Tutor</h2>
          <p className="text-sm text-muted-foreground">
            Get personalized Algebra I tutoring powered by AI.
          </p>
          <Button onClick={() => { window.location.href = getLoginUrl(); }}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden page-enter">
      {/* Left Panel — Mode & Unit Selection */}
      <div className="w-72 border-r bg-muted/20 flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Tutor
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Algebra I · EduChamp</p>
        </div>

        {/* Mode Selection */}
        <div className="p-3 space-y-1.5 border-b">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">Mode</p>
          {MODES.map((m) => {
            const Icon = m.icon;
            const isActive = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-sm ${
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Unit Selection */}
        <div className="p-3 flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">Unit Context</p>
          <button
            onClick={() => setSelectedUnit(undefined)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all mb-1 ${
              !selectedUnit ? "bg-muted font-medium" : "hover:bg-muted/60 text-muted-foreground"
            }`}
          >
            General Algebra I
          </button>
          {(units ?? []).map((unit) => (
            <button
              key={unit.id}
              onClick={() => setSelectedUnit(unit.unitNumber)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-all mb-0.5 ${
                selectedUnit === unit.unitNumber
                  ? "bg-muted font-semibold text-foreground"
                  : "hover:bg-muted/60 text-muted-foreground"
              }`}
            >
              <span className="font-mono text-[10px] shrink-0 w-12">U{unit.unitNumber}</span>
              <span className="truncate">{unit.title}</span>
            </button>
          ))}
        </div>

        {/* Clear Button */}
        {messages.length > 0 && (
          <div className="p-3 border-t">
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
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="h-14 border-b flex items-center px-5 gap-3 bg-background shrink-0">
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${currentModeConfig.color}`}>
            <ModeIcon className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{currentModeConfig.label} Mode</p>
            <p className="text-xs text-muted-foreground">{currentModeConfig.description}</p>
          </div>
          {currentUnit && (
            <Badge variant="secondary" className="ml-auto text-xs">
              Unit {currentUnit.unitNumber}: {currentUnit.title}
            </Badge>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-5 py-4" ref={scrollRef as any}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Brain className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Ready to help, {user.name?.split(" ")[0]}!</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  {currentModeConfig.description}. Ask me anything about Algebra I.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {mode === "teach" && [
                  "Explain slope-intercept form",
                  "What is a linear equation?",
                  "How do I solve for x?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                    className="text-xs text-left px-3 py-2 rounded-lg border hover:bg-muted transition-colors text-muted-foreground"
                  >
                    {q}
                  </button>
                ))}
                {mode === "practice" && [
                  "Give me a practice problem on linear equations",
                  "I want to practice graphing",
                  "Quiz me on solving inequalities",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                    className="text-xs text-left px-3 py-2 rounded-lg border hover:bg-muted transition-colors text-muted-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center mr-2.5 mt-0.5 shrink-0">
                      <Brain className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border rounded-bl-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Streamdown className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        {msg.content}
                      </Streamdown>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center mr-2.5 mt-0.5 shrink-0">
                    <Brain className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4 bg-background shrink-0">
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask your ${currentModeConfig.label.toLowerCase()} question...`}
              className="resize-none min-h-[44px] max-h-32 text-sm"
              rows={1}
              disabled={isStreaming}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              size="sm"
              className="h-11 w-11 p-0 shrink-0"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
