import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ListTodo } from "lucide-react";
import { useLocation } from "wouter";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-blue-400",
  medium: "bg-amber-400",
  high: "bg-red-400",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "border-l-amber-400",
  in_progress: "border-l-blue-400",
  completed: "border-l-green-400",
  overdue: "border-l-red-400",
};

type ViewMode = "month" | "week";

export default function TaskCalendar() {
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  const { startDate, endDate } = useMemo(() => {
    if (viewMode === "month") {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      // Extend to full weeks
      start.setDate(start.getDate() - start.getDay());
      end.setDate(end.getDate() + (6 - end.getDay()));
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    } else {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
  }, [currentDate, viewMode]);

  const { data: tasks, isLoading } = trpc.parentTasks.getTaskCalendar.useQuery(
    { startDate, endDate },
    { refetchInterval: 60_000 }
  );

  const navigate_prev = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const navigate_next = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const calendarDays = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days: Date[] = [];
    const d = new Date(start);
    while (d <= end) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [startDate, endDate]);

  const getTasksForDay = (day: Date) => {
    if (!tasks) return [];
    const dayStr = day.toISOString().split("T")[0];
    return tasks.filter(t => {
      const due = t.dueDate ? t.dueDate.split("T")[0] : null;
      const start = t.startDate ? t.startDate.split("T")[0] : null;
      return due === dayStr || start === dayStr;
    });
  };

  const today = new Date().toISOString().split("T")[0];
  const isCurrentMonth = (day: Date) => day.getMonth() === currentDate.getMonth();

  return (
    <div className="container max-w-5xl py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Task Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">View your tasks and deadlines at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/my-tasks")}>
            <ListTodo className="h-3.5 w-3.5 mr-1" /> List View
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigate_prev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[200px] text-center">
                {viewMode === "month"
                  ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                  : `Week of ${new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                }
              </h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigate_next}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
              <Button
                variant={viewMode === "week" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setViewMode("week")}
              >
                Week
              </Button>
              <Button
                variant={viewMode === "month" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setViewMode("month")}
              >
                Month
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded" />
              ))}
            </div>
          ) : (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAYS.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  const dayTasks = getTasksForDay(day);
                  const dayStr = day.toISOString().split("T")[0];
                  const isToday = dayStr === today;
                  const inMonth = isCurrentMonth(day);

                  return (
                    <div
                      key={i}
                      className={`min-h-[80px] sm:min-h-[100px] rounded-md border p-1 transition-colors ${
                        isToday ? "bg-primary/5 border-primary/30" : "border-border/50"
                      } ${!inMonth && viewMode === "month" ? "opacity-40" : ""}`}
                    >
                      <div className={`text-xs font-medium mb-0.5 ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {dayTasks.slice(0, 3).map(task => (
                          <div
                            key={task.id}
                            className={`text-[10px] sm:text-xs px-1 py-0.5 rounded border-l-2 bg-muted/50 truncate cursor-pointer hover:bg-muted transition-colors ${STATUS_STYLE[task.status] ?? ""}`}
                            title={`${task.title} (${task.priority} priority)`}
                            onClick={() => navigate("/my-tasks")}
                          >
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-0.5 ${PRIORITY_DOT[task.priority]}`} />
                            {task.title}
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <div className="text-[10px] text-muted-foreground pl-1">
                            +{dayTasks.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Low</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Medium</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> High</span>
        <span className="mx-2">|</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-400" /> Pending</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400" /> In Progress</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-400" /> Completed</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400" /> Overdue</span>
      </div>
    </div>
  );
}
