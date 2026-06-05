/**
 * CelebrationOverlay — lightweight CSS-only celebration animations.
 *
 * Exports:
 *  - CelebrationOverlay  : renders the overlay (place once near the root)
 *  - useCelebration()    : hook to trigger celebrations from anywhere
 *
 * Respects `disableAnimations` and `disableSound` from personalization.
 * Uses only CSS keyframes + Tailwind — no heavy animation libraries.
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CelebrationEvent =
  | "lesson_complete"
  | "quiz_pass"
  | "quiz_perfect"
  | "badge_earn"
  | "unit_complete"
  | "reviews_complete";

interface CelebrationState {
  active: boolean;
  event: CelebrationEvent | null;
  label: string;
  emoji: string;
}

interface CelebrationContextValue {
  celebrate: (event: CelebrationEvent, label?: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CelebrationContext = createContext<CelebrationContextValue>({
  celebrate: () => {},
});

export function useCelebration() {
  return useContext(CelebrationContext);
}

// ─── Config ───────────────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<
  CelebrationEvent,
  { emoji: string; defaultLabel: string; color: string; duration: number }
> = {
  lesson_complete: {
    emoji: "⭐",
    defaultLabel: "Lesson Complete!",
    color: "from-amber-400 to-yellow-300",
    duration: 2800,
  },
  quiz_pass: {
    emoji: "🎉",
    defaultLabel: "Great Score!",
    color: "from-green-400 to-emerald-300",
    duration: 3000,
  },
  quiz_perfect: {
    emoji: "🏆",
    defaultLabel: "Perfect Score!",
    color: "from-amber-500 to-yellow-400",
    duration: 3500,
  },
  badge_earn: {
    emoji: "🥇",
    defaultLabel: "Badge Earned!",
    color: "from-purple-400 to-violet-300",
    duration: 3200,
  },
  unit_complete: {
    emoji: "🚀",
    defaultLabel: "Unit Complete!",
    color: "from-blue-400 to-cyan-300",
    duration: 3500,
  },
  reviews_complete: {
    emoji: "✅",
    defaultLabel: "All Reviews Done!",
    color: "from-emerald-400 to-teal-300",
    duration: 3500,
  },
};

// ─── Confetti particle ────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444",
  "#f97316", "#06b6d4", "#ec4899", "#84cc16", "#fbbf24",
];

function ConfettiParticle({ index }: { index: number }) {
  const left = `${Math.random() * 100}%`;
  const delay = `${Math.random() * 0.6}s`;
  const duration = `${0.8 + Math.random() * 1.2}s`;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size = `${6 + Math.random() * 8}px`;
  const rotate = `${Math.random() * 720}deg`;
  const shape = Math.random() > 0.5 ? "50%" : "0%";

  return (
    <div
      className="absolute top-0 pointer-events-none"
      style={{
        left,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: shape,
        animationName: "confettiFall",
        animationDuration: duration,
        animationDelay: delay,
        animationTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
        animationFillMode: "forwards",
        transform: `rotate(${rotate})`,
      }}
    />
  );
}

// ─── Star burst ───────────────────────────────────────────────────────────────

function StarBurst({ count = 8 }: { count?: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (360 / count) * i;
        const delay = `${i * 0.04}s`;
        return (
          <div
            key={i}
            className="absolute text-yellow-400"
            style={{
              animationName: "starShoot",
              animationDuration: "0.7s",
              animationDelay: delay,
              animationTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
              animationFillMode: "forwards",
              transform: `rotate(${angle}deg)`,
              opacity: 0,
            }}
          >
            ✦
          </div>
        );
      })}
    </div>
  );
}

// ─── Provider + Overlay ───────────────────────────────────────────────────────

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<CelebrationState>({
    active: false,
    event: null,
    label: "",
    emoji: "",
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch personalization to respect disableAnimations / disableSound
  const { data: personalization } = trpc.onboarding.getPersonalization.useQuery(undefined, {
    enabled: !!user,
  });
  const disableAnimations = !!(personalization as any)?.disableAnimations;
  const disableSound = !!(personalization as any)?.disableSound;

  const celebrate = useCallback(
    (event: CelebrationEvent, label?: string) => {
      if (disableAnimations) return;
      const cfg = EVENT_CONFIG[event];
      if (timerRef.current) clearTimeout(timerRef.current);

      setState({ active: true, event, label: label ?? cfg.defaultLabel, emoji: cfg.emoji });

      // Play a short Web Audio API chime (if sound enabled and supported)
      if (!disableSound && typeof AudioContext !== "undefined") {
        try {
          const ctx = new AudioContext();
          const playNote = (freq: number, start: number, dur: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = "sine";
            gain.gain.setValueAtTime(0.18, ctx.currentTime + start);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + dur);
          };
          // Simple ascending arpeggio
          playNote(523, 0, 0.18);    // C5
          playNote(659, 0.12, 0.18); // E5
          playNote(784, 0.24, 0.25); // G5
          if (event === "quiz_perfect" || event === "unit_complete") {
            playNote(1047, 0.38, 0.35); // C6
          }
        } catch {
          // Audio not available — silently skip
        }
      }

      timerRef.current = setTimeout(() => {
        setState({ active: false, event: null, label: "", emoji: "" });
      }, cfg.duration);
    },
    [disableAnimations, disableSound]
  );

  // Clean up timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const cfg = state.event ? EVENT_CONFIG[state.event] : null;

  return (
    <CelebrationContext.Provider value={{ celebrate }}>
      {children}

      {/* CSS keyframes injected once */}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes starShoot {
          0%   { transform: rotate(var(--angle, 0deg)) translateX(0) scale(0); opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: rotate(var(--angle, 0deg)) translateX(80px) scale(1.4); opacity: 0; }
        }
        @keyframes celebBadgePop {
          0%   { transform: scale(0.4) translateY(20px); opacity: 0; }
          60%  { transform: scale(1.15) translateY(-6px); opacity: 1; }
          80%  { transform: scale(0.95) translateY(2px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes celebFadeOut {
          0%   { opacity: 1; }
          70%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .celebration-overlay * { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* Overlay */}
      {state.active && cfg && (
        <div
          className="celebration-overlay fixed inset-0 pointer-events-none z-[9999] overflow-hidden"
          aria-live="polite"
          aria-atomic="true"
        >
          {/* Confetti rain */}
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}

          {/* Central badge pop */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`relative bg-gradient-to-br ${cfg.color} rounded-3xl px-8 py-6 shadow-2xl text-center`}
              style={{
                animationName: "celebBadgePop, celebFadeOut",
                animationDuration: `0.5s, ${cfg.duration}ms`,
                animationTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1), ease-in-out",
                animationFillMode: "forwards, forwards",
              }}
            >
              <StarBurst count={10} />
              <div className="text-6xl mb-2 relative z-10">{state.emoji}</div>
              <div className="text-xl font-bold text-white drop-shadow relative z-10">
                {state.label}
              </div>
            </div>
          </div>
        </div>
      )}
    </CelebrationContext.Provider>
  );
}
