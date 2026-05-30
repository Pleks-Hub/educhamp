/**
 * EduChampDemoWidget
 * Animated, interactive demo showcasing the four EduChamp learning modes:
 *   1. AI Tutor Session
 *   2. AI Quiz Session
 *   3. Practice Session
 *   4. Exam / Test Session
 *
 * Each mode auto-plays a scripted conversation/interaction sequence.
 * Users can also manually switch modes via the tab bar.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getLoginUrl } from "@/const";
import {
  Brain, BookOpen, Pencil, Trophy,
  CheckCircle2, XCircle, Lightbulb, ChevronRight,
  BarChart3, Clock, Zap, Star,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ModeId = "tutor" | "quiz" | "practice" | "exam";

interface DemoFrame {
  type: "bot" | "user" | "hint" | "feedback_correct" | "feedback_wrong" | "progress" | "question" | "result";
  text: string;
  delay: number; // ms after previous frame
  extra?: Record<string, unknown>;
}

// ─── Mode Definitions ─────────────────────────────────────────────────────────
const MODES: { id: ModeId; label: string; icon: React.ElementType; color: string; bg: string; accent: string }[] = [
  { id: "tutor",    label: "AI Tutor",  icon: Brain,    color: "text-indigo-400",  bg: "bg-indigo-600",   accent: "bg-indigo-600/20 border-indigo-500/30" },
  { id: "quiz",     label: "AI Quiz",   icon: Zap,      color: "text-violet-400",  bg: "bg-violet-600",   accent: "bg-violet-600/20 border-violet-500/30" },
  { id: "practice", label: "Practice",  icon: Pencil,   color: "text-emerald-400", bg: "bg-emerald-600",  accent: "bg-emerald-600/20 border-emerald-500/30" },
  { id: "exam",     label: "Exam Prep", icon: Trophy,   color: "text-amber-400",   bg: "bg-amber-600",    accent: "bg-amber-600/20 border-amber-500/30" },
];

// ─── Demo Scripts ─────────────────────────────────────────────────────────────
const SCRIPTS: Record<ModeId, DemoFrame[]> = {
  tutor: [
    { type: "bot",      text: "Hi! I'm EduBot 👋 — your AI tutor. What would you like to learn today?", delay: 0 },
    { type: "user",     text: "Can you explain slope-intercept form?", delay: 1400 },
    { type: "bot",      text: "Great question! Slope-intercept form is written as **y = mx + b**, where:", delay: 1200 },
    { type: "bot",      text: "• **m** is the slope (how steep the line is)\n• **b** is the y-intercept (where it crosses the y-axis)", delay: 800 },
    { type: "user",     text: "Can you give me an example?", delay: 1600 },
    { type: "bot",      text: "Sure! Take y = 2x + 3. The slope is **2** (for every 1 step right, go 2 up) and the y-intercept is **3** (the line crosses y-axis at 3).", delay: 1200 },
    { type: "hint",     text: "💡 Tip: To graph any line, start at the y-intercept, then use the slope to find the next point!", delay: 1000 },
    { type: "user",     text: "What if slope is negative?", delay: 1800 },
    { type: "bot",      text: "If slope is negative (like y = **-3x** + 5), the line goes **downward** from left to right. The steeper the negative, the faster it falls.", delay: 1200 },
    { type: "progress", text: "Lesson Progress: Slope-Intercept Form", delay: 1000, extra: { pct: 72 } },
  ],
  quiz: [
    { type: "bot",      text: "Let's test your knowledge! I'll give you 3 quick questions on linear equations. Ready? 🎯", delay: 0 },
    { type: "question", text: "**Q1:** What is the slope of the line y = 4x − 7?", delay: 1400, extra: { choices: ["A: 4", "B: -7", "C: 7", "D: -4"], correct: 0 } },
    { type: "user",     text: "A: 4", delay: 1800 },
    { type: "feedback_correct", text: "✅ Correct! In y = mx + b, the slope is m = 4. Great recall!", delay: 800 },
    { type: "question", text: "**Q2:** Solve for x: 3x + 6 = 21", delay: 1200, extra: { choices: ["A: x = 3", "B: x = 5", "C: x = 9", "D: x = 7"], correct: 1 } },
    { type: "user",     text: "A: x = 3", delay: 1800 },
    { type: "feedback_wrong", text: "❌ Not quite. 3x = 15, so x = **5**. Remember to subtract 6 first, then divide by 3.", delay: 800 },
    { type: "question", text: "**Q3:** Which equation has a y-intercept of −2?", delay: 1200, extra: { choices: ["A: y = 3x + 2", "B: y = x − 2", "C: y = −2x", "D: y = 2x + 1"], correct: 1 } },
    { type: "user",     text: "B: y = x − 2", delay: 1800 },
    { type: "feedback_correct", text: "✅ Perfect! y = x − 2 has b = −2, so the y-intercept is −2.", delay: 800 },
    { type: "result",   text: "Quiz Complete! Score: 2/3 (67%) — Developing", delay: 1000, extra: { score: 67, label: "Developing" } },
  ],
  practice: [
    { type: "bot",      text: "Welcome to Practice Mode! 📝 We'll work through problems step-by-step. I'll guide you if you get stuck.", delay: 0 },
    { type: "question", text: "**Problem:** Factor the polynomial: x² + 5x + 6", delay: 1400, extra: { choices: [], correct: -1 } },
    { type: "user",     text: "I'm not sure where to start...", delay: 1800 },
    { type: "hint",     text: "💡 Hint 1: Find two numbers that **multiply** to 6 and **add** to 5.", delay: 800 },
    { type: "user",     text: "2 and 3?", delay: 1600 },
    { type: "bot",      text: "Exactly right! 2 × 3 = 6 and 2 + 3 = 5. So the factored form is **(x + 2)(x + 3)**.", delay: 1000 },
    { type: "hint",     text: "💡 Hint 2: You can verify by expanding: (x+2)(x+3) = x² + 3x + 2x + 6 = x² + 5x + 6 ✓", delay: 800 },
    { type: "user",     text: "Got it! Let me try the next one.", delay: 1600 },
    { type: "question", text: "**Problem:** Factor: x² − 9", delay: 1200, extra: { choices: [], correct: -1 } },
    { type: "hint",     text: "💡 Hint: This is a difference of squares: a² − b² = (a + b)(a − b)", delay: 800 },
    { type: "user",     text: "(x + 3)(x − 3)", delay: 1600 },
    { type: "feedback_correct", text: "✅ Perfect! x² − 9 = (x + 3)(x − 3). You're mastering factoring!", delay: 800 },
    { type: "progress", text: "Skill Mastery: Factoring Polynomials", delay: 1000, extra: { pct: 85 } },
  ],
  exam: [
    { type: "bot",      text: "Welcome to Exam Prep Mode! 🏆 I'll simulate exam-style questions with timed conditions.", delay: 0 },
    { type: "bot",      text: "You have **45 minutes** for 10 questions. I'll track your time and flag areas to review. Let's go!", delay: 1200 },
    { type: "question", text: "**Q1 (Multi-step):** A rectangle has length (2x + 3) and width (x − 1). Which expression represents the area?", delay: 1400, extra: { choices: ["A: 2x² + x − 3", "B: 2x² − 3", "C: 3x + 2", "D: 2x² + 5x − 3"], correct: 0 } },
    { type: "user",     text: "A: 2x² + x − 3", delay: 2000 },
    { type: "feedback_correct", text: "✅ Correct! (2x+3)(x−1) = 2x² − 2x + 3x − 3 = 2x² + x − 3. Excellent thinking!", delay: 800 },
    { type: "question", text: "**Q2 (Data Analysis):** A scatter plot shows r = −0.87. What does this indicate?", delay: 1200, extra: { choices: ["A: Strong positive correlation", "B: No correlation", "C: Strong negative correlation", "D: Weak negative correlation"], correct: 2 } },
    { type: "user",     text: "C: Strong negative correlation", delay: 1800 },
    { type: "feedback_correct", text: "✅ Excellent! r = −0.87 is close to −1, indicating a strong negative linear relationship.", delay: 800 },
    { type: "bot",      text: "⏱ 2 questions done — 8 remaining. You're on pace! Keep focusing on showing your work.", delay: 1200 },
    { type: "result",   text: "Exam Simulation: 2/2 correct so far — Mastery Level: Approaching", delay: 1000, extra: { score: 100, label: "On Track" } },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function renderText(text: string) {
  // Bold **text** → <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
interface EduChampDemoWidgetProps {
  /** "full" = full-size hero widget (default), "compact" = mobile hero, "mini" = How-It-Works inline */
  variant?: "full" | "compact" | "mini";
  /** Lock the widget to a single mode (mini variant) */
  initialMode?: ModeId;
  /** Hide the mode tab bar */
  hideTabs?: boolean;
}

export function EduChampDemoWidget({ variant = "full", initialMode, hideTabs = false }: EduChampDemoWidgetProps = {}) {
  const [activeMode, setActiveMode] = useState<ModeId>(initialMode ?? "tutor");
  const [visibleFrames, setVisibleFrames] = useState<DemoFrame[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [demoComplete, setDemoComplete] = useState(false);
  const ctaHref = useMemo(() => {
    try { sessionStorage.setItem("educhamp_post_login_redirect", "/onboarding/student"); } catch {}
    return getLoginUrl();
  }, []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const playScript = useCallback((mode: ModeId) => {
    clearTimeouts();
    setVisibleFrames([]);
    setIsTyping(false);
    setProgress(0);
    setDemoComplete(false);

    const frames = SCRIPTS[mode];
    let cumulative = 400;

    frames.forEach((frame, idx) => {
      cumulative += frame.delay;

      // Show typing indicator before bot messages
      if (frame.type === "bot" || frame.type === "hint" || frame.type === "feedback_correct" || frame.type === "feedback_wrong") {
        const typingStart = cumulative - Math.min(frame.delay, 600);
        const t1 = setTimeout(() => setIsTyping(true), typingStart);
        timeoutsRef.current.push(t1);
      }

      const t2 = setTimeout(() => {
        setIsTyping(false);
        setVisibleFrames((prev) => [...prev, frame]);
        if (frame.type === "progress" && frame.extra?.pct) {
          setProgress(frame.extra.pct as number);
        }
      }, cumulative);
      timeoutsRef.current.push(t2);

      // After last frame, show CTA for 5s then restart
      if (idx === frames.length - 1) {
        const tCta = setTimeout(() => setDemoComplete(true), cumulative + 600);
        timeoutsRef.current.push(tCta);
        const t3 = setTimeout(() => { setDemoComplete(false); playScript(mode); }, cumulative + 5500);
        timeoutsRef.current.push(t3);
      }
    });
  }, [clearTimeouts]);

  useEffect(() => {
    playScript(activeMode);
    return clearTimeouts;
  }, [activeMode, playScript, clearTimeouts]);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleFrames, isTyping]);

  const mode = MODES.find((m) => m.id === activeMode)!;
  const ModeIcon = mode.icon;

  const isCompact = variant === "compact";
  const isMini = variant === "mini";
  const chatHeight = isMini ? "h-40" : isCompact ? "h-48" : "h-64";
  const maxW = isMini ? "max-w-sm" : "max-w-md";

  return (
    <div className={`w-full ${maxW} mx-auto select-none`}>
      {/* Mode Tabs */}
      {!hideTabs && (
      <div className="flex gap-1 mb-3 bg-white/5 rounded-xl p-1 border border-white/10">
        {MODES.map((m) => {
          const Icon = m.icon;
          const isActive = m.id === activeMode;
          return (
            <button
              key={m.id}
              onClick={() => setActiveMode(m.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                isActive
                  ? `${m.bg} text-white shadow-sm`
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="h-3 w-3" />
              <span className={isMini ? "hidden" : "hidden sm:inline"}>{m.label}</span>
            </button>
          );
        })}
      </div>
      )}

      {/* Chat Window */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <div className={`h-8 w-8 rounded-lg ${mode.bg} flex items-center justify-center flex-shrink-0`}>
            <ModeIcon className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white">{mode.label}</p>
            <p className="text-xs text-slate-400 truncate">
              {activeMode === "tutor" ? "Mathematics · Unit 5: Linear Functions" :
               activeMode === "quiz"  ? "Mathematics · Unit 2: Equations" :
               activeMode === "practice" ? "Grade 3 Math · Unit 4: Fractions" :
               "Exam Review · Multi-Subject"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400">Live</span>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className={`${chatHeight} overflow-y-auto px-4 py-3 space-y-2 scroll-smooth`}
          style={{ scrollbarWidth: "none" }}
        >
          {visibleFrames.map((frame, i) => {
            if (frame.type === "user") {
              return (
                <div key={i} className="flex justify-end animate-in slide-in-from-right-2 duration-200">
                  <div className="bg-indigo-600/30 border border-indigo-500/30 rounded-xl rounded-tr-sm px-3 py-2 text-sm text-indigo-100 max-w-[80%]">
                    {renderText(frame.text)}
                  </div>
                </div>
              );
            }

            if (frame.type === "feedback_correct") {
              return (
                <div key={i} className="flex items-start gap-2 animate-in slide-in-from-left-2 duration-200">
                  <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl rounded-tl-sm px-3 py-2 text-sm text-emerald-200 max-w-[85%]">
                    {renderText(frame.text)}
                  </div>
                </div>
              );
            }

            if (frame.type === "feedback_wrong") {
              return (
                <div key={i} className="flex items-start gap-2 animate-in slide-in-from-left-2 duration-200">
                  <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <XCircle className="h-3.5 w-3.5 text-red-400" />
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl rounded-tl-sm px-3 py-2 text-sm text-red-200 max-w-[85%]">
                    {renderText(frame.text)}
                  </div>
                </div>
              );
            }

            if (frame.type === "hint") {
              return (
                <div key={i} className="flex items-start gap-2 animate-in slide-in-from-left-2 duration-200">
                  <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl rounded-tl-sm px-3 py-2 text-sm text-amber-200 max-w-[85%]">
                    {renderText(frame.text)}
                  </div>
                </div>
              );
            }

            if (frame.type === "question") {
              const choices = (frame.extra?.choices ?? []) as string[];
              return (
                <div key={i} className="animate-in slide-in-from-left-2 duration-200 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <div className={`h-6 w-6 rounded-full ${mode.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <ModeIcon className="h-3 w-3 text-white" />
                    </div>
                    <div className="bg-white/10 rounded-xl rounded-tl-sm px-3 py-2 text-sm text-slate-200 max-w-[85%]">
                      {renderText(frame.text)}
                    </div>
                  </div>
                  {choices.length > 0 && (
                    <div className="ml-8 grid grid-cols-2 gap-1">
                      {choices.map((c, ci) => (
                        <div key={ci} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300">
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            if (frame.type === "progress") {
              return (
                <div key={i} className="animate-in slide-in-from-bottom-2 duration-300 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                    <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />{frame.text}</span>
                    <span className={`font-semibold ${mode.color}`}>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${mode.bg}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            }

            if (frame.type === "result") {
              const score = frame.extra?.score as number ?? 0;
              const label = frame.extra?.label as string ?? "";
              return (
                <div key={i} className="animate-in zoom-in-95 duration-300 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
                  <div className={`text-2xl font-bold ${mode.color} mb-0.5`}>{score}%</div>
                  <div className="text-xs text-slate-400">{label}</div>
                  <div className="flex items-center justify-center gap-3 mt-2">
                    {[Star, Star, Star].map((S, si) => (
                      <S key={si} className={`h-4 w-4 ${si < Math.ceil(score / 34) ? "text-amber-400 fill-amber-400" : "text-slate-600"}`} />
                    ))}
                  </div>
                </div>
              );
            }

            // Default: bot message
            return (
              <div key={i} className="flex items-start gap-2 animate-in slide-in-from-left-2 duration-200">
                <div className={`h-6 w-6 rounded-full ${mode.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <ModeIcon className="h-3 w-3 text-white" />
                </div>
                <div className="bg-white/10 rounded-xl rounded-tl-sm px-3 py-2 text-sm text-slate-200 max-w-[85%] whitespace-pre-line">
                  {renderText(frame.text)}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start gap-2 animate-in slide-in-from-left-2 duration-150">
              <div className={`h-6 w-6 rounded-full ${mode.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <ModeIcon className="h-3 w-3 text-white" />
              </div>
              <div className="bg-white/10 rounded-xl rounded-tl-sm px-3 py-2.5">
                <div className="flex gap-1 items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Try it free CTA — shown after demo completes */}
        {demoComplete && !isMini ? (
          <div className="px-4 py-3 border-t border-white/10 animate-in slide-in-from-bottom-2 duration-300">
            <a
              href={ctaHref}
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm text-white ${mode.bg} hover:opacity-90 transition-opacity`}
            >
              <span>Start your free lesson</span>
              <ChevronRight className="h-4 w-4" />
            </a>
            <p className="text-center text-xs text-slate-500 mt-1.5">No credit card required · Free to start</p>
          </div>
        ) : (
          <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-500">
              {activeMode === "tutor"    ? "Ask EduBot anything about this lesson..." :
               activeMode === "quiz"     ? "Select your answer above..." :
               activeMode === "practice" ? "Type your answer or ask for a hint..." :
               "Select the best answer..."}
            </div>
            <div className={`h-8 w-8 rounded-xl ${mode.bg} flex items-center justify-center flex-shrink-0`}>
              <ChevronRight className="h-4 w-4 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Mode description pills — only shown in full variant */}
      {!isCompact && !isMini && (
      <div className="mt-3 flex flex-wrap gap-2 justify-center">
        {[
          { icon: Brain,       text: "Real-time AI explanations" },
          { icon: Lightbulb,   text: "Step-by-step hints" },
          { icon: CheckCircle2,text: "Instant feedback" },
          { icon: BarChart3,   text: "Progress tracking" },
          { icon: Clock,       text: "Timed exam practice" },
        ].map((pill) => {
          const Icon = pill.icon;
          return (
            <div key={pill.text} className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-xs text-slate-400">
              <Icon className="h-3 w-3" />
              {pill.text}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
