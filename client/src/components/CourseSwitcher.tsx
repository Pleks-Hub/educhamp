/**
 * CourseSwitcher — lets students browse courses filtered by their grade level,
 * enrol, and switch their active course. Persists the selection server-side.
 *
 * Age gate: if the course has a minAgeRequirement and the student's stored DOB
 * indicates they are too young, the Enrol button is disabled and an amber
 * "Age X+ required" badge is shown.
 */
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  PlusCircle,
  Loader2,
  Star,
  Filter,
  ShieldAlert,
} from "lucide-react";

// Subject colour tokens aligned with Tailwind palette
const SUBJECT_COLORS: Record<string, string> = {
  math: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  english: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
  science: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
  social_studies: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  language: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700",
};

const SUBJECT_LABELS: Record<string, string> = {
  math: "Mathematics",
  english: "English Language Arts",
  science: "Science",
  social_studies: "Social Studies",
  language: "World Languages",
};

const GRADE_ORDER = [
  "Pre-K", "Kindergarten",
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
  "AP", "SAT",
];

function gradeLabel(g: string): string {
  if (g === "Pre-K")        return "Pre-K";
  if (g === "Kindergarten") return "Kindergarten";
  if (g === "AP")           return "AP / Advanced";
  if (g === "SAT")          return "SAT Prep";
  const n = parseInt(g, 10);
  if (!isNaN(n))            return `Grade ${n}`;
  return g;
}

function gradeSort(a: string, b: string): number {
  const ia = GRADE_ORDER.indexOf(a);
  const ib = GRADE_ORDER.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}

/** Returns the student's age in whole years from an ISO date string, or null. */
function calcAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

interface CourseSwitcherProps {
  open: boolean;
  onClose: () => void;
}

export default function CourseSwitcher({ open, onClose }: CourseSwitcherProps) {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [gradeFilter, setGradeFilter] = useState<string | "all">("all");

  const { data: allCourses, isLoading: loadingCourses } = trpc.admin.getPublicCourses.useQuery(
    undefined,
    { enabled: open }
  );
  const { data: myEnrollments, isLoading: loadingEnrollments } = trpc.admin.myEnrollments.useQuery(
    undefined,
    { enabled: open }
  );
  // Fetch the student's profile to get their stored DOB for age-gate checks
  const { data: profileData } = trpc.onboarding.getProfile.useQuery(
    undefined,
    { enabled: open }
  );

  // Compute student age once; null means DOB not set (no gate applied)
  const studentAge = useMemo(
    () => calcAge(profileData?.profile?.dateOfBirth),
    [profileData?.profile?.dateOfBirth]
  );

  const enrollSelf = trpc.admin.enrollSelf.useMutation({
    onSuccess: (_, vars) => {
      utils.admin.myEnrollments.invalidate();
      const course = allCourses?.find((c: any) => c.id === vars.courseId);
      toast.success(`Enrolled in ${course?.title ?? "course"}`);
    },
    onError: () => toast.error("Failed to enrol. Please try again."),
  });

  const setActive = trpc.progress.switchActiveCourse.useMutation({
    onSuccess: async (_, vars) => {
      await Promise.all([
        utils.admin.myEnrollments.invalidate(),
        utils.progress.getDashboard.invalidate(),
        utils.progress.getAllCourseProgress.invalidate(),
      ]);
      const course = allCourses?.find((c: any) => c.id === vars.courseId);
      toast.success(`Switched to ${course?.title ?? "course"}`);
      onClose();
      // After switching, check if the new course has a diagnostic attempt.
      // Redirect to /course-welcome (first-time welcome page) if no diagnostic exists,
      // otherwise go straight to /curriculum.
      // We use a short delay to let the cache update settle.
      setTimeout(async () => {
        const freshDashboard = await utils.progress.getDashboard.fetch();
        if (!freshDashboard?.hasDiagnosticForActiveCourse) {
          setLocation("/course-welcome");
        } else {
          setLocation("/curriculum");
        }
      }, 300);
    },
    onError: () => toast.error("Failed to switch course. Please try again."),
  });

  const enrolledMap = new Map(
    (myEnrollments ?? []).map((e: any) => [e.course.id, e.enrollment])
  );
  const currentCourseId = (myEnrollments ?? []).find((e: any) => e.enrollment.isCurrent)?.course.id;

  // Derive available grade levels from the course list, sorted in academic order
  const availableGrades = Array.from(
    new Set((allCourses ?? []).map((c: any) => c.gradeLevel))
  ).sort(gradeSort);

  const filteredCourses = (allCourses ?? []).filter((c: any) =>
    gradeFilter === "all" || c.gradeLevel === gradeFilter
  );

  // Group by grade (using raw gradeLevel as key so we can sort groups)
  const groupedRaw = filteredCourses.reduce((acc: Record<string, any[]>, c: any) => {
    if (!acc[c.gradeLevel]) acc[c.gradeLevel] = [];
    acc[c.gradeLevel].push(c);
    return acc;
  }, {});
  // Sort groups in academic order
  const grouped = Object.fromEntries(
    Object.entries(groupedRaw).sort(([a], [b]) => gradeSort(a, b))
  );

  const isLoading = loadingCourses || loadingEnrollments;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              Course Catalogue
            </DialogTitle>
            <DialogDescription className="text-sm mt-1">
              Browse all courses by grade level. Enrol and switch your active course at any time.
            </DialogDescription>
          </DialogHeader>

          {/* Grade filter pills */}
          {!isLoading && availableGrades.length > 1 && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <button
                onClick={() => setGradeFilter("all")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  gradeFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                All Grades
              </button>
              {availableGrades.map((g) => (
                <button
                  key={g}
                  onClick={() => setGradeFilter(g)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    gradeFilter === g
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {gradeLabel(g)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Course list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No courses available for the selected grade.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([gradeKey, gradeCourses]) => (
                <div key={gradeKey}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="h-px flex-1 bg-border" />
                    {gradeLabel(gradeKey)}
                    <span className="h-px flex-1 bg-border" />
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(gradeCourses as any[]).map((course: any) => {
                      const enrollment = enrolledMap.get(course.id);
                      const enrolled = !!enrollment;
                      const isCurrent = course.id === currentCourseId;
                      const colorClass =
                        SUBJECT_COLORS[course.subject] ??
                        "bg-gray-100 text-gray-800 border-gray-200";

                      // Age gate: block enrolment if student is too young
                      const minAge: number | null = course.minAgeRequirement ?? null;
                      const isTooYoung =
                        minAge !== null &&
                        studentAge !== null &&
                        studentAge < minAge;

                      return (
                        <Card
                          key={course.id}
                          className={`border transition-all duration-150 ${
                            isCurrent
                              ? "border-primary ring-1 ring-primary/20 bg-primary/5"
                              : enrolled
                              ? "border-primary/30 bg-primary/3"
                              : isTooYoung
                              ? "border-amber-200 bg-amber-50/40 dark:border-amber-800/40 dark:bg-amber-950/20"
                              : "hover:border-border/80 hover:shadow-sm"
                          }`}
                        >
                          <CardContent className="pt-4 pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-semibold text-sm leading-snug">{course.title}</p>
                                  {isCurrent && (
                                    <Star className="h-3.5 w-3.5 text-primary fill-primary shrink-0" />
                                  )}
                                  {minAge !== null && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700 shrink-0">
                                      <ShieldAlert className="h-2.5 w-2.5" />
                                      Age {minAge}+
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                                  {course.description ?? `${SUBJECT_LABELS[course.subject] ?? course.subject}`}
                                </p>
                                {course.teksCode && (
                                  <p className="text-[10px] text-muted-foreground/60 mt-1">{course.teksCode}</p>
                                )}
                              </div>
                              {enrolled && !isCurrent && (
                                <CheckCircle2 className="h-4 w-4 text-primary/60 shrink-0 mt-0.5" />
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <Badge
                                className={`text-[10px] border px-2 py-0.5 ${colorClass}`}
                                variant="outline"
                              >
                                {SUBJECT_LABELS[course.subject] ?? course.subject}
                              </Badge>
                              {isCurrent ? (
                                <span className="text-xs text-primary font-medium">Active</span>
                              ) : enrolled ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  disabled={setActive.isPending}
                                  onClick={() => setActive.mutate({ courseId: course.id })}
                                >
                                  {setActive.isPending && setActive.variables?.courseId === course.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : null}
                                  Switch to this
                                </Button>
                              ) : isTooYoung ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs"
                                        disabled
                                        variant="outline"
                                      >
                                        <ShieldAlert className="h-3 w-3 mr-1 text-amber-500" />
                                        Age {minAge}+ required
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs max-w-[200px] text-center">
                                    This course requires students to be at least {minAge} years old. Your current age ({studentAge}) does not meet the requirement.
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Button
                                  size="sm"
                                  className="h-7 text-xs"
                                  disabled={enrollSelf.isPending}
                                  onClick={() => enrollSelf.mutate({ courseId: course.id })}
                                >
                                  {enrollSelf.isPending &&
                                  enrollSelf.variables?.courseId === course.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <PlusCircle className="h-3 w-3 mr-1" />
                                  )}
                                  Enrol
                                </Button>
                              )}
                            </div>
                            {/* Inline age-gate message when student is too young */}
                            {isTooYoung && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                                <ShieldAlert className="h-3 w-3 shrink-0" />
                                Requires age {minAge}+ — you are currently {studentAge} years old.
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
