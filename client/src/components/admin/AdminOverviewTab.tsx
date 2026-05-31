import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Users, GraduationCap, Brain, ClipboardList, BarChart3 } from "lucide-react";
import { NavTooltip } from "@/components/NavTooltip";
import { ADMIN_ACTION_TOOLTIPS } from "@/lib/tooltipContent";
import { StatCard } from "./adminHelpers";

export function AdminOverviewTab() {
  const { data: stats, isLoading, refetch } = trpc.admin.getStats.useQuery();
  if (isLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </div>
  );
  if (!stats) return <p className="text-muted-foreground">Failed to load stats.</p>;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Platform Overview</h2>
        <NavTooltip content={ADMIN_ACTION_TOOLTIPS.refresh} side="bottom">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </NavTooltip>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="bg-blue-500" />
        <StatCard icon={GraduationCap} label="Students" value={stats.totalStudents} color="bg-emerald-500" />
        <StatCard icon={Users} label="Parents" value={stats.totalParents} color="bg-violet-500" />
        <StatCard icon={Brain} label="Tutor Sessions" value={stats.totalSessions} color="bg-orange-500" />
        <StatCard icon={ClipboardList} label="Diagnostics Taken" value={stats.totalDiagnostics} color="bg-pink-500" />
        <StatCard icon={BarChart3} label="Quiz Attempts" value={stats.totalQuizAttempts} color="bg-cyan-500" />
      </div>
      <div>
        <h3 className="text-base font-semibold mb-3">Active Courses ({stats.courses.filter((c: any) => c.isActive).length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.courses.map((course: any) => (
            <Card key={course.id} className={`border ${course.isActive ? "border-border" : "border-dashed opacity-60"}`}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{course.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{course.subject} · Grade {course.gradeLevel}</p>
                  </div>
                  <Badge variant={course.isActive ? "default" : "secondary"}>
                    {course.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {course.isDefault && <Badge variant="outline" className="mt-2 text-xs">Default</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminOverviewTab;
