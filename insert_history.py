#!/usr/bin/env python3
"""Insert HistoryPanel into Tutor.tsx"""

with open("client/src/pages/Tutor.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find line 530 (0-indexed: 529) which contains the Messages comment
target_line = None
for i, line in enumerate(lines):
    if "Messages" in line and "key fix" in line and "ScrollArea" in line:
        target_line = i
        break

if target_line is None:
    print("ERROR: target line not found")
    exit(1)

print(f"Found target at line {target_line + 1}: {lines[target_line].rstrip()}")

# Build the HistoryPanel insertion
history_panel_insert = '''        {activeTab === "history" && (
          <HistoryPanel
            sessions={historyQuery.data?.sessions ?? []}
            total={historyQuery.data?.total ?? 0}
            isLoading={historyQuery.isLoading}
            units={units}
            unitFilter={historyUnitFilter}
            modeFilter={historyModeFilter}
            page={historyPage}
            pageSize={HISTORY_PAGE_SIZE}
            onUnitFilter={(v) => { setHistoryUnitFilter(v); setHistoryPage(0); }}
            onModeFilter={(v) => { setHistoryModeFilter(v); setHistoryPage(0); }}
            onPageChange={setHistoryPage}
          />
        )}

'''

# Insert before the target line
lines.insert(target_line, history_panel_insert)

# Now find the closing of the main div (after the composer) and add HistoryPanel component before export default
# Find the last line (export default function)
export_line = None
for i, line in enumerate(lines):
    if line.strip().startswith("export default function Tutor"):
        export_line = i
        break

if export_line is None:
    print("ERROR: export default not found")
    exit(1)

print(f"Found export at line {export_line + 1}")

history_component = '''
// ─── HistoryPanel Component ───────────────────────────────────────────────────

const MODE_LABELS: Record<string, string> = {
  teach: "Teach",
  practice: "Practice",
  quiz: "Quiz",
  exam_review: "Exam Review",
  remediation: "Remediation",
  parent_summary: "Parent Summary",
};

interface HistoryPanelProps {
  sessions: Array<{
    id: number;
    unitId: number | null;
    mode: string;
    messages: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  isLoading: boolean;
  units: Array<{ id: number; unitNumber: number; title: string }>;
  unitFilter: string;
  modeFilter: string;
  page: number;
  pageSize: number;
  onUnitFilter: (v: string) => void;
  onModeFilter: (v: string) => void;
  onPageChange: (p: number) => void;
}

function HistoryPanel({
  sessions,
  total,
  isLoading,
  units,
  unitFilter,
  modeFilter,
  page,
  pageSize,
  onUnitFilter,
  onModeFilter,
  onPageChange,
}: HistoryPanelProps) {
  const totalPages = Math.ceil(total / pageSize);

  function exportCSV() {
    const rows = sessions.map((s) => {
      const msgs = (s.messages as Array<{ role: string; content: string; timestamp?: number }>) ?? [];
      const unit = units.find((u) => u.id === s.unitId);
      return [
        s.id,
        unit ? `U${unit.unitNumber}: ${unit.title}` : "",
        MODE_LABELS[s.mode] ?? s.mode,
        msgs.length,
        new Date(s.createdAt).toLocaleString(),
        new Date(s.updatedAt).toLocaleString(),
      ];
    });
    const header = ["Session ID", "Unit", "Mode", "Messages", "Started", "Last Active"];
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tutor-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    const data = sessions.map((s) => {
      const unit = units.find((u) => u.id === s.unitId);
      return {
        id: s.id,
        unit: unit ? { id: unit.id, number: unit.unitNumber, title: unit.title } : null,
        mode: s.mode,
        messages: s.messages,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tutor-sessions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Filter bar */}
      <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-3 flex-wrap shrink-0">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={unitFilter} onValueChange={onUnitFilter}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="All Units" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Units</SelectItem>
            {units.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                U{u.unitNumber}: {u.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={modeFilter} onValueChange={onModeFilter}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="All Modes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            {Object.entries(MODE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{total} session{total !== 1 ? "s" : ""}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={exportCSV}
            disabled={sessions.length === 0}
          >
            <Download className="h-3 w-3" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={exportJSON}
            disabled={sessions.length === 0}
          >
            <Download className="h-3 w-3" />
            JSON
          </Button>
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center space-y-3">
            <History className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No sessions found</p>
            <p className="text-xs text-muted-foreground/70">
              {unitFilter !== "all" || modeFilter !== "all"
                ? "Try adjusting your filters"
                : "Start a chat to see your session history here"}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl mx-auto">
            {sessions.map((s) => {
              const msgs = (s.messages as Array<{ role: string; content: string }>) ?? [];
              const unit = units.find((u) => u.id === s.unitId);
              const lastMsg = msgs.filter((m) => m.role === "assistant").at(-1);
              const preview = lastMsg?.content?.slice(0, 120) ?? "No messages yet";
              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/30 hover:bg-muted/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Brain className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {MODE_LABELS[s.mode] ?? s.mode}
                        </span>
                        {unit && (
                          <Badge variant="secondary" className="text-xs">
                            U{unit.unitNumber}: {unit.title}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">
                          {new Date(s.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {preview}{preview.length >= 120 ? "…" : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {msgs.length} message{msgs.length !== 1 ? "s" : ""} · Started {new Date(s.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t px-4 py-3 flex items-center justify-between shrink-0 bg-background">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

'''

lines.insert(export_line, history_component)

with open("client/src/pages/Tutor.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)

print(f"Done. Total lines: {len(lines)}")
