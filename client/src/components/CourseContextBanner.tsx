import { trpc } from "@/lib/trpc";
import { BookOpen, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const SUBJECT_COLORS: Record<string, string> = {
  math: "bg-blue-100 text-blue-800 border-blue-200",
  english: "bg-purple-100 text-purple-800 border-purple-200",
  ela: "bg-purple-100 text-purple-800 border-purple-200",
  science: "bg-emerald-100 text-emerald-800 border-emerald-200",
  biology: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "social studies": "bg-amber-100 text-amber-800 border-amber-200",
  geography: "bg-amber-100 text-amber-800 border-amber-200",
  spanish: "bg-rose-100 text-rose-800 border-rose-200",
  language: "bg-rose-100 text-rose-800 border-rose-200",
};

function getSubjectColor(subject: string) {
  const key = subject.toLowerCase();
  for (const [k, v] of Object.entries(SUBJECT_COLORS)) {
    if (key.includes(k)) return v;
  }
  return "bg-slate-100 text-slate-800 border-slate-200";
}

export function CourseContextBanner() {
  const utils = trpc.useUtils();
  const { data: dashboard, isLoading } = trpc.progress.getDashboard.useQuery();
  const { data: allProgress } = trpc.progress.getAllCourseProgress.useQuery();
  const switchCourse = trpc.progress.switchActiveCourse.useMutation({
    onSuccess: () => {
      utils.progress.getDashboard.invalidate();
      utils.progress.getAllCourseProgress.invalidate();
      toast.success("Switched course");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading || !dashboard) return null;

  const courseTitle = dashboard.courseTitle ?? "Your Course";
  const activeCourseId = dashboard.activeCourseId;
  const otherCourses = (allProgress ?? []).filter(
    (c: any) => c.courseId !== activeCourseId
  );

  const colorClass = getSubjectColor(courseTitle);

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium ${colorClass} mb-4`}>
      <BookOpen className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        Active Course: <span className="font-semibold">{courseTitle}</span>
      </span>
      {otherCourses.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 border border-current/20 hover:bg-black/5"
            >
              Switch <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Your Enrolled Courses</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs font-medium opacity-50 cursor-default">
              ✓ {courseTitle} (active)
            </DropdownMenuItem>
            {otherCourses.map((c: any) => (
              <DropdownMenuItem
                key={c.courseId}
                className="text-xs"
                onClick={() => switchCourse.mutate({ courseId: c.courseId })}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{c.courseTitle}</span>
                  <Badge variant="outline" className="text-xs ml-2">
                    {c.overallMastery}%
                  </Badge>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
