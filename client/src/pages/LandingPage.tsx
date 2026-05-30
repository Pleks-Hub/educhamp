// ─── Landing Page ─────────────────────────────────────────────────────────────
// Public-facing marketing page shown to unauthenticated visitors.
// Includes: hero, features, how-it-works, testimonials, newsletter, AI chatbot.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useMemo } from "react";
import { trackViewPricing, trackBeginCheckout } from "@/lib/analytics";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import {
  BookOpen, Brain, BarChart3, Users, Star, ChevronDown, ChevronUp,
  GraduationCap, Zap, CheckCircle, ArrowRight, MessageCircle,
  Sparkles, Send, X, Menu, Mail, Phone, Shield, Trophy, Clock,
  Building2, TrendingUp, LayoutDashboard, HeartHandshake,
} from "lucide-react";
import { EduChampDemoWidget } from "@/components/EduChampDemoWidget";
import { RoleSelectModal } from "@/components/RoleSelectModal";
import { RequestDemoModal } from "@/components/RequestDemoModal";
import { CheckoutModal } from "@/components/CheckoutModal";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── AI Chatbot ───────────────────────────────────────────────────────────────
function LandingChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm EduChamp's AI assistant. I can help you understand how the platform works, answer questions about courses, and guide you through signing up. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const createSession = trpc.landing.createSession.useMutation();
  const updateContact = trpc.landing.updateSessionContact.useMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create a session when the chat opens for the first time
  useEffect(() => {
    if (open && !sessionToken) {
      createSession.mutateAsync({ source: "landing_chatbot" }).then(r => {
        setSessionToken(r.sessionToken);
      }).catch(() => {});
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const QUICK_QUESTIONS = [
    "How does EduChamp work?",
    "What courses are available?",
    "How do I sign up my child?",
    "What is the placement test?",
  ];

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput("");
    setLoading(true);
    try {
      const response = await utils.client.landing.chat.mutate({
        sessionToken: sessionToken ?? undefined,
        messages: allMsgs.map(m => ({ role: m.role, content: m.content })),
      });
      const assistantContent = typeof response.content === "string" ? response.content : "I'm here to help! What would you like to know about EduChamp?";
      setMessages(prev => [...prev, { role: "assistant", content: assistantContent }]);
      // Show lead capture after 3 user messages if not yet submitted
      if (!leadSubmitted && allMsgs.filter(m => m.role === "user").length >= 3) {
        setShowLeadCapture(true);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again in a moment, or click 'Sign Up' to get started!",
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    if (!leadEmail.trim()) return;
    try {
      if (sessionToken) {
        await updateContact.mutateAsync({
          sessionToken,
          visitorName: leadName || undefined,
          visitorEmail: leadEmail,
        });
      }
      setLeadSubmitted(true);
      setShowLeadCapture(false);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Thanks${leadName ? `, ${leadName}` : ""}! We've saved your info and will follow up soon. Ready to get started? Click the Sign Up button below! 🎉`,
      }]);
    } catch {
      setLeadSubmitted(true);
      setShowLeadCapture(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-indigo-600 text-white shadow-2xl px-4 py-3 text-sm font-medium transition-all duration-300 hover:bg-indigo-700 hover:scale-105 active:scale-95 ${open ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        style={{ transition: "opacity 200ms, transform 160ms cubic-bezier(0.23,1,0.32,1)" }}
      >
        <MessageCircle className="h-5 w-5" />
        <span>Ask AI</span>
      </button>

      {/* Chat panel */}
      <div
        className={`fixed bottom-6 right-6 z-50 w-80 sm:w-96 rounded-2xl shadow-2xl bg-white border border-slate-200 flex flex-col transition-all duration-300 ${open ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95 pointer-events-none"}`}
        style={{
          maxHeight: "560px",
          transformOrigin: "bottom right",
          transition: "opacity 200ms, transform 220ms cubic-bezier(0.23,1,0.32,1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">EduChamp AI</p>
              <p className="text-indigo-200 text-xs">Always here to help</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2">
                <div className="flex gap-1 items-center h-5">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick questions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-1 hover:bg-indigo-100 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Lead capture form */}
        {showLeadCapture && !leadSubmitted && (
          <div className="mx-3 mb-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
            <p className="text-xs font-semibold text-indigo-800 mb-1">Want us to follow up with more info?</p>
            <form onSubmit={submitLead} className="space-y-1.5">
              <input
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white"
                placeholder="Your name (optional)"
                value={leadName}
                onChange={e => setLeadName(e.target.value)}
              />
              <input
                type="email"
                required
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white"
                placeholder="Your email address"
                value={leadEmail}
                onChange={e => setLeadEmail(e.target.value)}
              />
              <div className="flex gap-1.5">
                <button type="submit" className="flex-1 text-xs bg-indigo-600 text-white rounded-lg py-1.5 hover:bg-indigo-700 transition-colors">
                  Send me info
                </button>
                <button
                  type="button"
                  onClick={() => { setShowLeadCapture(false); setLeadSubmitted(true); }}
                  className="text-xs text-slate-500 hover:text-slate-700 px-2"
                >
                  No thanks
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex gap-2">
            <input
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50"
              placeholder="Ask anything..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-indigo-700 transition-colors active:scale-95"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterName, setNewsletterName] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterDone, setNewsletterDone] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);
  const [demoOpen, setDemoOpen] = useState(false);
  const [annualBilling, setAnnualBilling] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlanKey, setCheckoutPlanKey] = useState<"family" | "premium_family">("family");
  const [checkoutPlanName, setCheckoutPlanName] = useState("Family Plan");

  const { data: currentUser } = trpc.auth.me.useQuery();

  // Track when pricing section scrolls into view
  const pricingRef = useRef<HTMLElement>(null);
  const pricingTracked = useRef(false);
  useEffect(() => {
    const el = document.getElementById("pricing");
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !pricingTracked.current) {
          pricingTracked.current = true;
          trackViewPricing({ source: "landing_page" });
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function openSignUp(plan?: string) {
    // Map display plan name to plan key
    const planKeyMap: Record<string, "family" | "premium_family"> = {
      "Family Plan": "family",
      "Premium Family": "premium_family",
    };
    const planKey = plan ? (planKeyMap[plan] ?? "family") : "family";
    const planName = plan ?? "Family Plan";

    // Track conversion event
    trackBeginCheckout({
      plan: planKey,
      billingPeriod: annualBilling ? "annual" : "monthly",
    });

    if (currentUser) {
      // Already logged in — go straight to checkout
      setCheckoutPlanKey(planKey);
      setCheckoutPlanName(planName);
      setCheckoutOpen(true);
    } else {
      // Not logged in — show role selection / sign-up
      setSelectedPlan(plan);
      setRoleModalOpen(true);
    }
  }
  const subscribeNewsletter = trpc.onboarding.subscribeNewsletter.useMutation();
  const { data: liveStats } = trpc.landing.getStats.useQuery();

  function handleSignIn() {
    window.location.href = getLoginUrl();
  }

  async function handleNewsletterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterLoading(true);
    try {
      await subscribeNewsletter.mutateAsync({ email: newsletterEmail, name: newsletterName || undefined });
      setNewsletterDone(true);
    } catch {
      setNewsletterDone(true);
    } finally {
      setNewsletterLoading(false);
    }
  }

  // Animated counter hook
  function useCounter(target: number, duration = 1500) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          const start = Date.now();
          const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      }, { threshold: 0.3 });
      if (ref.current) observer.observe(ref.current);
      return () => observer.disconnect();
    }, [target, duration]);
    return { count, ref };
  }

  const stats = [
    { label: "Courses Available", value: liveStats?.courses ?? 15, suffix: "+" },
    { label: "Active Students", value: liveStats?.students ?? 0, suffix: liveStats?.students ? "+" : "" },
    { label: "Enrollments", value: liveStats?.enrollments ?? 0, suffix: liveStats?.enrollments ? "+" : "" },
    { label: "Diagnostics Completed", value: liveStats?.diagnosticsCompleted ?? 0, suffix: liveStats?.diagnosticsCompleted ? "+" : "" },
  ];

  const features = [
    { icon: Brain, title: "EduBot AI Tutor", desc: "Meet EduBot — your personal AI learning coach, available 24/7. EduBot explains concepts, answers questions, and stays scoped to your active course to keep learning focused and effective." },
    { icon: BarChart3, title: "Adaptive Placement Tests", desc: "A 57-question diagnostic placement test identifies exactly where each student stands across all units and builds a fully personalized learning roadmap from day one." },
    { icon: GraduationCap, title: "Mastery-Based Progression", desc: "Students advance by demonstrating mastery, not just completing lessons — ensuring no knowledge gaps are left behind at any grade level." },
    { icon: Users, title: "Parent & Guardian Dashboard", desc: "Real-time visibility into progress, quiz scores, AI tutor sessions, skill gaps, and learning goals — with co-parent sharing and detailed performance reports." },
    { icon: BookOpen, title: "70+ Courses, Pre-K–Grade 12", desc: "From Pre-K foundational skills to AP Calculus BC, AP Chemistry, SAT Prep, and beyond — all standards-aligned and mapped to AP College Board frameworks." },
    { icon: Zap, title: "Instant Feedback & Insights", desc: "Every quiz and exercise provides immediate, detailed feedback. AI-driven skill gap analysis highlights exactly where to focus next." },
  ];

  const { data: courseCatalogue = [] } = trpc.landing.getCourseCatalogue.useQuery();

  // Subject → colour mapping for badges
  const subjectColor: Record<string, string> = {
    math:           "bg-blue-100 text-blue-800",
    english:        "bg-purple-100 text-purple-800",
    science:        "bg-green-100 text-green-800",
    social_studies: "bg-amber-100 text-amber-800",
    language:       "bg-rose-100 text-rose-800",
    other:          "bg-slate-100 text-slate-700",
  };

  // Grade-level ordering — mirrors CourseCatalog.tsx GRADE_ORDER
  const GRADE_ORDER = ["Pre-K","Kindergarten","1","2","3","4","5","6","7","8","9","10","11","12","AP","SAT"];
  const gradeLabel = (g: string) => g === "AP" ? "AP Courses" : g === "SAT" ? "SAT Prep" : g === "Kindergarten" ? "Kindergarten" : g === "Pre-K" ? "Pre-K" : `Grade ${g}`;
  const gradeSort  = (a: string, b: string) => {
    const ia = GRADE_ORDER.indexOf(a), ib = GRADE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1; if (ib === -1) return -1; return ia - ib;
  };

  const [activeCatalogueGrade, setActiveCatalogueGrade] = useState<string>("Pre-K");
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string>("all");

  // Subject filter pills definition
  const SUBJECT_FILTERS = [
    { value: "all",           label: "All Subjects" },
    { value: "math",          label: "Math" },
    { value: "english",       label: "English" },
    { value: "science",       label: "Science" },
    { value: "social_studies",label: "Social Studies" },
    { value: "language",      label: "Language" },
    { value: "technology",    label: "Technology" },
    { value: "other",         label: "Other" },
  ];

  // Subject-filtered catalogue
  const filteredCatalogue = useMemo(
    () => activeSubjectFilter === "all"
      ? courseCatalogue
      : courseCatalogue.filter((c) => c.subject === activeSubjectFilter),
    [courseCatalogue, activeSubjectFilter]
  );

  // Group filtered courses by gradeLevel
  const coursesByGrade = useMemo(() => {
    const map: Record<string, typeof filteredCatalogue> = {};
    for (const c of filteredCatalogue) {
      const g = c.gradeLevel ?? "other";
      if (!map[g]) map[g] = [];
      map[g].push(c);
    }
    return map;
  }, [filteredCatalogue]);

  // Only show grade tabs that have at least one course, sorted by GRADE_ORDER
  const availableGrades = useMemo(
    () => Object.keys(coursesByGrade).sort(gradeSort),
    [coursesByGrade]
  );

  // Auto-select first available grade when data loads or filter changes
  useEffect(() => {
    if (availableGrades.length > 0 && !coursesByGrade[activeCatalogueGrade]) {
      setActiveCatalogueGrade(availableGrades[0]);
    }
  }, [availableGrades]);

  const steps = [
    { num: "01", title: "Sign Up", desc: "Create your account as a student or parent in under 2 minutes. Parents can enrol children and manage multiple students from one dashboard." },
    { num: "02", title: "Choose Your Grade & Courses", desc: "Select your grade level and the system automatically recommends the right core courses. Browse and self-enrol in additional subjects at any time." },
    { num: "03", title: "Take the Placement Test", desc: "A 57-question adaptive diagnostic identifies your exact starting level across all units and builds a fully personalised learning roadmap." },
    { num: "04", title: "Learn with EduBot", desc: "Work through lessons, guided practice, and quizzes at your own pace — with EduBot, your AI learning coach, available at every step." },
    { num: "05", title: "Track Mastery & Progress", desc: "Watch skills grow on the progress dashboard — unit by unit, skill by skill — with parent-visible reports and AI-driven next-step recommendations." },
  ];

  const testimonials = [
    { name: "Maria T.", role: "Parent of 9th grader", text: "My daughter went from a C to an A in Algebra I in just 6 weeks. The placement test was a game changer — it found exactly where she was struggling." },
    { name: "James K.", role: "11th grade student", text: "EduBot explains things better than my teacher sometimes. I can ask the same question 10 times without feeling embarrassed, and it always stays on topic." },
    { name: "Dr. Priya S.", role: "Parent of AP student", text: "EduChamp's AP Chemistry course is incredibly well-structured. My son scored a 5 on the AP exam after using it for one semester." },
    { name: "Linda R.", role: "Parent of 6th grader", text: "I love that I can see exactly what my son is learning in Grade 6 Science. The parent dashboard shows his quiz scores and skill gaps in real time." },
    { name: "Carlos M.", role: "8th grade student", text: "I'm in the KAP Math track and EduChamp keeps me challenged. The adaptive path pushed me into harder problems once I mastered the basics." },
    { name: "Aisha W.", role: "Parent of 4th grader", text: "Starting EduChamp in Grade 4 was the best decision. My daughter's reading comprehension improved dramatically after just one month on the ELA course." },
  ];

  const faqs = [
    { q: "Is EduChamp free to use?", a: "EduChamp offers a free tier to get started. Sign up to explore the platform — no credit card required. Paid plans (Family at $19.99/mo and Premium Family at $29.99/mo) unlock unlimited AI tutor sessions, all courses, and the parent dashboard." },
    { q: "What is the difference between the Family and Premium Family plans?", a: "The Family Plan ($19.99/mo) covers up to 3 students with access to all 70+ courses, unlimited AI tutoring, and the parent dashboard. The Premium Family Plan ($29.99/mo) adds diagnostic assessments, exam prep modules, priority AI sessions, and custom learning paths. Both plans can be cancelled at any time." },
    { q: "Do you offer plans for schools and school districts?", a: "Yes. The School / District License is a per-seat annual contract designed for campuses and districts. It includes teacher and admin dashboards, custom standards alignment, bulk content management, and a performance analytics API. Contact schools@educhamp.app for pricing and a demo." },
    { q: "What grade levels are supported?", a: "EduChamp supports students from Pre-K through Grade 12, including all major AP courses and SAT preparation. The catalogue covers early childhood (Pre-K–Grade 2), elementary (Grades 3–5), middle school (Grades 6–8), high school (Grades 9–12), and advanced AP/SAT tracks — over 70 courses in total." },
    { q: "Does EduChamp support advanced or accelerated learners?", a: "Yes. Many subjects offer both standard and advanced variants. Advanced courses cover the same core standards at a deeper level and at a faster pace, designed for students who are ready for a more challenging academic pathway. Both tracks are available across core subjects from elementary through high school." },
    { q: "How does course enrollment work?", a: "During onboarding, parents select the student's grade level and the system automatically recommends and enrols the student in the appropriate core courses. Students can also browse the full catalogue and self-enrol in additional subjects, subject to grade and prerequisite validation." },
    { q: "What is EduBot?", a: "EduBot is EduChamp's AI learning coach — a friendly, named AI tutor that introduces itself at the start of every session, explains its role, and guides students through lessons, practice, quizzes, and exam review. EduBot is scoped to the student's active course and will politely redirect any off-topic questions back to the current subject." },
    { q: "Can my child sign up without me?", a: "Students aged 16 and over can sign up independently and optionally invite a parent or guardian. Students under 16 are required to have a parent or guardian complete or approve the registration before course access is granted — ensuring appropriate oversight for younger learners." },
    { q: "How does the placement test work?", a: "Each course has a 57-question adaptive diagnostic that maps your child's knowledge across all units. It takes about 25–35 minutes and immediately generates a personalised learning plan showing which units to tackle first, which to review, and which are already mastered." },
    { q: "Is the AI tutor safe for kids?", a: "Yes. EduBot is scoped to academic content only and will not engage in off-topic conversations. All sessions are logged and visible to parents in the Parent Dashboard. EduBot will redirect any questions about other subjects back to the active course." },
    { q: "Can parents monitor multiple children?", a: "Yes. The Parent Dashboard supports multiple children, with per-child progress cards, mastery breakdowns, quiz history, skill gap analysis, study goals, and co-parent sharing. Parents can also invite a co-parent or guardian to view a child's progress." },
    { q: "Which standards are courses aligned to?", a: "Courses are aligned to the state academic standards for the enrolled student's district or region. AP courses additionally follow AP College Board guidelines, and SAT Prep is aligned to College Board SAT standards. Contact your administrator or our team to confirm the standards framework for your district." },
    { q: "Can students take multiple courses at once?", a: "Yes. Students can be enrolled in multiple courses simultaneously and switch between them from the Course Switcher. Each course has its own independent placement test, learning path, mastery tracking, and AI tutor context." },
    { q: "What happens after a student completes all units in a course?", a: "Once a student achieves a passing quiz score across all units, the course is marked complete. The student can then enrol in the next grade-level course or an advanced variant, guided by the course recommendation engine." },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/landing")}>
              <div className="h-9 w-9 rounded-lg overflow-hidden bg-white border border-slate-100 flex items-center justify-center">
                <img src="/manus-storage/educhamp-logo-64_28201452.png" alt="EduChamp" className="h-8 w-8 object-contain" />
              </div>
              <span className="font-bold text-lg text-slate-900">EduChamp</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6 text-sm text-slate-600">
              <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
              <a href="#courses" className="hover:text-indigo-600 transition-colors">Courses</a>
              <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How It Works</a>
              <a href="#pricing" className="hover:text-indigo-600 transition-colors font-semibold text-indigo-600">Pricing</a>
              <a href="#schools" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500"></span>Schools
              </a>
              <a href="#faq" className="hover:text-indigo-600 transition-colors">FAQ</a>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={handleSignIn}
                className="text-sm text-slate-600 hover:text-indigo-600 transition-colors font-medium px-3 py-1.5"
              >
                Sign In
              </button>
              <button
                onClick={() => openSignUp()}
                className="text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 transition-colors font-medium active:scale-95"
              >
                Sign Up Free
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-3">
              <a href="#features" className="block text-sm text-slate-600 hover:text-indigo-600 py-1" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#courses" className="block text-sm text-slate-600 hover:text-indigo-600 py-1" onClick={() => setMobileMenuOpen(false)}>Courses</a>
            <a href="#how-it-works" className="block text-sm text-slate-600 hover:text-indigo-600 py-1" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#pricing" className="block text-sm font-semibold text-indigo-600 py-1" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#schools" className="block text-sm text-slate-600 hover:text-indigo-600 py-1 font-medium" onClick={() => setMobileMenuOpen(false)}>Schools &amp; Districts</a>
            <a href="#faq" className="block text-sm text-slate-600 hover:text-indigo-600 py-1" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSignIn} className="flex-1 text-sm border border-slate-200 rounded-lg py-2 text-slate-700 hover:bg-slate-50 transition-colors">Sign In</button>
              <button onClick={() => { setMobileMenuOpen(false); openSignUp(); }} className="flex-1 text-sm bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700 transition-colors">Sign Up Free</button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-violet-600/15 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-900/30 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full px-3 py-1.5 text-xs text-indigo-300 font-medium mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                AI-Powered Adaptive Learning
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                Learn Smarter,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                  Advance Faster
                </span>
              </h1>
              <p className="text-lg text-slate-300 mb-6 leading-relaxed max-w-lg">
                EduChamp's AI tutor EduBot and adaptive placement tests create a personalised learning path for every student — from Pre-K foundational skills to AP Calculus, AP Chemistry, and SAT Prep. Supporting Pre-K through Grade 12 with 70+ courses aligned to your state's academic standards.
              </p>
              {/* Trust micro-badges */}
              <div className="flex flex-wrap gap-3 mb-8">
                {[
                  { icon: Shield, label: "Standards Aligned" },
                  { icon: Brain, label: "AI-Powered" },
                  { icon: Trophy, label: "Mastery-Based" },
                  { icon: Users, label: "Parent Dashboard" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1 text-xs text-slate-300">
                    <Icon className="h-3 w-3 text-indigo-400" />
                    {label}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => openSignUp()}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-150 active:scale-95 shadow-lg shadow-indigo-900/50"
                >
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-150 active:scale-95 backdrop-blur-sm"
                >
                  View Plans
                </button>
              </div>
              <p className="mt-4 text-xs text-slate-400">Free to start · No credit card required · Works on any device</p>
              {/* Social proof */}
              <div className="mt-6 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {["M","J","P","A","C"].map((initial, i) => (
                    <div key={i} className={`h-8 w-8 rounded-full border-2 border-indigo-900 flex items-center justify-center text-xs font-bold text-white ${
                      ["bg-indigo-500","bg-violet-500","bg-pink-500","bg-amber-500","bg-emerald-500"][i]
                    }`}>{initial}</div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5 mb-0.5">
                    {[...Array(5)].map((_,i) => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-xs text-slate-400">Loved by students & parents</p>
                </div>
              </div>
            </div>

            {/* Hero visual — Animated Demo Widget (desktop) */}
            <div className="hidden lg:block relative">
              <EduChampDemoWidget />
            </div>
          </div>

          {/* Mobile demo widget — shown below hero text on small screens */}
          <div className="lg:hidden mt-10 pb-4">
            <EduChampDemoWidget variant="compact" />
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-indigo-600 text-white py-10">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((stat) => {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const { count, ref } = useCounter(stat.value);
            return (
              <div key={stat.label} ref={ref}>
                <p className="text-3xl sm:text-4xl font-extrabold tabular-nums">
                  {count.toLocaleString()}{stat.suffix}
                </p>
                <p className="text-indigo-200 text-sm mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Everything a student needs to succeed</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">EduChamp combines AI tutoring, adaptive assessments, and mastery-based progression into one seamless learning experience.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-11 w-11 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Courses ── */}
      <section id="courses" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Full Course Catalogue</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Browse all courses by grade level — from Pre-K foundational skills to AP Calculus, AP Chemistry, and SAT Prep. All courses are aligned to state academic standards and AP College Board guidelines, with both standard and advanced pathways available.</p>
          </div>

          {/* Subject filter pills */}
          <div className="flex flex-wrap gap-2 justify-center mb-5">
            {SUBJECT_FILTERS.filter((sf) =>
              sf.value === "all" || courseCatalogue.some((c) => c.subject === sf.value)
            ).map((sf) => (
              <button
                key={sf.value}
                onClick={() => {
                  setActiveSubjectFilter(sf.value);
                }}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  activeSubjectFilter === sf.value
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-700"
                }`}
              >
                {sf.label}
              </button>
            ))}
          </div>

          {/* Grade-level tab bar */}
          {availableGrades.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 justify-center mb-8">
                {availableGrades.map((g) => (
                  <button
                    key={g}
                    onClick={() => setActiveCatalogueGrade(g)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeCatalogueGrade === g
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                    }`}
                  >
                    {gradeLabel(g)}
                    <span className="ml-1.5 text-xs opacity-70">
                      ({coursesByGrade[g]?.length ?? 0})
                    </span>
                  </button>
                ))}
              </div>

              {/* Course cards for active grade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[120px]">
                {(coursesByGrade[activeCatalogueGrade] ?? []).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all"
                  >
                    <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-indigo-100 flex items-center justify-center mt-0.5">
                      <BookOpen className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 leading-snug">{c.title}</p>
                      {c.teksCode && (
                        <p className="text-xs text-slate-400 mt-0.5">{c.teksCode}</p>
                      )}
                      {c.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{c.description}</p>
                      )}
                    </div>
                    <span
                      className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                        subjectColor[c.subject] ?? subjectColor.other
                      }`}
                    >
                      {c.subject.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Fallback while loading */}
          {availableGrades.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <button
              onClick={() => openSignUp()}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-indigo-700 transition-colors active:scale-95"
            >
              Get Started Free <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">How EduChamp Works</h2>
            <p className="text-slate-500 max-w-xl mx-auto">From sign-up to mastery in five simple steps.</p>
          </div>

          {/* Steps 1 & 2 — simple list (no demo) */}
          <div className="space-y-5 mb-12">
            {steps.slice(0, 2).map((step, i) => (
              <div key={step.num} className="flex gap-5 items-start">
                <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-200">
                  {step.num}
                </div>
                <div className="pt-2">
                  <h3 className="font-semibold text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Steps 3–5 — two-column layout with contextual demo panels */}
          <div className="space-y-16">
            {/* Step 3 — Placement Test */}
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="flex gap-5 items-start">
                <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-200">
                  03
                </div>
                <div className="pt-2">
                  <h3 className="font-semibold text-slate-900 mb-1">{steps[2].title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{steps[2].desc}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 shadow-xl">
                <EduChampDemoWidget variant="mini" initialMode="quiz" hideTabs />
              </div>
            </div>

            {/* Step 4 — Learn with EduBot */}
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="lg:order-2 flex gap-5 items-start">
                <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-200">
                  04
                </div>
                <div className="pt-2">
                  <h3 className="font-semibold text-slate-900 mb-1">{steps[3].title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{steps[3].desc}</p>
                </div>
              </div>
              <div className="lg:order-1 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 shadow-xl">
                <EduChampDemoWidget variant="mini" initialMode="tutor" hideTabs />
              </div>
            </div>

            {/* Step 5 — Track Mastery */}
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="flex gap-5 items-start">
                <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-200">
                  05
                </div>
                <div className="pt-2">
                  <h3 className="font-semibold text-slate-900 mb-1">{steps[4].title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{steps[4].desc}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 shadow-xl">
                <EduChampDemoWidget variant="mini" initialMode="exam" hideTabs />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">What Families Are Saying</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-sm text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Schools & Districts ── */}
      <section id="schools" className="relative py-24 overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        {/* Decorative grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        {/* Glow blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Top label */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase mb-6">
              <Building2 className="h-3.5 w-3.5" /> For Schools &amp; Districts
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-5">
              Bring AI-Powered Learning<br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400"> to Every Classroom</span>
            </h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed">
              EduChamp gives district administrators, curriculum directors, and campus principals a single platform to deploy adaptive AI tutoring across every grade and subject — fully aligned to your state's academic standards.
            </p>
          </div>

          {/* Benefit pillars */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              {
                icon: <TrendingUp className="h-6 w-6" />,
                title: "Measurable Outcomes",
                desc: "Real-time mastery dashboards let administrators track skill gaps and intervention needs across every campus.",
              },
              {
                icon: <LayoutDashboard className="h-6 w-6" />,
                title: "District-Wide Control",
                desc: "Bulk enrollment, teacher dashboards, and custom standards alignment — managed from a single admin console.",
              },
              {
                icon: <Brain className="h-6 w-6" />,
                title: "Adaptive AI Tutor",
                desc: "EduBot meets each student at their level, providing personalized explanations and practice across 70+ courses.",
              },
              {
                icon: <HeartHandshake className="h-6 w-6" />,
                title: "Dedicated Onboarding",
                desc: "Our team handles implementation, teacher training, and ongoing support — so your staff can focus on students.",
              },
            ].map((pillar) => (
              <div key={pillar.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-500/20 text-indigo-400 mb-4">
                  {pillar.icon}
                </div>
                <h3 className="text-white font-semibold mb-2">{pillar.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>

          {/* Two-column: stats + CTA */}
          <div className="grid lg:grid-cols-2 gap-10 items-center">

            {/* Left: district trust signals */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Trusted by districts and schools nationwide</p>
              {/* Placeholder district logo strip */}
              <div className="flex flex-wrap gap-4 mb-8">
                {[
                  "Partner District A", "Partner District B", "Partner District C",
                  "Partner District D", "Partner District E", "Partner District F",
                ].map((name) => (
                  <div key={name} className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-lg px-4 py-2">
                    <Building2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <span className="text-slate-300 text-xs font-medium whitespace-nowrap">{name}</span>
                  </div>
                ))}
              </div>
              {/* Stat row */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: "70+", label: "Courses" },
                  { value: "Pre-K–12", label: "Grade range" },
                  { value: "Multi-state", label: "Standards" },
                ].map((s) => (
                  <div key={s.label} className="text-center bg-white/5 border border-white/10 rounded-xl py-4">
                    <p className="text-2xl font-extrabold text-white">{s.value}</p>
                    <p className="text-slate-400 text-xs mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: CTA card */}
            <div className="bg-white rounded-2xl p-8 shadow-2xl shadow-indigo-900/40">
              <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 rounded-full px-3 py-1 text-xs font-semibold mb-4">
                <Sparkles className="h-3.5 w-3.5" /> Free pilot available
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Ready to see EduChamp in action?</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Schedule a personalised demo for your campus or district. We'll walk through the platform, answer your questions, and design a pilot plan that fits your timeline.
              </p>
              <ul className="space-y-2 mb-7">
                {[
                  "Live platform walkthrough with your team",
                  "Custom standards alignment review",
                  "Pilot program design & pricing",
                  "Implementation timeline & support plan",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setDemoOpen(true)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm hover:from-indigo-500 hover:to-violet-500 transition-all active:scale-[0.98] shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Building2 className="h-4 w-4" /> Request a Demo for Your District
              </button>
              <p className="text-center text-xs text-slate-400 mt-3">No commitment required · Response within 1 business day</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 rounded-full px-3 py-1 text-xs font-semibold mb-4">
              <Shield className="h-3.5 w-3.5" /> Simple, transparent pricing
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Choose the plan that fits your family</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">All plans include access to EduBot AI Tutor, adaptive placement tests, and the full course catalogue. No hidden fees.</p>

            {/* Annual / Monthly toggle */}
            <div className="mt-8 inline-flex items-center gap-3 bg-white border border-slate-200 rounded-full px-4 py-2 shadow-sm">
              <span className={`text-sm font-medium transition-colors ${!annualBilling ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
              <button
                role="switch"
                aria-checked={annualBilling}
                onClick={() => setAnnualBilling(a => !a)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  annualBilling ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  annualBilling ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
              <span className={`text-sm font-medium transition-colors ${annualBilling ? 'text-slate-900' : 'text-slate-400'}`}>
                Annual
                <span className="ml-1.5 inline-flex items-center bg-emerald-100 text-emerald-700 text-xs font-bold px-1.5 py-0.5 rounded-full">Save 20%</span>
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">

            {/* ── Plan 1: Family ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-8 flex flex-col">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Family Plan</p>
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    ✓ 14-day free trial
                  </span>
                </div>
                <div className="flex items-end gap-1 mb-1">
                  {annualBilling && <span className="text-2xl font-bold text-slate-300 line-through mr-1">$19.99</span>}
                  <span className="text-5xl font-extrabold text-slate-900">{annualBilling ? '$15' : '$19'}</span>
                  <span className="text-2xl font-bold text-slate-900">{annualBilling ? '.99' : '.99'}</span>
                  <span className="text-slate-400 text-sm mb-1">/month</span>
                </div>
                <p className="text-xs text-slate-400">{annualBilling ? 'Billed annually ($191.88/yr) · Cancel anytime' : 'Billed monthly · Cancel anytime'}</p>
              </div>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">Everything your family needs to get started — AI tutoring, all courses, and a parent dashboard for up to 3 students.</p>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Up to 3 students",
                  "All 70+ courses & subjects",
                  "AI Tutor EduBot (unlimited)",
                  "Parent dashboard",
                  "Weekly progress reports",
                  "Pre-K through Grade 12 + AP + SAT Prep",
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckCircle className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => openSignUp("Family Plan")}
                className="w-full py-3 rounded-xl border-2 border-indigo-600 text-indigo-700 font-semibold hover:bg-indigo-50 transition-colors active:scale-[0.98] text-sm"
              >
                Start Free Trial
              </button>
              <p className="text-center text-xs text-slate-400 mt-2">14 days free · then {annualBilling ? '$15.99/mo' : '$19.99/mo'} · Cancel anytime</p>
            </div>

            {/* ── Plan 2: Premium Family (highlighted) ── */}
            <div className="relative bg-gradient-to-b from-indigo-600 to-violet-700 rounded-2xl shadow-xl shadow-indigo-200 p-8 flex flex-col text-white -mt-4 md:-mt-6">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap">⭐ Most Popular</span>
              </div>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Premium Family</p>
                  <span className="inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    ✓ 14-day free trial
                  </span>
                </div>
                <div className="flex items-end gap-1 mb-1">
                  {annualBilling && <span className="text-2xl font-bold text-indigo-300 line-through mr-1">$29.99</span>}
                  <span className="text-5xl font-extrabold">{annualBilling ? '$23' : '$29'}</span>
                  <span className="text-2xl font-bold">{annualBilling ? '.99' : '.99'}</span>
                  <span className="text-indigo-200 text-sm mb-1">/month</span>
                </div>
                <p className="text-xs text-indigo-300">{annualBilling ? 'Billed annually ($287.88/yr) · Cancel anytime' : 'Billed monthly · Cancel anytime'}</p>
              </div>
              <p className="text-sm text-indigo-100 mb-6 leading-relaxed">Everything in Family, plus advanced diagnostics, exam prep, priority AI sessions, and custom learning paths.</p>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Everything in Family Plan",
                  "Diagnostic assessments",
                  "Exam prep modules",
                  "Priority AI sessions",
                  "Custom learning paths",
                  "Advanced skill gap analysis",
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white">
                    <CheckCircle className="h-4 w-4 text-indigo-200 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => openSignUp("Premium Family")}
                className="w-full py-3 rounded-xl bg-white text-indigo-700 font-bold hover:bg-indigo-50 transition-colors active:scale-[0.98] text-sm shadow-lg"
              >
                Start Free Trial
              </button>
              <p className="text-center text-xs text-indigo-300 mt-2">14 days free · then {annualBilling ? '$23.99/mo' : '$29.99/mo'} · Cancel anytime</p>
            </div>

            {/* ── Plan 3: ISD / School License ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-8 flex flex-col">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">ISD / School License</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-extrabold text-slate-900">Per-seat</span>
                </div>
                <p className="text-slate-400 text-sm">Annual contract · Volume pricing</p>
              </div>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">Purpose-built for school districts and campuses — with teacher dashboards, custom standards alignment, and bulk content management.</p>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Unlimited student seats",
                  "Teacher & admin dashboards",
                  "Custom standards alignment",
                  "Bulk content management",
                  "Performance analytics API",
                  "Dedicated onboarding support",
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckCircle className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setDemoOpen(true)}
                className="w-full py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors active:scale-[0.98] text-sm text-center block"
              >
                Request a Demo
              </button>
            </div>

          </div>

          {/* ── Plan Comparison Table ── */}
          <div className="mt-16 overflow-x-auto">
            <h3 className="text-center text-lg font-bold text-slate-800 mb-6">Full Feature Comparison</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-4 text-slate-500 font-medium w-1/3">Feature</th>
                  <th className="text-center py-3 px-4 text-indigo-700 font-semibold">Family<br/><span className="text-xs font-normal text-slate-400">{annualBilling ? '$15.99/mo' : '$19.99/mo'}</span></th>
                  <th className="text-center py-3 px-4 bg-indigo-50 rounded-t-lg text-indigo-700 font-semibold">Premium Family<br/><span className="text-xs font-normal text-indigo-400">{annualBilling ? '$23.99/mo' : '$29.99/mo'}</span></th>
                  <th className="text-center py-3 px-4 text-slate-700 font-semibold">ISD / School<br/><span className="text-xs font-normal text-slate-400">Per-seat annual</span></th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Number of students', family: 'Up to 3', premium: 'Up to 3', isd: 'Unlimited' },
                  { feature: 'All courses & subjects (70+)', family: '✓', premium: '✓', isd: '✓' },
                  { feature: 'AI Tutor EduBot', family: 'Unlimited', premium: 'Priority access', isd: 'Priority access' },
                  { feature: 'Diagnostic assessments', family: '—', premium: '✓', isd: '✓' },
                  { feature: 'Exam prep modules', family: '—', premium: '✓', isd: '✓' },
                  { feature: 'Custom learning paths', family: '—', premium: '✓', isd: '✓' },
                  { feature: 'Parent dashboard', family: '✓', premium: '✓', isd: 'Admin dashboard' },
                  { feature: 'Weekly progress reports', family: '✓', premium: '✓', isd: '✓' },
                  { feature: 'Advanced skill gap analysis', family: '—', premium: '✓', isd: '✓' },
                  { feature: 'Teacher dashboards', family: '—', premium: '—', isd: '✓' },
                  { feature: 'Custom standards alignment', family: '—', premium: '—', isd: '✓' },
                  { feature: 'Bulk content management', family: '—', premium: '—', isd: '✓' },
                  { feature: 'Performance analytics API', family: '—', premium: '—', isd: '✓' },
                  { feature: 'Dedicated onboarding support', family: '—', premium: '—', isd: '✓' },
                  { feature: 'Standards-aligned curriculum', family: '✓', premium: '✓', isd: '✓' },
                  { feature: 'Cancel anytime', family: '✓', premium: '✓', isd: 'Annual contract' },
                ].map((row, i) => (
                  <tr key={row.feature} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="py-3 px-4 text-slate-700 font-medium">{row.feature}</td>
                    <td className="py-3 px-4 text-center text-slate-600">
                      {row.family === '✓' ? <CheckCircle className="h-4 w-4 text-indigo-500 mx-auto" /> : row.family === '—' ? <span className="text-slate-300">—</span> : <span className="text-xs">{row.family}</span>}
                    </td>
                    <td className="py-3 px-4 text-center bg-indigo-50/50 text-slate-600">
                      {row.premium === '✓' ? <CheckCircle className="h-4 w-4 text-indigo-600 mx-auto" /> : row.premium === '—' ? <span className="text-slate-300">—</span> : <span className="text-xs font-medium text-indigo-700">{row.premium}</span>}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">
                      {row.isd === '✓' ? <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" /> : row.isd === '—' ? <span className="text-slate-300">—</span> : <span className="text-xs">{row.isd}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-indigo-500" /> No credit card required to start</div>
            <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> 30-day satisfaction guarantee</div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-500" /> Cancel anytime, no lock-in</div>
            <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-indigo-500" /> Standards-aligned curriculum</div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to start your learning journey?</h2>
          <p className="text-indigo-200 mb-8 max-w-xl mx-auto">Join thousands of students already advancing with EduChamp. Sign up in under 2 minutes — no credit card required.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => openSignUp()}
              className="flex items-center gap-2 bg-white text-indigo-700 font-bold px-8 py-3 rounded-xl hover:bg-indigo-50 transition-colors active:scale-95 shadow-lg"
            >
              <GraduationCap className="h-5 w-5" /> Get Started Free
            </button>
            <button
              onClick={() => { document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="flex items-center gap-2 bg-white/15 border border-white/30 text-white font-bold px-8 py-3 rounded-xl hover:bg-white/25 transition-colors active:scale-95 backdrop-blur-sm"
            >
              View Plans
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-slate-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-medium text-slate-900 text-sm">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-xl mx-auto px-4 text-center">
          <Mail className="h-10 w-10 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Stay in the loop</h2>
          <p className="text-slate-400 text-sm mb-6">Get updates on new courses, learning tips, and EduChamp news delivered to your inbox.</p>
          {newsletterDone ? (
            <div className="flex items-center justify-center gap-2 text-emerald-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">You're subscribed! Thanks for joining.</span>
            </div>
          ) : (
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <input
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your name (optional)"
                value={newsletterName}
                onChange={e => setNewsletterName(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Your email address"
                  value={newsletterEmail}
                  onChange={e => setNewsletterEmail(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={newsletterLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-3 rounded-xl transition-colors disabled:opacity-50 active:scale-95"
                >
                  {newsletterLoading ? "..." : "Subscribe"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 text-slate-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                <img src="/manus-storage/educhamp-logo-64_28201452.png" alt="EduChamp" className="h-6 w-6 object-contain" />
              </div>
              <span className="font-bold text-white">EduChamp</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#courses" className="hover:text-white transition-colors">Courses</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#schools" className="hover:text-white transition-colors">Schools</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              <button onClick={handleSignIn} className="hover:text-white transition-colors">Sign In</button>
            </div>
            <p className="text-xs text-slate-600">© {new Date().getFullYear()} EduChamp. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ── AI Chatbot ── */}
      <LandingChatbot />

      {/* ── Role Select Modal ── */}
      <RoleSelectModal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        planName={selectedPlan}
        billingPeriod={annualBilling ? "annual" : "monthly"}
      />

      {/* ── Demo Request Modal ── */}
      <RequestDemoModal
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        defaultInterest="demo"
      />

      {/* ── Checkout Modal (logged-in users) ── */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        planKey={checkoutPlanKey}
        planName={checkoutPlanName}
        billingPeriod={annualBilling ? "annual" : "monthly"}
        amountCents={
          checkoutPlanKey === "premium_family"
            ? (annualBilling ? 2399 * 12 : 2999)
            : (annualBilling ? 1599 * 12 : 1999)
        }
      />
    </div>
  );
}
