import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock,
  FlaskConical,
  Globe,
  Languages,
  Loader2,
  Monitor,
  Search,
  Send,
  Sparkles,
  Star,
  XCircle,
  GraduationCap,
} from "lucide-react";
import { useLocation } from "wouter";

// ─── Subject → icon + colour mapping ─────────────────────────────────────────
const SUBJECT_META: Record<string, { icon: React.ElementType; colour: string; bg: string; label: string }> = {
  math:           { icon: Calculator,   colour: "text-blue-700",   bg: "bg-blue-50 border-blue-200",   label: "Math" },
  english:        { icon: BookOpen,     colour: "text-purple-700", bg: "bg-purple-50 border-purple-200", label: "English" },
  science:        { icon: FlaskConical, colour: "text-green-700",  bg: "bg-green-50 border-green-200",  label: "Science" },
  social_studies: { icon: Globe,        colour: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  label: "Social Studies" },
  technology:     { icon: Monitor,      colour: "text-cyan-700",   bg: "bg-cyan-50 border-cyan-200",    label: "Technology" },
  language:       { icon: Languages,    colour: "text-rose-700",   bg: "bg-rose-50 border-rose-200",    label: "Language" },
  other:          { icon: Star,         colour: "text-slate-700",  bg: "bg-slate-50 border-slate-200",  label: "Other" },
};

function subjectMeta(subject: string) {
  return SUBJECT_META[subject.toLowerCase()] ?? SUBJECT_META.other;
}

// ─── Grade ordering: Pre-K → K → 1 → 2 → … → 12 → AP → SAT ─────────────────
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

const GRADE_FILTER_PILLS = [
  { value: "all",           label: "All Grades" },
  { value: "Pre-K",         label: "Pre-K" },
  { value: "Kindergarten",  label: "Kindergarten" },
  { value: "1",  label: "Gr. 1" },
  { value: "2",  label: "Gr. 2" },
  { value: "3",  label: "Gr. 3" },
  { value: "4",  label: "Gr. 4" },
  { value: "5",  label: "Gr. 5" },
  { value: "6",  label: "Gr. 6" },
  { value: "7",  label: "Gr. 7" },
  { value: "8",  label: "Gr. 8" },
  { value: "9",  label: "Gr. 9" },
  { value: "10", label: "Gr. 10" },
  { value: "11", label: "Gr. 11" },
  { value: "12", label: "Gr. 12" },
  { value: "AP",  label: "AP" },
  { value: "SAT", label: "SAT" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function CourseCatalog() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [requestingId, setRequestingId] = useState<number | null>(null);

  const catalogQuery    = trpc.admin.getCourseCatalog.useQuery();
  const myRequestsQuery = trpc.courses.getMyCourseRequests.useQuery();
  const utils = trpc.useUtils();

  const requestCourse = trpc.courses.requestCourse.useMutation({
    onSuccess: (data) => {
      utils.courses.getMyCourseRequests.invalidate();
      if (data.alreadyExists) {
        toast.info("Request already submitted", {
          description: "Your parent has been notified. Check back for the status.",
        });
      } else {
        toast.success("Course request submitted!", {
          description: "Your parent or guardian will receive an email to approve or reject this request.",
        });
      }
    },
    onError: (err) => toast.error(err.message ?? "Failed to submit request."),
  });

  const setActiveCourse = trpc.admin.setActiveCourse.useMutation({
    onSuccess: () => utils.admin.myEnrollments.invalidate(),
  });

  // Build courseId → request status map
  const requestStatusMap = useMemo(() => {
    const map = new Map<number, { status: string; rejectionReason: string | null }>();
    for (const r of myRequestsQuery.data ?? []) {
      map.set(r.courseId, { status: r.status, rejectionReason: r.rejectionReason ?? null });
    }
    return map;
  }, [myRequestsQuery.data]);

  const courses = catalogQuery.data ?? [];

  // Enrolled courses for "My Courses" section
  const enrolledCourses = useMemo(() => courses.filter((c) => c.isEnrolled), [courses]);

  // Available subjects for filter pills (only subjects that have courses)
  const availableSubjects = useMemo(() => {
    return Array.from(new Set(courses.map((c) => c.subject.toLowerCase())));
  }, [courses]);

  // Derive which grade-filter pills actually have courses
  const availableGrades = useMemo(() => new Set(courses.map((c) => c.gradeLevel)), [courses]);

  // Filtered + sorted courses (excluding enrolled ones — shown separately above)
  const filtered = useMemo(() => {
    return courses
      .filter((c) => {
        if (c.isEnrolled) return false; // shown in My Courses section
        if (gradeFilter !== "all" && c.gradeLevel !== gradeFilter) return false;
        if (subjectFilter !== "all" && c.subject.toLowerCase() !== subjectFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            c.title.toLowerCase().includes(q) ||
            c.subject.toLowerCase().includes(q) ||
            c.courseCode.toLowerCase().includes(q) ||
            (c.description ?? "").toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        const gs = gradeSort(a.gradeLevel, b.gradeLevel);
        if (gs !== 0) return gs;
        return a.sortOrder - b.sortOrder;
      });
  }, [courses, gradeFilter, subjectFilter, search]);

  // Group by grade level
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const c of filtered) {
      const arr = map.get(c.gradeLevel) ?? [];
      arr.push(c);
      map.set(c.gradeLevel, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => gradeSort(a, b));
  }, [filtered]);

  const recommendedCount = courses.filter((c) => c.isRecommended && !c.isEnrolled).length;
  const pendingCount     = (myRequestsQuery.data ?? []).filter((r) => r.status === "pending").length;

  async function handleRequest(courseId: number) {
    setRequestingId(courseId);
    try {
      await requestCourse.mutateAsync({ courseId, origin: window.location.origin });
    } finally {
      setRequestingId(null);
    }
  }

  async function handleSwitch(courseId: number, title: string) {
    try {
      await setActiveCourse.mutateAsync({ courseId });
      toast.success(`Switched to ${title}`);
      navigate("/curriculum");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to switch course.");
    }
  }

  const hasActiveFilters = search || gradeFilter !== "all" || subjectFilter !== "all";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Full Course Catalogue</h1>
        <p className="text-slate-500 mt-1">
          Browse 70+ courses from Pre-K through Grade 12, AP, and SAT Prep — all aligned to Katy ISD TEKS.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {recommendedCount > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-sm text-indigo-800">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span>
                <strong>{recommendedCount}</strong>{" "}
                course{recommendedCount > 1 ? "s" : ""} recommended for your grade level
              </span>
            </div>
          )}
          {pendingCount > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>
                <strong>{pendingCount}</strong>{" "}
                request{pendingCount > 1 ? "s" : ""} awaiting parent approval
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── My Courses (enrolled) ──────────────────────────────────────────── */}
      {enrolledCourses.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-emerald-600" />
            My Courses
            <span className="text-slate-400 text-xs font-normal">
              {enrolledCourses.length} enrolled
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
            {enrolledCourses.map((course) => {
              const meta = subjectMeta(course.subject);
              const SubjectIcon = meta.icon;
              return (
                <div
                  key={course.id}
                  className="relative rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium ${meta.bg} ${meta.colour}`}>
                      <SubjectIcon className="h-3 w-3" />
                      {meta.label}
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Enrolled
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-1">{course.title}</h3>
                  <p className="text-xs text-slate-500 mb-3">{course.courseCode} · {gradeLabel(course.gradeLevel)}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => handleSwitch(course.id, course.title)}
                  >
                    Switch to this course <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
          <Separator className="mt-4" />
        </div>
      )}

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setGradeFilter("all"); setSubjectFilter("all"); }}
            className="text-slate-500"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* ── Subject filter pills ───────────────────────────────────────────── */}
      {availableSubjects.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSubjectFilter("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              subjectFilter === "all"
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-800"
            }`}
          >
            All Subjects
          </button>
          {availableSubjects.map((subj) => {
            const meta = subjectMeta(subj);
            const SubjectIcon = meta.icon;
            return (
              <button
                key={subj}
                onClick={() => setSubjectFilter(subj)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  subjectFilter === subj
                    ? `${meta.bg} ${meta.colour} border-current`
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-800"
                }`}
              >
                <SubjectIcon className="h-3.5 w-3.5" />
                {meta.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Grade filter pills ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {GRADE_FILTER_PILLS.filter(
          (p) => p.value === "all" || availableGrades.has(p.value)
        ).map((pill) => (
          <button
            key={pill.value}
            onClick={() => setGradeFilter(pill.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              gradeFilter === pill.value
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* ── Loading ────────────────────────────────────────────────────────── */}
      {catalogQuery.isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {!catalogQuery.isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No courses match your filters.</p>
          <p className="text-sm mt-1">Try clearing the filters or searching by course name.</p>
        </div>
      )}

      {/* ── Grouped course cards ───────────────────────────────────────────── */}
      {grouped.map(([grade, gradeCourses]) => (
        <div key={grade}>
          <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
              {gradeLabel(grade)}
            </span>
            <span className="text-slate-400 text-xs font-normal">
              {gradeCourses.length} course{gradeCourses.length > 1 ? "s" : ""}
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {gradeCourses.map((course) => {
              const meta        = subjectMeta(course.subject);
              const SubjectIcon = meta.icon;

              return (
                <div
                  key={course.id}
                  className={`relative rounded-xl border p-4 transition-all hover:shadow-md ${
                    course.isRecommended
                      ? "border-indigo-200 bg-indigo-50/50 ring-1 ring-indigo-200"
                      : course.isGradeAppropriate
                      ? "border-slate-200 bg-white hover:border-slate-300"
                      : "border-slate-100 bg-slate-50/50 opacity-75"
                  }`}
                >
                  {/* Subject badge + status badges */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium ${meta.bg} ${meta.colour}`}>
                      <SubjectIcon className="h-3 w-3" />
                      {meta.label}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {course.isRecommended && (
                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]">
                          <Sparkles className="h-2.5 w-2.5 mr-0.5" /> Recommended
                        </Badge>
                      )}
                      {!course.isGradeAppropriate && (
                        <Badge variant="outline" className="text-slate-400 text-[10px]">
                          Outside grade range
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Title + code */}
                  <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 mb-1">
                    {course.courseCode} · {gradeLabel(course.gradeLevel)}
                  </p>
                  {course.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                      {course.description}
                    </p>
                  )}

                  {/* Action button */}
                  {(() => {
                    const reqStatus    = requestStatusMap.get(course.id);
                    const isRequesting = requestingId === course.id;

                    if (reqStatus?.status === "pending") {
                      return (
                        <div className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                          <Clock className="h-3.5 w-3.5" />
                          Awaiting parent approval
                        </div>
                      );
                    }
                    if (reqStatus?.status === "approved") {
                      return (
                        <div className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approved — enrolling…
                        </div>
                      );
                    }
                    if (reqStatus?.status === "rejected") {
                      return (
                        <div className="w-full space-y-1.5">
                          <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                            <XCircle className="h-3.5 w-3.5" />
                            Your parent did not approve this request
                          </div>
                          {reqStatus.rejectionReason && (
                            <p className="text-xs text-slate-500 text-center line-clamp-2">
                              "{reqStatus.rejectionReason}"
                            </p>
                          )}
                        </div>
                      );
                    }
                    return (
                      <Button
                        size="sm"
                        className={`w-full gap-1 ${
                          course.isRecommended
                            ? "bg-indigo-600 hover:bg-indigo-700"
                            : "bg-slate-700 hover:bg-slate-800"
                        }`}
                        onClick={() => handleRequest(course.id)}
                        disabled={isRequesting}
                      >
                        {isRequesting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        Request Access
                      </Button>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
