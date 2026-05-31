import { useState, useEffect, useMemo } from "react";
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
  Users, Copy, Share2, ShieldAlert, Target, RefreshCw,
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
  { value: "Pre-K", label: "Pre-K", minAge: 3, maxAge: 5 },
  { value: "Kindergarten", label: "Kindergarten", minAge: 5, maxAge: 7 },
  { value: "Grade 1", label: "Grade 1", minAge: 6, maxAge: 8 },
  { value: "Grade 2", label: "Grade 2", minAge: 7, maxAge: 9 },
  { value: "Grade 3", label: "Grade 3", minAge: 8, maxAge: 10 },
  { value: "Grade 4", label: "Grade 4", minAge: 9, maxAge: 11 },
  { value: "Grade 5", label: "Grade 5", minAge: 10, maxAge: 12 },
  { value: "Grade 6", label: "Grade 6", minAge: 11, maxAge: 13 },
  { value: "Grade 7", label: "Grade 7", minAge: 12, maxAge: 14 },
  { value: "Grade 8", label: "Grade 8", minAge: 13, maxAge: 15 },
  { value: "Grade 9", label: "Grade 9", minAge: 14, maxAge: 16 },
  { value: "Grade 10", label: "Grade 10", minAge: 15, maxAge: 17 },
  { value: "Grade 11", label: "Grade 11", minAge: 16, maxAge: 18 },
  { value: "Grade 12", label: "Grade 12", minAge: 17, maxAge: 19 },
];

// Grades that require COPPA parental consent (≤ Grade 6, roughly age ≤ 12)
const COPPA_GRADES = new Set(["Pre-K", "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"]);

const STUDENT_GOALS = [
  { value: "improve_grades", label: "Improve my grades", desc: "I want to raise my GPA and perform better in class." },
  { value: "catch_up", label: "Catch up on missed content", desc: "I need to fill gaps from previous grades or missed lessons." },
  { value: "get_ahead", label: "Get ahead of my class", desc: "I want to learn content before it's taught in school." },
  { value: "exam_prep", label: "Prepare for exams", desc: "AP exams, SAT, ACT, or other standardised tests." },
  { value: "enrichment", label: "Explore new subjects", desc: "I'm curious and want to learn beyond my current curriculum." },
  { value: "other", label: "Other", desc: "Something else — I'll describe it." },
];

/** Calculate age in years from a date-of-birth string (YYYY-MM-DD) */
function calcAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** Suggest a grade level from age */
function suggestGradeFromAge(age: number): string {
  if (age <= 4) return "Pre-K";
  if (age === 5) return "Kindergarten";
  if (age === 6) return "Grade 1";
  if (age === 7) return "Grade 2";
  if (age === 8) return "Grade 3";
  if (age === 9) return "Grade 4";
  if (age === 10) return "Grade 5";
  if (age === 11) return "Grade 6";
  if (age === 12) return "Grade 7";
  if (age === 13) return "Grade 8";
  if (age === 14) return "Grade 9";
  if (age === 15) return "Grade 10";
  if (age === 16) return "Grade 11";
  return "Grade 12";
}

/** Check if a grade is age-appropriate (with ±2 year tolerance) */
function isGradeAgeAppropriate(grade: string, age: number): boolean {
  const entry = GRADE_LEVELS.find(g => g.value === grade);
  if (!entry) return true;
  return age >= entry.minAge - 2 && age <= entry.maxAge + 2;
}

export default function StudentOnboarding() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Retrieve plan + billing period chosen on the landing page
  const selectedPlan = sessionStorage.getItem("educhamp_selected_plan") ?? null;
  const billingPeriod = (sessionStorage.getItem("educhamp_billing_period") ?? "monthly") as "monthly" | "annual";

  // Invite token from URL (parent-issued invite for student)
  const params = new URLSearchParams(search);
  const inviteToken = params.get("invite") ?? "";

  // Step 2: Parent invite
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentInviteResult, setParentInviteResult] = useState<{ inviteUrl: string; token: string; isExistingUser?: boolean; emailSent?: boolean; expiresAt?: Date | string } | null>(null);
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
  const [studentGoal, setStudentGoal] = useState("");
  const [goalDetail, setGoalDetail] = useState("");

  // Derived age and under-16 gate
  const studentAge = useMemo(() => calcAge(dateOfBirth), [dateOfBirth]);
  const isUnder16 = studentAge !== null && studentAge < 16;
  const gradeSuggestion = useMemo(() => {
    if (studentAge !== null && !gradeLevel) return suggestGradeFromAge(studentAge);
    return null;
  }, [studentAge, gradeLevel]);
  const gradeAgeMismatch = useMemo(() => {
    if (!gradeLevel || studentAge === null) return false;
    return !isGradeAgeAppropriate(gradeLevel, studentAge);
  }, [gradeLevel, studentAge]);

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

  // Auto-suggest grade from age
  useEffect(() => {
    if (gradeSuggestion && !gradeLevel) {
      setGradeLevel(gradeSuggestion);
    }
  }, [gradeSuggestion]);

  // COPPA gate state
  const [coppaConsentEmail, setCoppaConsentEmail] = useState("");
  const [coppaConsentSent, setCoppaConsentSent] = useState(false);
  const [coppaEmailError, setCoppaEmailError] = useState("");

  // Whether this student's grade requires COPPA consent
  const requiresCoppaConsent = gradeLevel ? COPPA_GRADES.has(gradeLevel) : false;

  const saveProfile = trpc.onboarding.saveStudentProfile.useMutation();
  const acceptInvite = trpc.onboarding.acceptStudentInvite.useMutation();
  const completeOnboarding = trpc.onboarding.completeOnboarding.useMutation();
  const inviteParent = trpc.onboarding.inviteParent.useMutation();
  const requestCoppaConsent = trpc.coppa.requestConsent.useMutation({
    onSuccess: () => {
      setCoppaConsentSent(true);
      toast.success("Consent request sent! Ask your parent to check their email.");
    },
    onError: (err) => toast.error(err.message),
  });
  const resendParentInvite = trpc.onboarding.resendParentInvite.useMutation({
    onSuccess: (data) => {
      setParentInviteResult(data);
      toast.success("Invitation resent! A fresh link and email have been sent.");
    },
    onError: (err) => toast.error(err.message),
  });

  async function handleStep1() {
    // Mandatory: date of birth
    if (!dateOfBirth) {
      toast.error("Date of birth is required to personalise your learning path.");
      return;
    }
    if (!gradeLevel) {
      toast.error("Please select your grade level.");
      return;
    }
    if (gradeAgeMismatch) {
      toast.error("The selected grade level doesn't match your age. Please choose an age-appropriate grade.");
      return;
    }
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

  async function handleSendCoppaConsent() {
    setCoppaEmailError("");
    if (!coppaConsentEmail) {
      setCoppaEmailError("Please enter your parent or guardian's email address.");
      return;
    }
    // Validate parent email ≠ student email (COPPA requirement)
    if (user?.email && coppaConsentEmail.toLowerCase().trim() === user.email.toLowerCase().trim()) {
      setCoppaEmailError("The parent email must be different from your own login email.");
      return;
    }
    await requestCoppaConsent.mutateAsync({
      parentEmail: coppaConsentEmail.trim(),
      origin: window.location.origin,
    });
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
      if (result.isExistingUser) {
        toast.success("Your parent already has an EduChamp account! They'll see your request in their Parent Portal.");
      } else if (result.emailSent) {
        toast.success("Invitation email sent to your parent/guardian!");
      } else {
        toast.success("Invitation created! Share the link with your parent so they can join EduChamp.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send invite. Please try again.");
    }
  }

  async function handleFinish() {
    try {
      if (inviteToken && inviteLookup.data?.valid) {
        await acceptInvite.mutateAsync({ token: inviteToken });
      }
      const result = await completeOnboarding.mutateAsync();
      if (result?.autoEnrolledCourse) {
        toast.success(
          `Welcome to EduChamp! You've been enrolled in ${result.autoEnrolledCourse.title}. Let's get started!`,
          { duration: 5000 }
        );
      } else {
        toast.success("Welcome to EduChamp! Your account is ready.");
      }
      navigate("/");
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong. Please try again.");
    }
  }

  const inviteInfo = inviteLookup.data?.invite;
  const progress = ((step - 1) / totalSteps) * 100;

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
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
          {/* Plan + billing context pill */}
          {selectedPlan && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full px-3 py-1 text-xs font-semibold">
              <CheckCircle2 className="h-3 w-3" />
              {selectedPlan}
              {billingPeriod === "annual" ? " — Annual billing (save 20%)" : " — Monthly billing"}
            </div>
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
              <CardDescription>Help us personalise your learning experience across all your courses.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date of Birth — mandatory */}
              <div>
                <Label>
                  Date of Birth <span className="text-red-500">*</span>
                  <span className="text-muted-foreground text-xs ml-1">(required to personalise your path)</span>
                </Label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className={!dateOfBirth ? "border-amber-300" : ""}
                />
                {studentAge !== null && (
                  <p className="text-xs text-slate-500 mt-1">Age: {studentAge} years old</p>
                )}
              </div>

              {/* Under-16 warning */}
              {isUnder16 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-800">
                    <span className="font-medium">Parental consent required. </span>
                    Students under 16 must have a parent or guardian complete or approve their registration before accessing courses. You'll be asked to invite your parent in the next step.
                  </div>
                </div>
              )}

              {/* Grade Level */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>
                    Grade Level <span className="text-red-500">*</span>
                  </Label>
                  <Select value={gradeLevel} onValueChange={setGradeLevel}>
                    <SelectTrigger className={gradeAgeMismatch ? "border-red-400" : ""}>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVELS.map(g => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {gradeSuggestion && !gradeLevel && (
                    <p className="text-xs text-indigo-600 mt-1">Suggested: {gradeSuggestion} based on your age</p>
                  )}
                  {gradeAgeMismatch && (
                    <p className="text-xs text-red-500 mt-1">This grade doesn't match your age. Please select an age-appropriate grade.</p>
                  )}
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

              {/* School Type */}
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
                    <Input placeholder="e.g. Lincoln High School" value={schoolName} onChange={e => setSchoolName(e.target.value)} />
                  </div>
                  <div>
                    <Label>School District <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input placeholder="e.g. Metro School District" value={schoolDistrict} onChange={e => setSchoolDistrict(e.target.value)} />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input placeholder="e.g. Springfield" value={city} onChange={e => setCity(e.target.value)} />
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
              </div>

              {/* Student Goals — dynamic prompt */}
              <div>
                <Label className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-indigo-600" />
                  What are your goals?
                </Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {STUDENT_GOALS.map(g => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setStudentGoal(g.value)}
                      className={`text-left p-3 rounded-lg border-2 transition-all ${
                        studentGoal === g.value
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-border hover:border-indigo-300"
                      }`}
                    >
                      <div className="font-medium text-sm">{g.label}</div>
                      <div className="text-xs text-muted-foreground">{g.desc}</div>
                    </button>
                  ))}
                </div>
                {studentGoal === "other" && (
                  <Input
                    className="mt-2"
                    placeholder="Describe your goal…"
                    value={goalDetail}
                    onChange={e => setGoalDetail(e.target.value)}
                  />
                )}
              </div>

              <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleStep1} disabled={saveProfile.isPending}>
                {saveProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* COPPA Consent Gate — shown before Step 2 when grade ≤ 6 */}
        {step === 2 && requiresCoppaConsent && !coppaConsentSent && (
          <Card className="border-amber-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <CardTitle>Parental Consent Required</CardTitle>
              </div>
              <CardDescription>
                Students in Grade 6 or below need a parent or guardian to approve their account before they can access lessons and the AI tutor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <p className="font-medium mb-1">Why is this required?</p>
                <p>Under the Children's Online Privacy Protection Act (COPPA), we must obtain verifiable parental consent before collecting personal data from children under 13. We apply this gate to Grade 6 and below to be safe.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coppa-email">
                  Parent or Guardian Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="coppa-email"
                  type="email"
                  placeholder="parent@example.com"
                  value={coppaConsentEmail}
                  onChange={e => { setCoppaConsentEmail(e.target.value); setCoppaEmailError(""); }}
                  className={coppaEmailError ? "border-red-400" : ""}
                />
                {coppaEmailError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {coppaEmailError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  We will send a one-click approval link to this address. Your parent must approve before you can start learning.
                </p>
              </div>
              <Button
                className="w-full bg-amber-600 hover:bg-amber-700"
                onClick={handleSendCoppaConsent}
                disabled={requestCoppaConsent.isPending}
              >
                {requestCoppaConsent.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending…</>
                ) : (
                  <><Mail className="h-4 w-4 mr-2" /> Send Consent Request to Parent</>
                )}
              </Button>
              <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setStep(1)}>
                <ArrowLeft className="h-3 w-3 mr-1" /> Back
              </Button>
            </CardContent>
          </Card>
        )}

        {/* COPPA Consent Sent Confirmation */}
        {step === 2 && requiresCoppaConsent && coppaConsentSent && (
          <Card className="border-green-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <CardTitle>Consent Request Sent!</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800 space-y-2">
                <p>A consent approval email has been sent to <strong>{coppaConsentEmail}</strong>.</p>
                <p>Ask your parent to check their inbox and click the approval link. Once they approve, you can log back in and start learning.</p>
              </div>
              <div className="rounded-lg bg-slate-50 border p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium">What happens next?</p>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  <li>Your parent clicks the link in the email</li>
                  <li>They review and approve the consent form</li>
                  <li>Your account is unlocked automatically</li>
                  <li>Log back in to start your first lesson</li>
                </ul>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setCoppaConsentSent(false); setCoppaConsentEmail(""); }}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Use a different email address
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Invite Parent */}
        {step === 2 && (!requiresCoppaConsent || coppaConsentSent) && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <CardTitle>Invite Your Parent or Guardian</CardTitle>
              </div>
              <CardDescription>
                {isUnder16
                  ? "Because you are under 16, a parent or guardian must approve your registration before you can access courses."
                  : "Connect a parent or guardian so they can track your progress, approve your subscription, and support your learning journey."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {isUnder16 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-800">
                    <span className="font-medium">Required for under-16 students. </span>
                    Please invite your parent or guardian below. They will receive a link to approve your account. You will not be able to access courses until they confirm.
                  </div>
                </div>
              )}

              {!isUnder16 && (
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
              )}

              {inviteInfo && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
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
                      <Mail className="h-3.5 w-3.5" /> Parent's Email {isUnder16 && <span className="text-red-500">*</span>}
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
                <div className="rounded-xl border p-4 space-y-3"
                  style={{ background: parentInviteResult.isExistingUser ? "#f0fdf4" : "#f0f9ff",
                           borderColor: parentInviteResult.isExistingUser ? "#86efac" : "#93c5fd" }}>
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      parentInviteResult.isExistingUser ? "bg-emerald-100" : "bg-blue-100"
                    }`}>
                      <CheckCircle2 className={`h-5 w-5 ${
                        parentInviteResult.isExistingUser ? "text-emerald-600" : "text-blue-600"
                      }`} />
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${
                        parentInviteResult.isExistingUser ? "text-emerald-900" : "text-blue-900"
                      }`}>
                        {parentInviteResult.isExistingUser
                          ? "Request sent to existing parent account!"
                          : "Invitation link created!"}
                      </p>
                      <p className={`text-xs mt-0.5 ${
                        parentInviteResult.isExistingUser ? "text-emerald-700" : "text-blue-700"
                      }`}>
                        {parentInviteResult.isExistingUser
                          ? `${parentName || "Your parent"} already has an EduChamp account. They'll see your enrollment request in their Parent Portal under "Pending Student Requests" and can accept or decline from there.`
                          : "Share this link with your parent or guardian. They'll be taken to EduChamp to create their account and approve your enrollment."}
                      </p>
                    </div>
                  </div>

                  {/* Email delivery status indicator */}
                  {!parentInviteResult.isExistingUser && (
                    <div className="flex items-center gap-2 text-xs">
                      {parentInviteResult.emailSent ? (
                        <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Email delivered to {parentEmail || "parent"}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                          <AlertCircle className="h-3 w-3" /> Email not sent — share the link below manually
                        </span>
                      )}
                    </div>
                  )}

                  {!parentInviteResult.isExistingUser && (
                    <>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-white border rounded-lg px-3 py-2 truncate text-slate-700 font-mono">
                          {parentInviteResult.inviteUrl}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1.5"
                          onClick={() => {
                            navigator.clipboard.writeText(parentInviteResult!.inviteUrl);
                            toast.success("Link copied to clipboard!");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </Button>
                      </div>
                      <div className="rounded-lg bg-white/60 border border-blue-100 p-3 text-xs text-blue-800 space-y-1">
                        <p className="font-medium">How to share this link:</p>
                        <ul className="list-disc list-inside space-y-0.5 pl-1">
                          <li>Copy the link and send it via text message or email</li>
                          <li>Your parent will be taken to EduChamp to create their free account</li>
                          <li>Once they accept, you'll both be linked automatically</li>
                          {parentInviteResult.expiresAt && (
                            <li>Link expires on {new Date(parentInviteResult.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</li>
                          )}
                        </ul>
                      </div>
                      {/* Resend button — available immediately after first send */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full gap-1.5 text-xs text-muted-foreground hover:text-primary"
                        disabled={resendParentInvite.isPending}
                        onClick={() => resendParentInvite.mutate({ oldToken: parentInviteResult!.token, origin: window.location.origin })}
                      >
                        <RefreshCw className="h-3 w-3" />
                        {resendParentInvite.isPending ? "Generating new link…" : "Generate a new invitation link"}
                      </Button>
                    </>
                  )}

                  {parentInviteResult.isExistingUser && (
                    <div className="rounded-lg bg-white/60 border border-emerald-100 p-3 text-xs text-emerald-800 space-y-1">
                      <p className="font-medium">What happens next?</p>
                      <ul className="list-disc list-inside space-y-0.5 pl-1">
                        <li>Your parent will see your request in their Parent Portal</li>
                        <li>Once they accept, you'll be linked to their account</li>
                        <li>They'll be able to monitor your progress and receive updates</li>
                        <li>You can continue setting up your account in the meantime</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 gap-1">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-1"
                  onClick={() => {
                    // Under-16 students must invite a parent before proceeding
                    if (isUnder16 && !parentInviteSent && !inviteInfo) {
                      toast.error("You must invite a parent or guardian before continuing. This is required for students under 16.");
                      return;
                    }
                    setStep(3);
                  }}
                >
                  {parentInviteSent || inviteInfo ? "Continue" : isUnder16 ? "Invite Required" : "Skip for now"}
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
                    "Browse your grade-appropriate courses and enrol in the ones that match your goals",
                    "Take the placement diagnostic to find your exact starting point in each course",
                    "Work through units at your own pace with EduBot, your AI learning coach",
                    "Take unit quizzes to unlock the next level and track your mastery",
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
