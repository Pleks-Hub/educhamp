// RoleSelectModal.tsx
// Shown whenever a visitor clicks any "Sign Up" / "Get Started" CTA on the landing page.
// Lets them choose Parent/Guardian or Student before redirecting to the correct onboarding path.

import { GraduationCap, Users, X, CheckCircle, Calendar } from "lucide-react";
import { getLoginUrl } from "@/const";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Optional plan name to pre-select / display in the modal header */
  planName?: string;
  /** Billing period chosen on the pricing section */
  billingPeriod?: "monthly" | "annual";
}

export function RoleSelectModal({ isOpen, onClose, planName, billingPeriod }: Props) {
  if (!isOpen) return null;

  function handleSelect(role: "student" | "parent") {
    const returnPath = role === "parent" ? "/onboarding/parent" : "/onboarding/student";
    sessionStorage.setItem("educhamp_post_login_redirect", returnPath);
    if (planName) {
      sessionStorage.setItem("educhamp_selected_plan", planName);
    }
    if (billingPeriod) {
      sessionStorage.setItem("educhamp_billing_period", billingPeriod);
    }
    window.location.href = getLoginUrl();
  }

  // Human-readable plan + billing summary
  const planSummary = planName
    ? billingPeriod === "annual"
      ? `${planName} — Annual billing (save 20%)`
      : `${planName} — Monthly billing`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-50 mb-4">
            <GraduationCap className="h-7 w-7 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {planName ? `Get started with ${planName}` : "Create your account"}
          </h2>
          <p className="text-slate-500 text-sm">
            Tell us who is signing up so we can personalise your experience.
          </p>

          {/* Plan + billing period pill */}
          {planSummary && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full px-3 py-1 text-xs font-semibold">
              <Calendar className="h-3 w-3" />
              {planSummary}
            </div>
          )}
        </div>

        {/* Role cards */}
        <div className="space-y-3">
          {/* Parent/Guardian */}
          <button
            onClick={() => handleSelect("parent")}
            className="w-full group flex items-start gap-4 p-5 rounded-xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all duration-150 text-left active:scale-[0.98]"
          >
            <div className="flex-shrink-0 h-11 w-11 rounded-xl bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center transition-colors">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-0.5">Parent / Guardian</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enrol your child, manage multiple students, and track progress from a parent dashboard.
              </p>
              <ul className="mt-2 space-y-0.5">
                {["Manage up to 3 children", "Real-time progress reports", "Co-parent sharing"].map(item => (
                  <li key={item} className="flex items-center gap-1.5 text-xs text-indigo-700">
                    <CheckCircle className="h-3 w-3 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </button>

          {/* Student */}
          <button
            onClick={() => handleSelect("student")}
            className="w-full group flex items-start gap-4 p-5 rounded-xl border-2 border-slate-200 hover:border-violet-500 hover:bg-violet-50/50 transition-all duration-150 text-left active:scale-[0.98]"
          >
            <div className="flex-shrink-0 h-11 w-11 rounded-xl bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center transition-colors">
              <GraduationCap className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-0.5">Student</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Start learning immediately with AI tutoring, adaptive quizzes, and a personalised learning path.
              </p>
              <ul className="mt-2 space-y-0.5">
                {["Placement test & learning path", "AI tutor EduBot 24/7", "Progress tracking"].map(item => (
                  <li key={item} className="flex items-center gap-1.5 text-xs text-violet-700">
                    <CheckCircle className="h-3 w-3 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          Free to start · No credit card required · Cancel anytime
        </p>
      </div>
    </div>
  );
}
