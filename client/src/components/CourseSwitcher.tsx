/**
 * CourseSwitcher — lets students browse all active courses, enrol, and switch their active course.
 * Shown as a dropdown in the sidebar header when the user has multiple enrolments.
 */
import { useState } from "react";
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
import { toast } from "sonner";
import { BookOpen, CheckCircle2, PlusCircle, Loader2 } from "lucide-react";

const SUBJECT_COLORS: Record<string, string> = {
  math: "bg-blue-100 text-blue-800 border-blue-200",
  english: "bg-purple-100 text-purple-800 border-purple-200",
  science: "bg-green-100 text-green-800 border-green-200",
  "social studies": "bg-amber-100 text-amber-800 border-amber-200",
  "world languages": "bg-pink-100 text-pink-800 border-pink-200",
};

const GRADE_LABELS: Record<string, string> = {
  "3": "3rd Grade",
  "9": "9th Grade",
};

interface CourseSwitcherProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user switches to a different course */
  onCourseSelected?: (courseId: number, courseTitle: string) => void;
}

export default function CourseSwitcher({ open, onClose, onCourseSelected }: CourseSwitcherProps) {
  const utils = trpc.useUtils();
  const { data: allCourses, isLoading: loadingCourses } = trpc.admin.getPublicCourses.useQuery();
  const { data: myEnrollments, isLoading: loadingEnrollments } = trpc.admin.myEnrollments.useQuery();
  const enrollSelf = trpc.admin.enrollSelf.useMutation({
    onSuccess: (_, vars) => {
      utils.admin.myEnrollments.invalidate();
      const course = allCourses?.find((c: any) => c.id === vars.courseId);
      toast.success(`Enrolled in ${course?.title ?? "course"}`);
      if (onCourseSelected && course) onCourseSelected(course.id, course.title);
    },
    onError: () => toast.error("Failed to enrol. Please try again."),
  });

  const enrolledIds = new Set((myEnrollments ?? []).map((e: any) => e.course.id));

  const grouped = (allCourses ?? []).reduce((acc: Record<string, any[]>, c: any) => {
    const key = `${GRADE_LABELS[c.gradeLevel] ?? `Grade ${c.gradeLevel}`}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Course Catalogue
          </DialogTitle>
          <DialogDescription>
            Browse all available courses and enrol to start learning. You can switch between enrolled courses at any time.
          </DialogDescription>
        </DialogHeader>

        {(loadingCourses || loadingEnrollments) ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 mt-2">
            {Object.entries(grouped).map(([gradeLabel, courses]) => (
              <div key={gradeLabel}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {gradeLabel}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(courses as any[]).map((course: any) => {
                    const enrolled = enrolledIds.has(course.id);
                    const colorClass = SUBJECT_COLORS[course.subject] ?? "bg-gray-100 text-gray-800 border-gray-200";
                    return (
                      <Card
                        key={course.id}
                        className={`border transition-all ${enrolled ? "border-primary/40 bg-primary/5" : "hover:border-border/80"}`}
                      >
                        <CardContent className="pt-4 pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm leading-snug">{course.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{course.description}</p>
                            </div>
                            {enrolled && (
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <Badge className={`text-xs border ${colorClass}`} variant="outline">
                              {course.subject}
                            </Badge>
                            {enrolled ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  if (onCourseSelected) onCourseSelected(course.id, course.title);
                                  onClose();
                                }}
                              >
                                Switch to this
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                disabled={enrollSelf.isPending}
                                onClick={() => enrollSelf.mutate({ courseId: course.id })}
                              >
                                {enrollSelf.isPending && enrollSelf.variables?.courseId === course.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <PlusCircle className="h-3 w-3 mr-1" />
                                )}
                                Enrol
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
