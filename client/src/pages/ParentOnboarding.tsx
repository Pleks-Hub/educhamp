import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  GraduationCap, MapPin, User, Target, Sparkles, CheckCircle2,
  ArrowRight, ArrowLeft, Loader2
} from "lucide-react";

const GOAL_CATEGORIES = [
  { value: "grade_improvement", label: "Grade Improvement", desc: "Help my child get better grades in their courses" },
  { value: "test_prep", label: "Test Preparation", desc: "Prepare for STAAR, SAT, or ACT exams" },
  { value: "enrichment", label: "Enrichment", desc: "Go beyond the classroom with advanced content" },
  { value: "remediation", label: "Remediation", desc: "Fill learning gaps and catch up on missed concepts" },
  { value: "homeschool_supplement", label: "Homeschool Supplement", desc: "Structured curriculum for home education (Grades 3–12 & AP)" },
  { value: "other", label: "Other", desc: "Another reason not listed above" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
];

export default function ParentOnboarding() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Retrieve plan + billing period chosen on the landing page
  const selectedPlan = sessionStorage.getItem("educhamp_selected_plan") ?? null;
  const billingPeriod = (sessionStorage.getItem("educhamp_billing_period") ?? "monthly") as "monthly" | "annual";

  // Parent invite token from URL (student invited this parent)
  const params = new URLSearchParams(search);
  const parentInviteToken = params.get("parentInvite") ?? "";
  const parentInviteLookup = trpc.onboarding.lookupParentInvite.useQuery(
    { token: parentInviteToken },
    { enabled: !!parentInviteToken }
  );
  const acceptParentInvite = trpc.onboarding.acceptParentInvite.useMutation();

  // Step 1: Demographics
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  // Step 2: Goal
  const [goalCategory, setGoalCategory] = useState("");
  const [signupReason, setSignupReason] = useState("");

  // Step 3: AI result
  const [goalDetail, setGoalDetail] = useState("");
  const [childName, setChildName] = useState("");

  const saveProfile = trpc.onboarding.saveParentProfile.useMutation();
  const generateGoal = trpc.onboarding.generateGoalAlignment.useMutation();
  const completeOnboarding = trpc.onboarding.completeOnboarding.useMutation();

  async function handleStep1() {
    await saveProfile.mutateAsync({ city, state, gender, dateOfBirth });
    setStep(2);
  }

  async function handleStep2() {
    if (!goalCategory) { toast.error("Please select a goal category."); return; }
    if (!signupReason.trim()) { toast.error("Please describe your goal."); return; }
    try {
      const result = await generateGoal.mutateAsync({
        parentSignupReason: signupReason,
        parentGoalCategory: goalCategory,
        childName: childName || undefined,
      });
      setGoalDetail(result.goalDetail);
      setStep(3);
    } catch {
      toast.error("Failed to generate goal. Please try again.");
    }
  }

  async function handleFinish() {
    if (parentInviteToken && parentInviteLookup.data?.valid) {
      try {
        await acceptParentInvite.mutateAsync({ token: parentInviteToken });
        toast.success("Your account has been linked to your student!");
      } catch {
        // Non-fatal: continue even if linking fails
      }
    }
    await completeOnboarding.mutateAsync();
    toast.success("Welcome to EduChamp! Let's get started.");
    navigate("/");
  }

  const progress = ((step - 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to EduChamp</h1>
          <p className="text-slate-500 mt-1">Let's set up your parent account in a few quick steps.</p>
          {/* Plan + billing context pill */}
          {selectedPlan && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full px-3 py-1 text-xs font-semibold">
              <CheckCircle2 className="h-3 w-3" />
              {selectedPlan}
              {billingPeriod === "annual" ? " — Annual billing (save 20%)" : " — Monthly billing"}
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step 1: Demographics */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle>Your Location</CardTitle>
              </div>
              <CardDescription>Help us personalise your experience (all optional).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City</Label>
                  <Input placeholder="e.g. Houston" value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div>
                  <Label>State</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Gender <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non_binary">Non-binary</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date of Birth <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                </div>
              </div>
              <Button className="w-full" onClick={handleStep1} disabled={saveProfile.isPending}>
                {saveProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="ghost" className="w-full text-sm" onClick={() => setStep(2)}>
                Skip for now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Goal */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle>Your Goal for Your Child</CardTitle>
              </div>
              <CardDescription>This helps our AI tutor align its approach to what matters most to you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Child's first name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input placeholder="e.g. Emma" value={childName} onChange={e => setChildName(e.target.value)} />
              </div>
              <div>
                <Label>Primary Goal</Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {GOAL_CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setGoalCategory(cat.value)}
                      className={`text-left p-3 rounded-lg border-2 transition-all ${
                        goalCategory === cat.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="font-medium text-sm">{cat.label}</div>
                      <div className="text-xs text-muted-foreground">{cat.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Tell us more about your goal</Label>
                <Textarea
                  placeholder="e.g. My daughter is struggling with linear equations and I want her to pass the STAAR test in May..."
                  value={signupReason}
                  onChange={e => setSignupReason(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button className="flex-1" onClick={handleStep2} disabled={generateGoal.isPending}>
                  {generateGoal.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating…</>
                    : <><Sparkles className="h-4 w-4 mr-2" /> Generate My Plan</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: AI Goal Result */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <CardTitle>Your Personalised Learning Plan</CardTitle>
              </div>
              <CardDescription>Our AI has created a goal-aligned plan based on what you shared.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-gradient-to-br from-primary/5 to-blue-50 border border-primary/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 mb-1">EduChamp AI says:</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{goalDetail}</p>
                  </div>
                </div>
              </div>

              {parentInviteToken && parentInviteLookup.data?.valid && (
                <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
                  <div className="flex items-center gap-2 text-indigo-800 text-sm font-medium mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Student Invite Detected
                  </div>
                  <p className="text-xs text-indigo-700">
                    Your student invited you to join EduChamp. When you click "Get Started", your accounts will be linked automatically.
                  </p>
                </div>
              )}
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <div className="flex items-center gap-2 text-emerald-800 text-sm font-medium mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  What happens next
                </div>
                <ul className="text-xs text-emerald-700 space-y-1 ml-6 list-disc">
                  {parentInviteToken && parentInviteLookup.data?.valid ? (
                    <>
                      <li>Your account will be linked to your student automatically</li>
                      <li>The AI tutor will align its approach to your stated goal</li>
                      <li>Track your student's progress in real-time from your dashboard</li>
                    </>
                  ) : (
                    <>
                      <li>Add your child using the Parent Dashboard</li>
                      <li>Your child receives a secure invite link to join</li>
                      <li>The AI tutor will align its approach to your stated goal</li>
                      <li>Track progress in real-time from your dashboard</li>
                    </>
                  )}
                </ul>
              </div>

              <Button className="w-full" onClick={handleFinish} disabled={completeOnboarding.isPending}>
                {completeOnboarding.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
