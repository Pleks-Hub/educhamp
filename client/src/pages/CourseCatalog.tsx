import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FlaskConical,
  Globe,
  Loader2,
  Monitor,
  Search,
  Sparkles,
  Star,
  Languages,
  Calculator,
} from "lucide-react";
import { useLocation } from "wouter";

// Subject → icon + colour mapping
const SUBJECT_META: Record<string, { icon: React.ElementType; colour: string; bg: string }> = {
  math:           { icon: Calculator,   colour: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  english:        { icon: BookOpen,     colour: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  science:        { icon: FlaskConical, colour: "text-green-700",  bg: "bg-green-50 border-green-200" },
  social_studies: { icon: Globe,        colour: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  technology:     { icon: Monitor,      colour: "text-cyan-700",   bg: "bg-cyan-50 border-cyan-200" },
  language:       { icon: Languages,    colour: "text-rose-700",   bg: "bg-rose-50 border-rose-200" },
  other:          { icon: Star,         colour: "text-slate-700",  bg: "bg-slate-50 border-slate-200" },
};

function subjectMeta(subject: string) {
  return SUBJECT_META[subject.toLowerCase()] ?? SUBJECT_META.other;
}

const GRADE_ORDER = [
  "Kindergarten", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "AP", "SAT",
];

function gradeLabel(g: string) {
  if (g === "AP") return "AP";
  if (g === "SAT") return "SAT Prep";
  if (g === "Kindergarten") return "Kindergarten";
  return `Grade ${g}`;
}

function gradeSort(a: string, b: string) {
  const ia = GRADE_ORDER.indexOf(a);
  const ib = GRADE_ORDER.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}

const SUBJECT_FILTERS = [
  { value: "all", label: "All Subjects" },
  { value: "math", label: "Math" },
  { value: "english", label: "English / ELA" },
  { value: "science", label: "Science" },
  { value: "social_studies", label: "Social Studies" },
  { value: "technology", label: "Technology" },
  { value: "language", label: "Language" },
];

export default function CourseCatalog() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [enrollingId, setEnrollingId] = useState<number | null>(null);

  const catalogQuery = trpc.admin.getCourseCatalog.useQuery();
  const utils = trpc.useUtils();
  const enrollSelf = trpc.admin.enrollSelf.useMutation({
    onSuccess: () => {
      utils.admin.getCourseCatalog.invalidate();
      utils.admin.myEnrollments.invalidate();
    },
  });
  const setActiveCourse = trpc.admin.setActiveCourse.useMutation({
    onSuccess: () => {
      utils.admin.myEnrollments.invalidate();
    },
  });

  const courses = catalogQuery.data ?? [];

  // Unique grade levels for the grade filter dropdown
  const gradeLevels = useMemo(() => {
    const grades = Array.from(new Set(courses.map((c) => c.gradeLevel)));
    return grades.sort(gradeSort);
  }, [courses]);

  // Filtered + sorted courses
  const filtered = useMemo(() => {
    return courses
      .filter((c) => {
        if (subjectFilter !== "all" && c.subject.toLowerCase() !== subjectFilter) return false;
        if (gradeFilter !== "all" && c.gradeLevel !== gradeFilter) return false;
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
        // Recommended first, then grade order, then sort order
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        const gs = gradeSort(a.gradeLevel, b.gradeLevel);
        if (gs !== 0) return gs;
        return a.sortOrder - b.sortOrder;
      });
  }, [courses, subjectFilter, gradeFilter, search]);

  // Group by grade level
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const c of filtered) {
      const arr = map.get(c.gradeLevel) ?? [];
      arr.push(c);
      map.set(c.gradeLevel, arr);
    }
    // Sort groups
    return Array.from(map.entries()).sort(([a], [b]) => gradeSort(a, b));
  }, [filtered]);

  async function handleEnroll(courseId: number, title: string) {
    setEnrollingId(courseId);
    try {
      await enrollSelf.mutateAsync({ courseId });
      toast.success(`Enrolled in ${title}!`, {
        description: "Go to your curriculum to start learning.",
        action: { label: "Open Curriculum", onClick: () => navigate("/curriculum") },
      });
    } catch (err: any) {
      toast.error(err?.message ?? "Enrollment failed. Please try again.");
    } finally {
      setEnrollingId(null);
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

  const recommendedCount = courses.filter((c) => c.isRecommended && !c.isEnrolled).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Course Catalog</h1>
        <p className="text-slate-500 mt-1">
          Browse all 56+ courses across Grades 3–12 and AP/SAT. Enrol in any course and start learning today.
        </p>
        {recommendedCount > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-sm text-indigo-800">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span><strong>{recommendedCount}</strong> course{recommendedCount > 1 ? "s" : ""} recommended for your grade level</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {SUBJECT_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Grades</option>
          {gradeLevels.map((g) => (
            <option key={g} value={g}>{gradeLabel(g)}</option>
          ))}
        </select>
        {(search || subjectFilter !== "all" || gradeFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setSubjectFilter("all"); setGradeFilter("all"); }}
            className="text-slate-500"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Loading */}
      {catalogQuery.isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      )}

      {/* Empty */}
      {!catalogQuery.isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No courses match your filters.</p>
          <p className="text-sm mt-1">Try clearing the filters or searching for a different subject.</p>
        </div>
      )}

      {/* Grouped course cards */}
      {grouped.map(([grade, gradeCourses]) => (
        <div key={grade}>
          <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
              {gradeLabel(grade)}
            </span>
            <span className="text-slate-400 text-xs font-normal">{gradeCourses.length} course{gradeCourses.length > 1 ? "s" : ""}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {gradeCourses.map((course) => {
              const meta = subjectMeta(course.subject);
              const SubjectIcon = meta.icon;
              const isEnrolling = enrollingId === course.id;
              return (
                <div
                  key={course.id}
                  className={`relative rounded-xl border p-4 transition-all hover:shadow-md ${
                    course.isEnrolled
                      ? "border-emerald-200 bg-emerald-50/50"
                      : course.isRecommended
                      ? "border-indigo-200 bg-indigo-50/50 ring-1 ring-indigo-200"
                      : course.isGradeAppropriate
                      ? "border-slate-200 bg-white hover:border-slate-300"
                      : "border-slate-100 bg-slate-50/50 opacity-75"
                  }`}
                >
                  {/* Badges */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium ${meta.bg} ${meta.colour}`}>
                      <SubjectIcon className="h-3 w-3" />
                      {course.subject.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {course.isEnrolled && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Enrolled
                        </Badge>
                      )}
                      {course.isRecommended && !course.isEnrolled && (
                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]">
                          <Sparkles className="h-2.5 w-2.5 mr-0.5" /> Recommended
                        </Badge>
                      )}
                      {!course.isGradeAppropriate && !course.isEnrolled && (
                        <Badge variant="outline" className="text-slate-400 text-[10px]">
                          Outside grade range
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Title + code */}
                  <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-1">{course.title}</h3>
                  <p className="text-xs text-slate-500 mb-1">{course.courseCode} · {gradeLabel(course.gradeLevel)}</p>
                  {course.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{course.description}</p>
                  )}

                  {/* Action button */}
                  {course.isEnrolled ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => handleSwitch(course.id, course.title)}
                    >
                      Switch to this course <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className={`w-full gap-1 ${
                        course.isRecommended
                          ? "bg-indigo-600 hover:bg-indigo-700"
                          : "bg-slate-700 hover:bg-slate-800"
                      }`}
                      onClick={() => handleEnroll(course.id, course.title)}
                      disabled={isEnrolling}
                    >
                      {isEnrolling ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Enrol Now
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
