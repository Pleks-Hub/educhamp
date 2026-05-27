import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Sigma, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

function getMasteryLabel(score: number): string {
  if (score < 60) return "Beginner";
  if (score < 75) return "Developing";
  if (score < 90) return "Approaching";
  if (score < 100) return "Mastered";
  return "Advanced";
}

function getMasteryClass(score: number): string {
  if (score < 60) return "mastery-beginner";
  if (score < 75) return "mastery-developing";
  if (score < 90) return "mastery-approaching";
  if (score < 100) return "mastery-mastered";
  return "mastery-advanced";
}

function getMasteryBarColor(score: number): string {
  if (score < 60) return "bg-red-500";
  if (score < 75) return "bg-orange-500";
  if (score < 90) return "bg-yellow-500";
  if (score < 100) return "bg-green-500";
  return "bg-blue-500";
}

export default function Skills() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");

  const { data: skills, isLoading } = trpc.curriculum.getAllSkills.useQuery(undefined, { enabled: !!user });
  const { data: masteryData } = trpc.progress.getMastery.useQuery(undefined, { enabled: !!user });
  const { data: units } = trpc.curriculum.getUnits.useQuery();
  const { data: dashboard } = trpc.progress.getDashboard.useQuery(undefined, { enabled: !!user });
  const courseTitle = dashboard?.courseTitle ?? "";

  const masteryMap = useMemo(() => {
    const map = new Map<string, number>();
    (masteryData ?? []).forEach((m) => map.set(m.skillId, m.score));
    return map;
  }, [masteryData]);

  const filtered = useMemo(() => {
    return (skills ?? []).filter((skill) => {
      const matchesSearch =
        !search ||
        skill.skillId.toLowerCase().includes(search.toLowerCase()) ||
        skill.skillName.toLowerCase().includes(search.toLowerCase()) ||
        false;
      const matchesUnit =
        unitFilter === "all" ||
        skill.skillId.includes(`-U${unitFilter}-`);
      return matchesSearch && matchesUnit;
    });
  }, [skills, search, unitFilter]);

  // Group by unit
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach((skill) => {
      const unitKey = skill.skillId.split("-").slice(0, 2).join("-");
      if (!groups[unitKey]) groups[unitKey] = [];
      groups[unitKey].push(skill);
    });
    return groups;
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 page-enter">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 page-enter max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sigma className="h-6 w-6 text-primary" />
          Skill Index
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          All {(skills ?? []).length} {courseTitle ? `${courseTitle} ` : ""}skills with mastery tracking
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills..."
            className="pl-9 text-sm h-9"
          />
        </div>
        <Select value={unitFilter} onValueChange={setUnitFilter}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="All Units" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Units</SelectItem>
            {(units ?? []).map((u) => (
              <SelectItem key={u.unitNumber} value={String(u.unitNumber)}>
                Unit {u.unitNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Skill Groups */}
      {Object.keys(grouped).length === 0 ? (
        <Card className="border">
          <CardContent className="p-8 text-center">
            <Sigma className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No skills match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => {
              const numA = parseInt(a.split("-")[1]?.replace("U", "") ?? "0", 10);
              const numB = parseInt(b.split("-")[1]?.replace("U", "") ?? "0", 10);
              return numA - numB;
            })
            .map(([unitKey, unitSkills]) => {
              const unitNum = parseInt(unitKey.split("-")[1]?.replace("U", "") ?? "0", 10);
              const unit = (units ?? []).find((u) => u.unitNumber === unitNum);
              return (
                <div key={unitKey}>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-sm font-semibold text-foreground">
                      Unit {unitNum}{unit ? `: ${unit.title}` : ""}
                    </h2>
                    <Badge variant="secondary" className="text-xs">{unitSkills.length} skills</Badge>
                    <button
                      onClick={() => setLocation(`/curriculum/unit/${unitNum}`)}
                      className="ml-auto text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View Unit <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {unitSkills.map((skill) => {
                      const score = masteryMap.get(skill.skillId) ?? 0;
                      const hasScore = masteryMap.has(skill.skillId);
                      return (
                        <div
                          key={skill.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-mono font-bold text-primary shrink-0">
                                {skill.skillId}
                              </span>
                              <span className="text-sm text-foreground truncate">{skill.skillName}</span>
                            </div>

                            {skill.prerequisiteSkillIds && (skill.prerequisiteSkillIds as string[]).length > 0 && (
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                <span className="text-[10px] text-muted-foreground">Prereqs:</span>
                                {(skill.prerequisiteSkillIds as string[]).map((prereq) => (
                                  <span key={prereq} className="text-[10px] font-mono text-muted-foreground bg-muted px-1 rounded">
                                    {prereq}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {hasScore ? (
                            <div className="shrink-0 text-right min-w-[80px]">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${getMasteryBarColor(score)} rounded-full transition-all`}
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold text-foreground">{score}%</span>
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getMasteryClass(score)}`}>
                                {getMasteryLabel(score)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground shrink-0">Not assessed</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
