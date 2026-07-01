import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, Ban, RotateCcw, Volume2, AlertTriangle } from "lucide-react";

export function VoiceQualityTab() {
  const [daysBack, setDaysBack] = useState<number>(30);
  const [sortBy, setSortBy] = useState<"total" | "approval" | "name">("total");
  const [filter, setFilter] = useState("");
  const [deprecateDialog, setDeprecateDialog] = useState<{ voiceUri: string } | null>(null);
  const [deprecateReason, setDeprecateReason] = useState("");

  const { data, isLoading, refetch } = trpc.tts.adminGetVoiceReport.useQuery({ daysBack, sortBy });
  const deprecateMut = trpc.tts.adminDeprecateVoice.useMutation({
    onSuccess: () => { toast.success("Voice deprecated"); refetch(); setDeprecateDialog(null); setDeprecateReason(""); },
    onError: (e) => toast.error(e.message),
  });
  const undeprecateMut = trpc.tts.adminUndeprecateVoice.useMutation({
    onSuccess: () => { toast.success("Voice restored"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const voices = data?.voices ?? [];
  const deprecated = data?.deprecated ?? [];
  const deprecatedUris = new Set(deprecated.map(d => d.voiceUri));

  const filteredVoices = filter
    ? voices.filter(v => v.voiceUri.toLowerCase().includes(filter.toLowerCase()))
    : voices;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Voice Quality Report</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Filter by voice name..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-48"
          />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total">Most Rated</SelectItem>
              <SelectItem value="approval">Lowest Approval</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDaysBack(d)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                  daysBack === d
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{voices.length}</p>
          <p className="text-xs text-muted-foreground">Voices Rated</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{voices.reduce((s, v) => s + v.thumbsUp, 0)}</p>
          <p className="text-xs text-muted-foreground">Total Thumbs Up</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{voices.reduce((s, v) => s + v.thumbsDown, 0)}</p>
          <p className="text-xs text-muted-foreground">Total Thumbs Down</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{deprecated.length}</p>
          <p className="text-xs text-muted-foreground">Deprecated</p>
        </Card>
      </div>

      {/* Voice ratings table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">All Rated Voices</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No voice ratings found for this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voice</TableHead>
                  <TableHead className="text-center">👍</TableHead>
                  <TableHead className="text-center">👎</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Approval</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVoices.map((v) => (
                  <TableRow key={v.voiceUri}>
                    <TableCell className="font-medium text-sm max-w-[200px] truncate">{v.voiceUri}</TableCell>
                    <TableCell className="text-center text-green-600 font-medium">{v.thumbsUp}</TableCell>
                    <TableCell className="text-center text-red-600 font-medium">{v.thumbsDown}</TableCell>
                    <TableCell className="text-center">{v.total}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={v.approvalRate >= 70 ? "default" : v.approvalRate >= 40 ? "secondary" : "destructive"}>
                        {v.approvalRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {deprecatedUris.has(v.voiceUri) ? (
                        <Badge variant="destructive" className="text-xs"><Ban className="h-3 w-3 mr-1" />Deprecated</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {deprecatedUris.has(v.voiceUri) ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const dep = deprecated.find(d => d.voiceUri === v.voiceUri);
                            if (dep) undeprecateMut.mutate({ id: dep.id });
                          }}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />Restore
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeprecateDialog({ voiceUri: v.voiceUri })}
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" />Deprecate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Deprecated voices list */}
      {deprecated.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Deprecated Voices ({deprecated.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deprecated.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{d.voiceUri}</p>
                    {d.reason && <p className="text-xs text-muted-foreground">{d.reason}</p>}
                    <p className="text-xs text-muted-foreground">Deprecated {new Date(d.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => undeprecateMut.mutate({ id: d.id })}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />Restore
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deprecate dialog */}
      <Dialog open={!!deprecateDialog} onOpenChange={(open) => { if (!open) setDeprecateDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deprecate Voice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Mark <strong>{deprecateDialog?.voiceUri}</strong> as deprecated. Students using this voice will be encouraged to switch.
          </p>
          <Textarea
            placeholder="Reason (optional)..."
            value={deprecateReason}
            onChange={(e) => setDeprecateReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeprecateDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deprecateDialog) {
                  deprecateMut.mutate({ voiceUri: deprecateDialog.voiceUri, reason: deprecateReason || undefined });
                }
              }}
              disabled={deprecateMut.isPending}
            >
              <Ban className="h-4 w-4 mr-1" />Deprecate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
