import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  GraduationCap, School, CheckCircle2, Mail, Phone,
  ArrowRight, ArrowLeft, Loader2, UserCheck, AlertCircle,
  Users, Copy, Share2,
} from "lucide-react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
];

const SCHOOL_TYPES = [
  { value: "public", label: "Public School", icon: "🏫" },
  { value: "private", label: "Private School", icon: "🎓" },
  { value: "charter", label: "Charter School", icon: "📚" },
  { value: "homeschool", label: "Home School", icon: "🏠" },
  { value: "other", label: "Other", icon: "📖" },
];

const GRADE_LEVELS = [
  { value: "Kindergarten", label: "Kindergarten" },
  { value: "Grade 1", label: "Grade 1" },
  { value: "Grade 2", label: "Grade 2" },
  { value: "Grade 3", label: "Grade 3" },
  { value: "Grade 4", label: "Grade 4" },
  { value: "Grade 5", label: "Grade 5" },
  { value: "Grade 6", label: "Grade 6" },
  { value: "Grade 7", label: "Grade 7" },
  { value: "Grade 8", label: "Grade 8" },
  { value: "Grade 9", label: "Grade 9" },
  { value: "Grade 10", label: "Grade 10" },
  { value: "Grade 11", label: "Grade 11" },
  { value: "Grade 12", label: "Grade 12" },
];

export default function StudentOnboarding() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Invite token from URL (parent-issued invite for student)
  const params = new URLSearchParams(search);
  const inviteToken = params.get("invite") ?? "";

  // Step 2: Parent invite
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentInviteResult, setParentInviteResult] = useState<{ inviteUrl: string; token: string } | null>(null);
  const [parentInviteSent, setParentInviteSent] = useState(false);

  // Step 1: School info
  const [schoolType, setSchoolType] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolDistrict, setSchoolDistrict] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");

  // Invite lookup
  const inviteLookup = trpc.onboarding.lookupStudentInvite.useQuery(
    { token: inviteToken },
    { enabled: !!inviteToken }
  );

  // Pre-fill grade from invite token when it loads
  useEffect(() => {
    const inviteGrade = inviteLookup.data?.invite?.childGrade;
    if (inviteGrade && !gradeLevel) {
      setGradeLevel(inviteGrade);
    }
  }, [inviteLookup.data]);

  const saveProfile = trpc.onboarding.saveStudentProfile.useMutation();
  const acceptInvite = trpc.onboarding.acceptStudentInvite.useMutation();
  const completeOnboarding = trpc.onboarding.completeOnboarding.useMutation();
  const inviteParent = trpc.onboarding.inviteParent.useMutation();

  async function handleStep1() {
    await saveProfile.mutateAsync({
      schoolType: schoolType as any,
      schoolName: schoolName || undefined,
      schoolDistrict: schoolDistrict || undefined,
      gradeLevel: gradeLevel || undefined,
      city: city || undefined,
      state: state || undefined,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined,
    });
    setStep(2);
  }

  async function handleSendParentInvite() {
    if (!parentEmail && !parentPhone) {
      toast.error("Please enter your parent's email or phone number.");
      return;
    }
    try {
      const result = await inviteParent.mutateAsync({
        parentName: parentName || undefined,
        parentEmail: parentEmail || undefined,
        parentPhone: parentPhone || undefined,
        origin: window.location.origin,
      });
      setParentInviteResult(result);
      setParentInviteSent(true);
      toast.success("Invitation sent! Your parent will receive a link to join EduChamp.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send invite. Please try again.");
    }
  }

  async function handleFinish() {
    try {
      if (inviteToken && inviteLookup.data?.valid) {
        await acceptInvite.mutateAsync({ token: inviteToken });
      }
      await completeOnboarding.mutateAsync();
      toast.success("Welcome to EduChamp! Your account is ready.");
      navigate("/");
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong. Please try again.");
    }
  }

  const inviteInfo = inviteLookup.data?.invite;

  const progress = ((step - 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white mb-4 shadow-lg">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to EduChamp!</h1>
          {inviteInfo ? (
            <div className="mt-2 flex items-center justify-center gap-2">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                <UserCheck className="h-3 w-3 mr-1" />
                Invited by your parent
              </Badge>
            </div>
          ) : (
            <p className="text-slate-500 mt-1">Let's set up your student profile.</p>
          )}
        </div>

        {/* Invite banner */}
        {inviteToken && inviteLookup.data && !inviteLookup.data.valid && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800">
              <span className="font-medium">Invite link issue: </span>
              {inviteLookup.data.reason === "expired"
                ? "This invite link has expired. Ask your parent to send a new one."
                : "This invite link is no longer valid."}
            </div>
          </div>
        )}

        {inviteInfo && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-sm text-emerald-800">
              <span className="font-medium">
                {inviteInfo.childName ? `Hi ${inviteInfo.childName}! ` : ""}
              </span>
              Your parent has invited you to join EduChamp. Complete your profile to get started.
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step 1: School & Demographics */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <School className="h-5 w-5 text-indigo-600" />
                <CardTitle>Your School Info</CardTitle>
              </div>
              <CardDescription>Help us personalise your Algebra I experience.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>School Type</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 sm:grid-cols-3">
                  {SCHOOL_TYPES.map(st => (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => setSchoolType(st.value)}
                      className={`text-left p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                        schoolType === st.value
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-border hover:border-indigo-300"
                      }`}
                    >
                      <span className="text-lg">{st.icon}</span>
                      <span className="text-xs font-medium">{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {schoolType && schoolType !== "homeschool" && (
                <>
                  <div>
                    <Label>School Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input placeholder="e.g. Katy High School" value={schoolName} onChange={e => setSchoolName(e.target.value)} />
                  </div>
                  <div>
                    <Label>School District <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input placeholder="e.g. Katy ISD" value={schoolDistrict} onChange={e => setSchoolDistrict(e.target.value)} />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Grade Level</Label>
                  <Select value={gradeLevel} onValueChange={setGradeLevel}>
                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVELS.map(g => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label>City <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input placeholder="e.g. Katy" value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div>
                  <Label>Date of Birth <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                </div>
              </div>

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

              <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleStep1} disabled={saveProfile.isPending}>
                {saveProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="ghost" className="w-full text-sm" onClick={() => setStep(2)}>
                Skip for now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Invite Parent */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <CardTitle>Invite Your Parent or Guardian</CardTitle>
              </div>
              <CardDescription>
                Connect a parent or guardian so they can track your progress, approve your subscription, and support your learning journey.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4 space-y-2">
                <p className="text-sm font-semibold text-indigo-900">Why connect a parent?</p>
                <ul className="text-sm text-indigo-800 space-y-1.5">
                  {[
                    "They can monitor your progress and quiz scores",
                    "They can approve and manage your subscription",
                    "They receive weekly progress reports",
                    "They can communicate with your AI tutor for parent-level insights",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {inviteInfo && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 shrink-0" />
                  <span>Your parent has already invited you — your accounts will be linked automatically.</span>
                </div>
              )}

              {!inviteInfo && !parentInviteSent && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Parent's Name <span className="text-muted-foreground text-xs">(optional)</span></label>
                    <input
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="e.g. Jane Smith"
                      value={parentName}
                      onChange={e => setParentName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> Parent's Email
                    </label>
                    <input
                      type="email"
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="parent@example.com"
                      value={parentEmail}
                      onChange={e => setParentEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> Parent's Phone <span className="text-muted-foreground text-xs">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="+1 (555) 000-0000"
                      value={parentPhone}
                      onChange={e => setParentPhone(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
                    onClick={handleSendParentInvite}
                    disabled={inviteParent.isPending}
                  >
                    {inviteParent.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    Send Parent Invitation
                  </Button>
                </div>
              )}

              {parentInviteSent && parentInviteResult && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Invitation created!
                  </div>
                  <p className="text-xs text-emerald-700">
                    Share this link with your parent. They can sign up and link their account to yours.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 text-xs bg-white border rounded px-2 py-1.5 truncate text-slate-700">
                      {parentInviteResult.inviteUrl}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1"
                      onClick={() => {
                        navigator.clipboard.writeText(parentInviteResult.inviteUrl);
                        toast.success("Link copied!");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 gap-1">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-1"
                  onClick={() => setStep(3)}
                >
                  {parentInviteSent || inviteInfo ? "Continue" : "Skip for now"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Confirm & Finish */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <CardTitle>You're all set!</CardTitle>
              </div>
              <CardDescription>Your profile is ready. Here's what you can do next.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-indigo-900">Getting started with EduChamp</h3>
                <ul className="text-sm text-indigo-800 space-y-1.5">
                  {[
                    "Take the placement diagnostic to find your starting point",
                    "Work through units at your own pace with the AI tutor",
                    "Take unit quizzes to unlock the next level",
                    "Your parent can track your progress from their dashboard",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {(inviteInfo || parentInviteSent) && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
                  <div className="font-medium flex items-center gap-1 mb-1">
                    <UserCheck className="h-4 w-4" /> Parent account connected
                  </div>
                  {inviteInfo
                    ? "Your account will be linked to your parent's EduChamp account so they can track your progress."
                    : "Your parent will receive an invitation to join and link their account."}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  onClick={handleFinish}
                  disabled={acceptInvite.isPending || completeOnboarding.isPending}
                >
                  {(acceptInvite.isPending || completeOnboarding.isPending)
                    ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Start Learning!
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
