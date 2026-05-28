import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";

type ResultStatus =
  | "loading"
  | "approved"
  | "rejected"
  | "expired"
  | "already_actioned"
  | "not_found"
  | "error";

interface ResultConfig {
  icon: string;
  title: string;
  description: string;
  headerGradient: string;
  ctaPrimary?: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
}

const RESULT_CONFIG: Record<Exclude<ResultStatus, "loading">, ResultConfig> = {
  approved: {
    icon: "🎉",
    title: "Course Approved!",
    description:
      "The course has been approved and your student has been enrolled. They can now access it from their dashboard.",
    headerGradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    ctaPrimary: { label: "Go to Parent Dashboard", href: "/parent" },
    ctaSecondary: { label: "View Student Courses", href: "/courses" },
  },
  rejected: {
    icon: "📋",
    title: "Course Request Rejected",
    description:
      "The course request has been rejected. The student has been notified and will not be enrolled in this course.",
    headerGradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    ctaPrimary: { label: "Go to Parent Dashboard", href: "/parent" },
  },
  expired: {
    icon: "⏰",
    title: "This Link Has Expired",
    description:
      "This approval link is no longer valid — it expired after 7 days. Please log in to your Parent Dashboard to manage course requests directly.",
    headerGradient: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
    ctaPrimary: { label: "Go to Parent Dashboard", href: "/parent" },
    ctaSecondary: { label: "Return to Login", href: getLoginUrl() },
  },
  already_actioned: {
    icon: "✅",
    title: "Already Completed",
    description:
      "This course request has already been approved or rejected. No further action is needed.",
    headerGradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    ctaPrimary: { label: "Go to Parent Dashboard", href: "/parent" },
  },
  not_found: {
    icon: "🔍",
    title: "Link Not Found",
    description:
      "We couldn't find a course request associated with this link. It may have been cancelled or the link may be invalid.",
    headerGradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    ctaPrimary: { label: "Go to Parent Dashboard", href: "/parent" },
    ctaSecondary: { label: "Return to Login", href: getLoginUrl() },
  },
  error: {
    icon: "⚠️",
    title: "Something Went Wrong",
    description:
      "An unexpected error occurred while processing this request. Please try again or log in to manage course requests from your dashboard.",
    headerGradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    ctaPrimary: { label: "Go to Parent Dashboard", href: "/parent" },
    ctaSecondary: { label: "Return to Login", href: getLoginUrl() },
  },
};

export default function CourseRequestResult() {
  const [location] = useLocation();
  const [status, setStatus] = useState<ResultStatus>("loading");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get("status") as ResultStatus | null;
    const actionParam = params.get("action") as "approve" | "reject" | null;

    if (actionParam) setAction(actionParam);

    if (
      statusParam &&
      ["approved", "rejected", "expired", "already_actioned", "not_found", "error"].includes(
        statusParam
      )
    ) {
      setStatus(statusParam);
    } else {
      setStatus("error");
    }
  }, [location]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Processing your request…</p>
        </div>
      </div>
    );
  }

  const config = RESULT_CONFIG[status];
  void action; // used for future analytics

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-lg"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}
      >
        {/* Header */}
        <div
          className="px-10 py-10 text-center"
          style={{ background: config.headerGradient }}
        >
          <div className="text-5xl mb-3">{config.icon}</div>
          <h1 className="text-2xl font-bold text-white mb-1">{config.title}</h1>
          <p className="text-white/85 text-sm">EduChamp — Course Request</p>
        </div>

        {/* Body */}
        <div className="px-10 py-8 text-center space-y-6">
          <p className="text-[#374151] text-base leading-relaxed">{config.description}</p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {config.ctaPrimary && (
              <Button
                asChild
                className="font-semibold"
                style={{
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  color: "#fff",
                  border: "none",
                }}
              >
                <a href={config.ctaPrimary.href}>{config.ctaPrimary.label}</a>
              </Button>
            )}
            {config.ctaSecondary && (
              <Button variant="outline" asChild className="font-semibold">
                <a href={config.ctaSecondary.href}>{config.ctaSecondary.label}</a>
              </Button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f9fafb] border-t border-[#e5e7eb] px-10 py-5 text-center">
          <p className="text-[#9ca3af] text-xs">
            EduChamp — Adaptive Learning Platform &middot;{" "}
            <a
              href="mailto:support@educhamp.app"
              className="text-indigo-500 hover:underline"
            >
              support@educhamp.app
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
