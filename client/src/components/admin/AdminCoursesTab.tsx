import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BookOpen, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

// ─── Course Detail ────────────────────────────────────────────────────────────
function CourseDetail({ course, units, onUpdate }: { course: any; units: any[]; onUpdate: (d: any) => void }) {
  const [cooldownInput, setCooldownInput] = useState<string>("");
  const [timerInput, setTimerInput] = useState<string>("");
  const [minAgeInput, setMinAgeInput] = useState<string>("");
  const [courseDetailTab, setCourseDetailTab] = useState("overview");
  const { data: courseDetail, refetch: refetchDetail } = trpc.adminDetail.getCourseDetail.useQuery(
    { courseId: course?.id },
    { enabled: !!course?.id && (courseDetailTab === "questions" || courseDetailTab === "enrolled") }
  );
  const deactivateQuestion = trpc.adminDetail.deactivateQuestion.useMutation({
    onSuccess: () => { toast.success("Question deactivated"); refetchDetail(); },
    onError: (e) => toast.error(e.message),
  });
  const reactivateQuestion = trpc.adminDetail.reactivateQuestion.useMutation({
    onSuccess: () => { toast.success("Question reactivated"); refetchDetail(); },
    onError: (e) => toast.error(e.message),
  });
  const flagQuestion = trpc.adminDetail.flagQuestion.useMutation({
    onSuccess: () => { toast.success("Question flagged for review"); refetchDetail(); },
    onError: (e) => toast.error(e.message),
  });
  if (!course) return null;
  const currentCooldown = course.diagnosticCooldownDays ?? 7;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{course.title}</CardTitle>
            <CardDescription className="mt-1">{course.description}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge variant="outline">{course.courseCode}</Badge>
            {course.minAgeRequirement ? (
              <Badge className="bg-amber-100 text-amber-800 gap-1 text-xs">
                <ShieldAlert className="h-3 w-3" /> Age {course.minAgeRequirement}+ required
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={courseDetailTab} onValueChange={setCourseDetailTab}>
          <TabsList className="w-full grid grid-cols-4 mb-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="units">Units/Lessons</TabsTrigger>
            <TabsTrigger value="questions">Question Bank</TabsTrigger>
            <TabsTrigger value="enrolled">Enrolled</TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Subject:</span> <strong>{course.subject}</strong></div>
              <div><span className="text-muted-foreground">Grade Level:</span> <strong>{course.gradeLevel}</strong></div>
              <div><span className="text-muted-foreground">Standards Code:</span> <strong>{course.teksCode ?? "—"}</strong></div>
              <div><span className="text-muted-foreground">Sort Order:</span> <strong>{course.sortOrder}</strong></div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Course Status</Label>
              <Select value={course.status ?? "active"} onValueChange={(v) => onUpdate({ status: v })}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Diagnostic Cooldown (days)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" min={1} max={365}
                  defaultValue={currentCooldown}
                  value={cooldownInput}
                  onChange={(e) => setCooldownInput(e.target.value)}
                  className="w-24"
                />
                <Button size="sm" variant="outline" onClick={() => {
                  const v = parseInt(cooldownInput);
                  if (!isNaN(v) && v > 0) onUpdate({ diagnosticCooldownDays: v });
                }}>Save</Button>
              </div>
              <p className="text-xs text-muted-foreground">Current: {currentCooldown} days</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Exam Timer (minutes)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" min={1} max={300}
                  defaultValue={course.examTimerMinutes ?? 45}
                  value={timerInput}
                  onChange={(e) => setTimerInput(e.target.value)}
                  className="w-24"
                />
                <Button size="sm" variant="outline" onClick={() => {
                  const v = parseInt(timerInput);
                  if (!isNaN(v) && v > 0) onUpdate({ examTimerMinutes: v });
                }}>Save</Button>
              </div>
            </div>
            {/* ── Minimum Age Requirement ── */}
            <div className="space-y-2 border-t pt-4">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                Minimum Age Requirement
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  type="number" min={0} max={25}
                  placeholder={course.minAgeRequirement ? String(course.minAgeRequirement) : "No restriction"}
                  value={minAgeInput}
                  onChange={(e) => setMinAgeInput(e.target.value)}
                  className="w-36"
                />
                <Button size="sm" variant="outline" onClick={() => {
                  const raw = minAgeInput.trim();
                  if (raw === "" || raw === "0") {
                    onUpdate({ minAgeRequirement: null });
                    setMinAgeInput("");
                    toast.success("Age restriction removed");
                  } else {
                    const v = parseInt(raw);
                    if (!isNaN(v) && v > 0 && v <= 25) {
                      onUpdate({ minAgeRequirement: v });
                      setMinAgeInput("");
                      toast.success(`Age restriction set to ${v}+`);
                    } else {
                      toast.error("Enter a valid age between 1 and 25, or 0 to remove restriction");
                    }
                  }
                }}>Save</Button>
                {course.minAgeRequirement ? (
                  <Badge className="bg-amber-100 text-amber-800 gap-1 text-xs">
                    <ShieldAlert className="h-3 w-3" /> Age {course.minAgeRequirement}+ required
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">No restriction currently set</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Students below this age will be blocked from enrolling. Set to 0 or leave blank to remove the restriction.
                Recommended: 14+ for AP courses, 16+ for dual-enrollment courses.
              </p>
            </div>
          </TabsContent>

          {/* ── Units/Lessons ── */}
          <TabsContent value="units" className="space-y-2">
            <h4 className="font-medium text-sm mb-2">Units ({units.length})</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {units.length === 0 ? (
                <p className="text-xs text-muted-foreground">No units found.</p>
              ) : units.map((unit: any) => (
                <div key={unit.id} className="p-3 rounded-md border text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-6 text-right shrink-0">{unit.unitNumber}.</span>
                    <span className="flex-1 font-medium">{unit.title}</span>
                    {unit.teksAlignment && <Badge variant="outline" className="text-xs">{unit.teksAlignment.split("(")[0].trim()}</Badge>}
                  </div>
                  {unit.lessons && unit.lessons.length > 0 && (
                    <div className="ml-10 space-y-0.5">
                      {unit.lessons.map((lesson: any) => (
                        <div key={lesson.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="w-6 text-right">{lesson.lessonNumber}.</span>
                          <span>{lesson.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Question Bank ── */}
          <TabsContent value="questions" className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Questions ({(courseDetail?.questions ?? []).length})</h4>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {(courseDetail?.questions ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No questions found.</p>
              ) : (courseDetail?.questions ?? []).map((q: any) => (
                <div key={q.id} className={`p-3 rounded-md border text-sm ${!q.isActive ? "opacity-50 bg-muted/30" : "bg-background"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-2">{q.questionText}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
                        {q.flaggedByAdminAt && <Badge className="text-xs bg-amber-100 text-amber-800">Flagged</Badge>}
                        {!q.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      </div>
                      {q.flagNote && <p className="text-xs text-amber-700 mt-1">{q.flagNote}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {q.isActive ? (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => deactivateQuestion.mutate({ questionId: q.id })}>
                          Deactivate
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => reactivateQuestion.mutate({ questionId: q.id })}>
                          Reactivate
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-600" onClick={() => {
                        const note = prompt("Flag note (optional):");
                        flagQuestion.mutate({ questionId: q.id, flagNote: note ?? undefined });
                      }}>
                        Flag
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Enrolled Students ── */}
          <TabsContent value="enrolled" className="space-y-2">
            <h4 className="font-medium text-sm mb-2">Enrolled Students ({(courseDetail?.enrolledStudents ?? []).length})</h4>
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {(courseDetail?.enrolledStudents ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No students enrolled.</p>
              ) : (courseDetail?.enrolledStudents ?? []).map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-md border text-sm">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">{(s.name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{s.enrollmentStatus ?? "active"}</Badge>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ─── Courses Tab ──────────────────────────────────────────────────────────────
export function AdminCoursesTab() {
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const { data: courses, isLoading, refetch } = trpc.admin.listCourses.useQuery();
  const { data: units } = trpc.admin.getCourseUnits.useQuery({ courseId: selectedCourse! }, { enabled: !!selectedCourse });
  const updateCourse = trpc.admin.updateCourse.useMutation({ onSuccess: () => { toast.success("Course updated"); refetch(); } });
  const subjectColors: Record<string, string> = {
    math: "bg-blue-100 text-blue-800", english: "bg-purple-100 text-purple-800",
    science: "bg-green-100 text-green-800", "social studies": "bg-amber-100 text-amber-800",
    "world languages": "bg-pink-100 text-pink-800",
  };
  if (isLoading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">All Courses ({(courses ?? []).length})</h3>
        {(courses ?? []).map((course: any) => (
          <button
            key={course.id}
            onClick={() => setSelectedCourse(course.id)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedCourse === course.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-2">
                <p className="font-medium text-sm truncate">{course.title}</p>
                <p className="text-xs text-muted-foreground">Grade {course.gradeLevel} · {course.courseCode}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge className={`text-xs ${subjectColors[course.subject] ?? "bg-gray-100 text-gray-800"}`}>{course.subject}</Badge>
                <Badge variant={course.status === "active" || !course.status ? "outline" : "secondary"} className="text-xs">
                  {course.status ?? "active"}
                </Badge>
                {course.minAgeRequirement ? (
                  <Badge className="bg-amber-100 text-amber-800 gap-1 text-xs">
                    <ShieldAlert className="h-2.5 w-2.5" /> {course.minAgeRequirement}+
                  </Badge>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="lg:col-span-2">
        {selectedCourse ? (
          <CourseDetail
            course={(courses ?? []).find((c: any) => c.id === selectedCourse)}
            units={units ?? []}
            onUpdate={(data) => updateCourse.mutate({ courseId: selectedCourse, ...data })}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm border rounded-lg p-12">
            <div className="text-center">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Select a course to view details and manage settings</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminCoursesTab;
