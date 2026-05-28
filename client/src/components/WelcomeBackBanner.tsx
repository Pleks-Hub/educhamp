import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { X, BookOpen, Clock, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

/** Session-storage key so the banner only shows once per session. */
const DISMISSED_KEY = "educhamp_welcome_back_dismissed";

/** Fire-and-forget analytics event logger. */
function trackEvent(event: string, meta?: Record<string, unknown>) {
  try {
    // Use sendBeacon if available (non-blocking, works on page unload)
    const payload = JSON.stringify({ event, ...meta, ts: Date.now() });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/event", payload);
    }
  } catch {
    // Silently ignore — analytics must never break the app
  }
}

export function WelcomeBackBanner() {
  const [, navigate] = useLocation();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data } = trpc.student.getReEngagementContext.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 min — only refetch if stale
  });

  // Show banner once per session when inactive threshold is met
  useEffect(() => {
    if (!data?.isInactive) return;
    const alreadyDismissed = sessionStorage.getItem(DISMISSED_KEY) === "1";
    if (alreadyDismissed) return;
    setVisible(true);
    trackEvent("welcome_back_banner_shown", {
      daysSinceActive: data.daysSinceActive,
      lastLessonId: data.lastLesson?.id,
    });
  }, [data]);

  if (!visible || dismissed) return null;

  const { daysSinceActive, lastLesson, lastCompletedActivity } = data!;

  function handleDismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
    trackEvent("welcome_back_banner_dismissed", { daysSinceActive });
  }

  function handleResume() {
    trackEvent("welcome_back_resume_cta_clicked", {
      daysSinceActive,
      lastLessonId: lastLesson?.id,
    });
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
    if (lastLesson) {
      // Deep-link into the unit that contains the last lesson
      navigate(`/curriculum/unit/${lastLesson.unitId}`);
      trackEvent("welcome_back_session_resumed", { unitId: lastLesson.unitId });
    } else {
      navigate("/curriculum");
    }
  }

  const daysLabel =
    daysSinceActive === 1
      ? "1 day"
      : daysSinceActive >= 30
      ? `${Math.floor(daysSinceActive / 30)} month${Math.floor(daysSinceActive / 30) > 1 ? "s" : ""}`
      : `${daysSinceActive} days`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative mb-6 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300"
      style={{ WebkitBackdropFilter: "blur(8px)", backdropFilter: "blur(8px)" }}
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss welcome back banner"
        className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ minWidth: 44, minHeight: 44 }}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:gap-4">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Welcome back! You&apos;ve been away for {daysLabel}.
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {lastLesson && (
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate max-w-[200px]">
                  {lastLesson.unitTitle} &mdash; {lastLesson.title}
                </span>
              </span>
            )}
            {lastCompletedActivity && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate max-w-[200px]">{lastCompletedActivity}</span>
              </span>
            )}
          </div>
        </div>

        {/* CTA */}
        <Button
          size="sm"
          onClick={handleResume}
          className="shrink-0 gap-1.5 self-start sm:self-auto"
          style={{ minHeight: 44 }}
        >
          Pick Up Where You Left Off
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
