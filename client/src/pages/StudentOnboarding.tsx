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
  GraduationCap, School, MapPin, CheckCircle2,
  ArrowRight, ArrowLeft, Loader2, UserCheck, AlertCircle
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
  const totalSteps = 2;

  // Invite token from URL
  const params = new URLSearchParams(search);
  const inviteToken = params.get("invite") ?? "";

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

  const progress = ((step - 1) / totalSteps) * 100;
  const inviteInfo = inviteLookup.data?.invite;

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

        {/* Step 2: Confirm & Finish */}
        {step === 2 && (
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
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                    Take the placement diagnostic to find your starting point
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                    Work through units at your own pace with the AI tutor
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                    Take unit quizzes to unlock the next level
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                    Your parent can track your progress from their dashboard
                  </li>
                </ul>
              </div>

              {inviteInfo && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
                  <div className="font-medium flex items-center gap-1 mb-1">
                    <UserCheck className="h-4 w-4" /> Linked to parent account
                  </div>
                  Your account will be linked to your parent's EduChamp account so they can track your progress.
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
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
