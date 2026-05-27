/**
 * EduChamp Public Landing Page
 * Full-featured marketing page for unauthenticated visitors.
 * Includes: hero, features, how-it-works, testimonials, newsletter, AI chatbot.
 */
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  GraduationCap, Sparkles, BookOpen, BarChart3, Users, CheckCircle2,
  ArrowRight, Star, Brain, Trophy, Target, Zap, Shield, MessageCircle,
  X, Send, Loader2, ChevronDown, ChevronRight, Mail, Menu,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1800;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const QUICK_QUESTIONS = [
    "How does EduChamp work?",
    "What courses are available?",
    "How do I sign up my child?",
    "What is the placement test?",
  ];

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const response = await utils.client.landing.chat.mutate({
        messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
      });
      const assistantContent = typeof response.content === "string" ? response.content : "I'm here to help! What would you like to know about EduChamp?";
      setMessages(prev => [...prev, { role: "assistant", content: assistantContent }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again in a moment, or click 'Sign Up' to get started!",
      }]);
    } finally {
      setLoading(false);
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
          maxHeight: "520px",
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
  const subscribeNewsletter = trpc.onboarding.subscribeNewsletter.useMutation();

  function handleSignUp(role: "student" | "parent" = "student") {
    const returnPath = role === "parent" ? "/onboarding/parent" : "/onboarding/student";
    sessionStorage.setItem("educhamp_post_login_redirect", returnPath);
    window.location.href = getLoginUrl();
  }

  function handleSignIn() {
    window.location.href = getLoginUrl();
  }

  async function handleNewsletterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newsletterEmail) return;
    setNewsletterLoading(true);
    try {
      await subscribeNewsletter.mutateAsync({
        email: newsletterEmail,
        name: newsletterName || undefined,
        source: "landing_page",
      });
      setNewsletterDone(true);
      toast.success("You're subscribed! We'll keep you updated.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setNewsletterLoading(false);
    }
  }

  const FEATURES = [
    {
      icon: Brain,
      title: "AI-Powered Tutoring",
      description: "A personal AI tutor that adapts to each student's pace, explains concepts multiple ways, and never gets frustrated.",
      color: "bg-indigo-100 text-indigo-600",
    },
    {
      icon: Target,
      title: "Diagnostic Placement",
      description: "A 30-question placement test identifies exactly where each student is, so learning starts at the right level — not too easy, not too hard.",
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      icon: BarChart3,
      title: "Real-Time Progress",
      description: "Students and parents can track mastery scores, quiz performance, and unit completion in real time from any device.",
      color: "bg-violet-100 text-violet-600",
    },
    {
      icon: BookOpen,
      title: "Structured Curriculum",
      description: "Aligned with TEKS, AP, and SAT standards. Every unit, lesson, and quiz is sequenced for maximum retention and exam readiness.",
      color: "bg-amber-100 text-amber-600",
    },
    {
      icon: Users,
      title: "Parent Dashboard",
      description: "Parents get a dedicated dashboard with weekly reports, progress alerts, and direct visibility into their child's learning activity.",
      color: "bg-rose-100 text-rose-600",
    },
    {
      icon: Trophy,
      title: "Mastery-Based Progression",
      description: "Students advance by demonstrating mastery, not just completing lessons. Each unit unlocks the next, building genuine confidence.",
      color: "bg-teal-100 text-teal-600",
    },
  ];

  const COURSES = [
    { name: "Algebra I", badge: "TEKS", color: "bg-indigo-600" },
    { name: "AP Calculus BC", badge: "AP", color: "bg-violet-600" },
    { name: "AP Statistics", badge: "AP", color: "bg-emerald-600" },
    { name: "AP Chemistry", badge: "AP", color: "bg-amber-600" },
    { name: "AP Literature", badge: "AP", color: "bg-rose-600" },
    { name: "SAT Prep", badge: "SAT", color: "bg-teal-600" },
    { name: "AP Physics", badge: "AP", color: "bg-blue-600" },
    { name: "AP Biology", badge: "AP", color: "bg-green-600" },
  ];

  const STEPS = [
    {
      step: "01",
      title: "Create Your Account",
      description: "Students sign up in under 2 minutes. During onboarding, invite your parent or guardian to link their account.",
      icon: Users,
    },
    {
      step: "02",
      title: "Take the Placement Test",
      description: "A 30-question diagnostic identifies your starting point so you begin at exactly the right level.",
      icon: Target,
    },
    {
      step: "03",
      title: "Learn with Your AI Tutor",
      description: "Work through units with your personal AI tutor. Ask questions, get explanations, and practice at your own pace.",
      icon: Brain,
    },
    {
      step: "04",
      title: "Track & Advance",
      description: "Complete unit quizzes to unlock the next level. Parents monitor progress from their dashboard.",
      icon: BarChart3,
    },
  ];

  const TESTIMONIALS = [
    {
      name: "Maria G.",
      role: "Parent, Houston TX",
      text: "My daughter went from a C to an A in Algebra I in just 6 weeks. The parent dashboard lets me see exactly what she's working on every day.",
      stars: 5,
    },
    {
      name: "James T.",
      role: "Grade 9 Student",
      text: "The AI tutor explains things way better than my textbook. I can ask the same question 10 times and it never makes me feel bad about it.",
      stars: 5,
    },
    {
      name: "Dr. Sandra K.",
      role: "High School Math Teacher",
      text: "I recommend EduChamp to all my students who need extra support. The placement test is genuinely accurate and the curriculum is well-aligned to TEKS.",
      stars: 5,
    },
  ];

  const FAQS = [
    {
      q: "Can a student sign up without a parent?",
      a: "Yes! Students can create an account independently. During onboarding, they can invite a parent or guardian via email. Parent approval unlocks subscription features and progress monitoring, but students can start learning right away.",
    },
    {
      q: "What courses are available?",
      a: "EduChamp currently offers Algebra I (TEKS-aligned), AP Calculus BC, AP Statistics, AP Chemistry, AP Literature, AP Physics, AP Biology, AP Business with Personal Finance, SAT Prep, and more. New courses are added regularly.",
    },
    {
      q: "What is the placement test and why is it required?",
      a: "The placement test is a 30-question diagnostic that identifies exactly where each student is in the curriculum. This ensures learning starts at the right level — not repeating content they already know, and not skipping concepts they need. It takes about 20–30 minutes.",
    },
    {
      q: "How does the parent dashboard work?",
      a: "Parents get a dedicated dashboard showing their child's mastery scores, quiz performance, unit completion, and AI tutor activity. They receive weekly progress reports and can view detailed breakdowns of each skill area.",
    },
    {
      q: "Is EduChamp aligned with school standards?",
      a: "Yes. All courses are aligned with the relevant standards — TEKS for Texas students, College Board standards for AP courses, and College Board SAT standards for SAT Prep. The curriculum is reviewed regularly to stay current.",
    },
    {
      q: "Can I use EduChamp on a phone or tablet?",
      a: "EduChamp is fully responsive and works on any device — desktop, tablet, or smartphone. The AI tutor, quizzes, and progress dashboard all work seamlessly on mobile.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow">
              <GraduationCap className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900">EduChamp</span>
          </div>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#courses" className="hover:text-indigo-600 transition-colors">Courses</a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How It Works</a>
            <a href="#faq" className="hover:text-indigo-600 transition-colors">FAQ</a>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleSignIn}>Sign In</Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => handleSignUp("student")}>
              Sign Up Free
            </Button>
          </div>
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-3">
            {["features", "courses", "how-it-works", "faq"].map(id => (
              <a
                key={id}
                href={`#${id}`}
                className="block text-sm font-medium text-slate-600 hover:text-indigo-600 capitalize"
                onClick={() => setMobileMenuOpen(false)}
              >
                {id.replace("-", " ")}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={handleSignIn}>Sign In</Button>
              <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => handleSignUp("student")}>Sign Up</Button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-white">
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-3xl" />
        </div>
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-sm text-indigo-200 mb-6 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Learning Platform
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6">
              Master Any Subject
              <span className="block text-indigo-300">with Your Personal AI Tutor</span>
            </h1>
            <p className="text-lg sm:text-xl text-indigo-100 mb-8 leading-relaxed max-w-2xl">
              EduChamp combines adaptive diagnostics, structured curriculum, and an always-available AI tutor to help students achieve mastery — while giving parents real-time visibility into every step.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <Button
                size="lg"
                className="bg-white text-indigo-900 hover:bg-indigo-50 font-semibold shadow-lg hover:shadow-xl transition-all active:scale-[0.97] h-12 px-8"
                onClick={() => handleSignUp("student")}
              >
                <GraduationCap className="h-5 w-5 mr-2" />
                Start Learning Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 h-12 px-8 backdrop-blur-sm"
                onClick={() => handleSignUp("parent")}
              >
                <Users className="h-5 w-5 mr-2" />
                I'm a Parent
              </Button>
            </div>
            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-indigo-200">
              {[
                "No credit card required",
                "TEKS & AP aligned",
                "Works on any device",
              ].map(item => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: 15, suffix: "+", label: "Courses Available" },
              { value: 30, suffix: "", label: "Questions per Diagnostic" },
              { value: 8, suffix: " Units", label: "per Course" },
              { value: 100, suffix: "%", label: "AI-Powered" },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-white">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-indigo-300 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 md:py-28 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-indigo-100 text-indigo-700 border-indigo-200">Platform Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Everything a student needs to succeed
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              EduChamp brings together the best of adaptive learning, AI tutoring, and parent engagement in one platform.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${feature.color} mb-4`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Courses ─────────────────────────────────────────────────────────── */}
      <section id="courses" className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-violet-100 text-violet-700 border-violet-200">Course Catalogue</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Courses for every learner
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From foundational Algebra I to AP-level subjects and SAT prep — each course has a full diagnostic, structured units, and an AI tutor.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {COURSES.map(course => (
              <div
                key={course.name}
                className="group rounded-2xl border border-slate-100 bg-slate-50 p-5 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                onClick={() => handleSignUp("student")}
              >
                <div className={`inline-flex items-center justify-center h-10 w-10 rounded-xl ${course.color} text-white mb-3 shadow-sm`}>
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="text-xs font-medium text-slate-400 mb-1">{course.badge}</div>
                <div className="font-semibold text-slate-800 text-sm leading-tight">{course.name}</div>
                <div className="mt-2 flex items-center gap-1 text-xs text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Start learning <ChevronRight className="h-3 w-3" />
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" className="gap-2" onClick={() => handleSignUp("student")}>
              View all courses <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 md:py-28 bg-gradient-to-br from-indigo-950 to-violet-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-white/10 text-indigo-200 border-white/20">How It Works</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              From sign-up to mastery in 4 steps
            </h2>
            <p className="text-lg text-indigo-200 max-w-2xl mx-auto">
              EduChamp is designed to get students learning as quickly as possible, with parents informed every step of the way.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.step} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-white/20 z-0" style={{ width: "calc(100% - 2rem)" }} />
                )}
                <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-colors">
                  <div className="text-4xl font-black text-white/20 mb-3">{step.step}</div>
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/30 flex items-center justify-center mb-4">
                    <step.icon className="h-5 w-5 text-indigo-200" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-indigo-200 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Button
              size="lg"
              className="bg-white text-indigo-900 hover:bg-indigo-50 font-semibold shadow-lg h-12 px-8 active:scale-[0.97] transition-all"
              onClick={() => handleSignUp("student")}
            >
              Get Started Free <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-amber-100 text-amber-700 border-amber-200">Testimonials</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Trusted by students and parents
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Parents ─────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-rose-100 text-rose-700 border-rose-200">For Parents</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                Stay connected to your child's learning
              </h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                EduChamp gives parents a dedicated dashboard with real-time visibility into every aspect of their child's learning journey — without interrupting the student experience.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Weekly progress reports delivered to your inbox",
                  "Real-time mastery scores and quiz performance",
                  "AI tutor conversation summaries",
                  "Unit completion and learning streak tracking",
                  "Approve and manage subscription from your dashboard",
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                onClick={() => handleSignUp("parent")}
              >
                <Users className="h-4 w-4" />
                Create Parent Account
              </Button>
            </div>
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-slate-900">Parent Dashboard</div>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Live</Badge>
              </div>
              {/* Mock dashboard preview */}
              {[
                { label: "Algebra I Progress", value: 72, color: "bg-indigo-500" },
                { label: "AP Statistics", value: 45, color: "bg-violet-500" },
                { label: "SAT Prep", value: 88, color: "bg-emerald-500" },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-700">{item.label}</span>
                    <span className="font-semibold text-slate-900">{item.value}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-1000`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-500 mb-2">Recent Activity</div>
                {[
                  { text: "Completed Unit 3 Quiz — 92%", time: "2h ago", color: "bg-emerald-400" },
                  { text: "AI Tutor session — 45 min", time: "Yesterday", color: "bg-indigo-400" },
                  { text: "Unlocked Unit 4: Systems of Equations", time: "2 days ago", color: "bg-violet-400" },
                ].map(item => (
                  <div key={item.text} className="flex items-center gap-2 py-1.5">
                    <div className={`h-2 w-2 rounded-full ${item.color} shrink-0`} />
                    <div className="flex-1 text-xs text-slate-700">{item.text}</div>
                    <div className="text-xs text-slate-400 shrink-0">{item.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 md:py-28 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-teal-100 text-teal-700 border-teal-200">FAQ</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Frequently asked questions
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-slate-900 text-sm">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-500 shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter ──────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-indigo-950 to-violet-950 text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 border border-white/20 mb-6">
            <Mail className="h-7 w-7 text-indigo-200" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Stay updated with EduChamp
          </h2>
          <p className="text-indigo-200 mb-8 text-lg">
            Get the latest course releases, learning tips, and platform updates delivered to your inbox.
          </p>
          {newsletterDone ? (
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-6 py-3 text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              <span>You're subscribed! Check your inbox for a confirmation.</span>
            </div>
          ) : (
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={newsletterName}
                  onChange={e => setNewsletterName(e.target.value)}
                  className="flex-1 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 backdrop-blur-sm"
                />
                <input
                  type="email"
                  placeholder="Your email address"
                  value={newsletterEmail}
                  onChange={e => setNewsletterEmail(e.target.value)}
                  required
                  className="flex-1 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 backdrop-blur-sm"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="bg-white text-indigo-900 hover:bg-indigo-50 font-semibold h-12 px-8 active:scale-[0.97] transition-all"
                disabled={newsletterLoading}
              >
                {newsletterLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Subscribe to Updates
              </Button>
              <p className="text-xs text-indigo-400">No spam. Unsubscribe at any time.</p>
            </form>
          )}
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────────────── */}
      <section className="py-16 bg-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to start learning?
          </h2>
          <p className="text-indigo-200 mb-8 text-lg">
            Join EduChamp today — free to start, no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-white text-indigo-900 hover:bg-indigo-50 font-semibold h-12 px-8 active:scale-[0.97] transition-all"
              onClick={() => handleSignUp("student")}
            >
              <GraduationCap className="h-5 w-5 mr-2" />
              Sign Up as Student
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10 h-12 px-8"
              onClick={() => handleSignUp("parent")}
            >
              <Users className="h-5 w-5 mr-2" />
              Sign Up as Parent
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-white">EduChamp</span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#courses" className="hover:text-white transition-colors">Courses</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              <button onClick={() => navigate("/join")} className="hover:text-white transition-colors">Sign Up</button>
            </div>
            <div className="text-xs">
              © {new Date().getFullYear()} EduChamp. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* AI Chatbot */}
      <LandingChatbot />
    </div>
  );
}
