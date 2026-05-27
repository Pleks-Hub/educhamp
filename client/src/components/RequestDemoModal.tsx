/**
 * RequestDemoModal — ISD/School lead capture form
 * Multi-step, mobile-friendly, branded with EduChamp colours.
 * Submits to landing.submitDemoRequest and shows a confirmation screen.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Building2, User, Mail, Phone, Users, BookOpen, GraduationCap,
  Calendar, MessageSquare, CheckCircle2, ChevronRight, ChevronLeft,
  Sparkles, X
} from "lucide-react";

interface RequestDemoModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-select an interest type (e.g. "demo", "district_license") */
  defaultInterest?: string;
}

const GRADE_OPTIONS = [
  "Pre-K", "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
  "Grade 11", "Grade 12", "AP Courses", "SAT Prep",
];

const SUBJECT_OPTIONS = [
  "Mathematics", "Algebra I", "Algebra II", "Geometry", "Pre-Calculus",
  "AP Calculus BC", "AP Statistics", "English Language Arts", "AP Literature",
  "Science", "AP Biology", "AP Chemistry", "AP Physics",
  "Social Studies", "AP Human Geography", "AP Business",
  "SAT Prep", "All Subjects",
];

const INTEREST_OPTIONS = [
  { value: "demo", label: "Product Demo", icon: "🎯" },
  { value: "pilot", label: "Pilot Program", icon: "🚀" },
  { value: "district_license", label: "District License", icon: "🏫" },
  { value: "campus_license", label: "Campus License", icon: "🏛️" },
  { value: "partnership", label: "Partnership", icon: "🤝" },
  { value: "curriculum_licensing", label: "Curriculum Licensing", icon: "📚" },
  { value: "other", label: "General Inquiry", icon: "💬" },
];

const TIME_OPTIONS = [
  "Morning (8am – 12pm)",
  "Afternoon (12pm – 5pm)",
  "Evening (5pm – 8pm)",
  "Flexible / Any time",
  "Weekends only",
];

type Step = 1 | 2 | 3;

interface FormData {
  fullName: string;
  schoolName: string;
  roleTitle: string;
  email: string;
  phone: string;
  numStudents: string;
  gradeLevels: string[];
  subjects: string[];
  challenges: string;
  interestType: string;
  preferredTime: string;
  notes: string;
}

const EMPTY_FORM: FormData = {
  fullName: "",
  schoolName: "",
  roleTitle: "",
  email: "",
  phone: "",
  numStudents: "",
  gradeLevels: [],
  subjects: [],
  challenges: "",
  interestType: "demo",
  preferredTime: "",
  notes: "",
};

function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
}

export function RequestDemoModal({ open, onClose, defaultInterest }: RequestDemoModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM, interestType: defaultInterest ?? "demo" });
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.landing.submitDemoRequest.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error(err.message ?? "Something went wrong. Please try again.");
    },
  });

  function handleClose() {
    onClose();
    // Reset after animation
    setTimeout(() => {
      setStep(1);
      setForm({ ...EMPTY_FORM, interestType: defaultInterest ?? "demo" });
      setSubmitted(false);
    }, 300);
  }

  function set(field: keyof FormData, value: string | string[]) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function step1Valid() {
    return form.fullName.trim().length >= 2
      && form.schoolName.trim().length >= 2
      && form.roleTitle.trim().length >= 2
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  }

  function step2Valid() {
    return form.interestType !== "";
  }

  async function handleSubmit() {
    submitMutation.mutate({
      fullName: form.fullName.trim(),
      schoolName: form.schoolName.trim(),
      roleTitle: form.roleTitle.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      numStudents: form.numStudents.trim() || undefined,
      gradeLevels: form.gradeLevels.length > 0 ? form.gradeLevels : undefined,
      subjects: form.subjects.length > 0 ? form.subjects : undefined,
      challenges: form.challenges.trim() || undefined,
      interestType: form.interestType as "demo" | "pilot" | "district_license" | "campus_license" | "partnership" | "curriculum_licensing" | "other",
      preferredTime: form.preferredTime || undefined,
      notes: form.notes.trim() || undefined,
    });
  }

  const stepTitles: Record<Step, string> = {
    1: "Your Contact Information",
    2: "Tell Us About Your School",
    3: "Engagement Details",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Branded header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg leading-tight">Request a Demo</h2>
                <p className="text-white/80 text-sm">EduChamp for Schools &amp; Districts</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step indicator */}
          {!submitted && (
            <div className="flex items-center gap-2 mt-4">
              {([1, 2, 3] as Step[]).map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s ? "bg-white text-indigo-600" :
                    step > s ? "bg-white/40 text-white" : "bg-white/20 text-white/60"
                  }`}>
                    {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                  </div>
                  {s < 3 && <div className={`h-0.5 w-8 rounded ${step > s ? "bg-white/60" : "bg-white/20"}`} />}
                </div>
              ))}
              <span className="ml-2 text-white/80 text-sm">{stepTitles[step]}</span>
            </div>
          )}
        </div>

        <div className="p-6">
          {/* ── Success screen ── */}
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Request Received!</h3>
              <p className="text-slate-600 mb-2">
                Thank you, <strong>{form.fullName}</strong>. We've received your inquiry for <strong>{form.schoolName}</strong>.
              </p>
              <p className="text-slate-500 text-sm mb-6">
                A confirmation has been sent to <strong>{form.email}</strong>. Our team will reach out within 1–2 business days.
              </p>
              <Button onClick={handleClose} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Close
              </Button>
            </div>
          ) : (
            <>
              {/* ── Step 1: Contact info ── */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="flex items-center gap-1.5 text-sm font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" /> Full Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="fullName"
                        placeholder="Dr. Jane Smith"
                        value={form.fullName}
                        onChange={e => set("fullName", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="roleTitle" className="flex items-center gap-1.5 text-sm font-medium">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" /> Role / Title <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="roleTitle"
                        placeholder="Superintendent, Principal, Curriculum Director…"
                        value={form.roleTitle}
                        onChange={e => set("roleTitle", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="schoolName" className="flex items-center gap-1.5 text-sm font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" /> School or ISD Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="schoolName"
                      placeholder="Houston Independent School District"
                      value={form.schoolName}
                      onChange={e => set("schoolName", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="flex items-center gap-1.5 text-sm font-medium">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="jsmith@hisd.edu"
                        value={form.email}
                        onChange={e => set("email", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="flex items-center gap-1.5 text-sm font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(713) 555-0100"
                        value={form.phone}
                        onChange={e => set("phone", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: School details ── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> Number of Students
                      </Label>
                      <Select value={form.numStudents} onValueChange={v => set("numStudents", v)}>
                        <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-50">1 – 50</SelectItem>
                          <SelectItem value="51-200">51 – 200</SelectItem>
                          <SelectItem value="201-500">201 – 500</SelectItem>
                          <SelectItem value="501-1000">501 – 1,000</SelectItem>
                          <SelectItem value="1001-5000">1,001 – 5,000</SelectItem>
                          <SelectItem value="5001-10000">5,001 – 10,000</SelectItem>
                          <SelectItem value="10000+">10,000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" /> Interest Type <span className="text-red-500">*</span>
                      </Label>
                      <Select value={form.interestType} onValueChange={v => set("interestType", v)}>
                        <SelectTrigger><SelectValue placeholder="Select interest" /></SelectTrigger>
                        <SelectContent>
                          {INTEREST_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.icon} {o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Grade Levels <span className="text-slate-400 font-normal">(select all that apply)</span></Label>
                    <div className="flex flex-wrap gap-2">
                      {GRADE_OPTIONS.map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => set("gradeLevels", toggleItem(form.gradeLevels, g))}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                            form.gradeLevels.includes(g)
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Subjects of Interest <span className="text-slate-400 font-normal">(select all that apply)</span></Label>
                    <div className="flex flex-wrap gap-2">
                      {SUBJECT_OPTIONS.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => set("subjects", toggleItem(form.subjects, s))}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                            form.subjects.includes(s)
                              ? "bg-purple-600 text-white border-purple-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-purple-300"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: Engagement details ── */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Current Learning Challenges
                    </Label>
                    <Textarea
                      placeholder="Describe the key challenges your students or district are facing that EduChamp could help address…"
                      value={form.challenges}
                      onChange={e => set("challenges", e.target.value)}
                      rows={3}
                      maxLength={2000}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Preferred Meeting Time
                    </Label>
                    <Select value={form.preferredTime} onValueChange={v => set("preferredTime", v)}>
                      <SelectTrigger><SelectValue placeholder="Select preferred time" /></SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Additional Notes or Requirements</Label>
                    <Textarea
                      placeholder="Any other details, questions, or specific requirements you'd like us to know…"
                      value={form.notes}
                      onChange={e => set("notes", e.target.value)}
                      rows={3}
                      maxLength={2000}
                    />
                  </div>

                  {/* Summary preview */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-sm space-y-1.5">
                    <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-2">Request Summary</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600">
                      <span className="font-medium">Name:</span><span>{form.fullName}</span>
                      <span className="font-medium">School:</span><span>{form.schoolName}</span>
                      <span className="font-medium">Role:</span><span>{form.roleTitle}</span>
                      <span className="font-medium">Email:</span><span className="truncate">{form.email}</span>
                      <span className="font-medium">Interest:</span>
                      <span>{INTEREST_OPTIONS.find(o => o.value === form.interestType)?.label ?? form.interestType}</span>
                      {form.numStudents && <><span className="font-medium">Students:</span><span>{form.numStudents}</span></>}
                    </div>
                    {form.gradeLevels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {form.gradeLevels.map(g => <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => step > 1 ? setStep((step - 1) as Step) : handleClose()}
                  className="gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {step === 1 ? "Cancel" : "Back"}
                </Button>

                {step < 3 ? (
                  <Button
                    onClick={() => setStep((step + 1) as Step)}
                    disabled={step === 1 ? !step1Valid() : !step2Valid()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white gap-1.5 min-w-[140px]"
                  >
                    {submitMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting…
                      </span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Submit Request
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
