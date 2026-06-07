import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Zap, TestTube, Save, Globe, History, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { nanoid } from "nanoid";

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  type: "slack" | "discord" | "generic";
}

const AVAILABLE_EVENTS = [
  { id: "demo_request", label: "New Demo Request", description: "When a school submits a demo/pilot request" },
  { id: "billing_issue", label: "Billing Issue", description: "Payment failures, subscription problems" },
  { id: "new_signup", label: "New Signup", description: "When a new user registers" },
  { id: "system_error", label: "System Error", description: "Critical system errors or downtime" },
  { id: "course_request", label: "Course Request", description: "When a parent requests a new course" },
  { id: "referral_redeemed", label: "Referral Redeemed", description: "When a referral code is used" },
];

export function AlertWebhooksTab() {
  const { data: configs, isLoading } = trpc.admin.getWebhookConfigs.useQuery();
  const [localConfigs, setLocalConfigs] = useState<WebhookConfig[] | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const saveMutation = trpc.admin.saveWebhookConfigs.useMutation({
    onSuccess: () => {
      toast.success("Webhook configurations saved");
      setHasChanges(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const testMutation = trpc.admin.testWebhook.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Test message sent successfully!");
      } else {
        toast.error(`Test failed: ${result.error}`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  // Use local state if modified, otherwise use server data
  const webhooks: WebhookConfig[] = localConfigs ?? (configs as WebhookConfig[] | undefined) ?? [];

  const updateConfigs = (newConfigs: WebhookConfig[]) => {
    setLocalConfigs(newConfigs);
    setHasChanges(true);
  };

  const addWebhook = () => {
    updateConfigs([
      ...webhooks,
      {
        id: nanoid(10),
        name: "",
        url: "",
        events: ["demo_request", "billing_issue"],
        enabled: true,
        type: "slack",
      },
    ]);
  };

  const removeWebhook = (id: string) => {
    updateConfigs(webhooks.filter((w) => w.id !== id));
  };

  const updateWebhook = (id: string, updates: Partial<WebhookConfig>) => {
    updateConfigs(
      webhooks.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );
  };

  const toggleEvent = (webhookId: string, eventId: string) => {
    const webhook = webhooks.find((w) => w.id === webhookId);
    if (!webhook) return;
    const events = webhook.events.includes(eventId)
      ? webhook.events.filter((e) => e !== eventId)
      : [...webhook.events, eventId];
    updateWebhook(webhookId, { events });
  };

  const handleSave = () => {
    // Validate
    for (const w of webhooks) {
      if (!w.name.trim()) {
        toast.error("All webhooks must have a name");
        return;
      }
      if (!w.url.trim()) {
        toast.error(`Webhook "${w.name}" needs a URL`);
        return;
      }
      try {
        new URL(w.url);
      } catch {
        toast.error(`Webhook "${w.name}" has an invalid URL`);
        return;
      }
      if (w.events.length === 0) {
        toast.error(`Webhook "${w.name}" must subscribe to at least one event`);
        return;
      }
    }
    saveMutation.mutate({ configs: webhooks });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Alert Webhooks
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Send critical admin alerts to Slack, Discord, or custom webhook endpoints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-1" />
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          )}
          <Button variant="outline" onClick={addWebhook}>
            <Plus className="h-4 w-4 mr-1" />
            Add Webhook
          </Button>
        </div>
      </div>

      {/* Webhook Cards */}
      {webhooks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-base font-medium mb-1">No webhooks configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add a Slack or Discord webhook to receive critical alerts about your platform.
            </p>
            <Button variant="outline" onClick={addWebhook}>
              <Plus className="h-4 w-4 mr-1" />
              Add Your First Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        webhooks.map((webhook) => (
          <Card key={webhook.id} className={!webhook.enabled ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Switch
                    checked={webhook.enabled}
                    onCheckedChange={(checked) => updateWebhook(webhook.id, { enabled: checked })}
                  />
                  <Input
                    value={webhook.name}
                    onChange={(e) => updateWebhook(webhook.id, { name: e.target.value })}
                    placeholder="Webhook name (e.g., #alerts-channel)"
                    className="max-w-[250px] font-medium"
                  />
                  <Badge variant="secondary" className="text-xs">
                    {webhook.type}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testMutation.mutate(webhook)}
                    disabled={!webhook.url || testMutation.isPending}
                  >
                    <TestTube className="h-3.5 w-3.5 mr-1" />
                    Test
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWebhook(webhook.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* URL and Type */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Webhook URL</Label>
                  <Input
                    value={webhook.url}
                    onChange={(e) => updateWebhook(webhook.id, { url: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                    type="url"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
                  <Select
                    value={webhook.type}
                    onValueChange={(v) => updateWebhook(webhook.id, { type: v as WebhookConfig["type"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slack">Slack</SelectItem>
                      <SelectItem value="discord">Discord</SelectItem>
                      <SelectItem value="generic">Generic (JSON)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Events */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Subscribed Events ({webhook.events.length} selected)
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {AVAILABLE_EVENTS.map((event) => (
                    <label
                      key={event.id}
                      className="flex items-start gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={webhook.events.includes(event.id)}
                        onCheckedChange={() => toggleEvent(webhook.id, event.id)}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium">{event.label}</span>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Info */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>How it works:</strong> When a subscribed event occurs on your platform, a formatted message
            is sent to the configured webhook URL. Slack and Discord messages include rich formatting with
            severity indicators. Generic webhooks receive a JSON payload with event details.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function DeliveryLogsPanel() {
  const { data: logs, isLoading, refetch } = trpc.admin.getWebhookDeliveryLogs.useQuery(undefined, { staleTime: 30_000 });
  const clearMutation = trpc.admin.clearWebhookDeliveryLogs.useMutation({
    onSuccess: () => { toast.success("Delivery logs cleared"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-48 w-full" /></div>;
  }

  const entries = (logs ?? []) as Array<{
    id: string; webhookId: string; webhookName: string; event: string;
    title: string; status: "success" | "failed"; statusCode?: number;
    error?: string; sentAt: string; durationMs: number;
  }>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing last {entries.length} delivery attempts (max 200 stored)
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
          {entries.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => clearMutation.mutate()} disabled={clearMutation.isPending}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear Logs
            </Button>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-base font-medium mb-1">No delivery logs yet</h3>
            <p className="text-sm text-muted-foreground">
              Delivery logs will appear here once alerts are triggered.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Time</TableHead>
                <TableHead>Webhook</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead className="w-[70px]">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(entry.sentAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{entry.webhookName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{entry.event}</Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{entry.title}</TableCell>
                  <TableCell>
                    {entry.status === "success" ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {entry.statusCode}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 text-xs" title={entry.error}>
                        <XCircle className="h-3.5 w-3.5" /> {entry.statusCode ?? "Err"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{entry.durationMs}ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function AlertWebhooksTabWrapper() {
  return (
    <Tabs defaultValue="config" className="w-full">
      <TabsList>
        <TabsTrigger value="config">
          <Zap className="h-3.5 w-3.5 mr-1" /> Configuration
        </TabsTrigger>
        <TabsTrigger value="logs">
          <History className="h-3.5 w-3.5 mr-1" /> Delivery Logs
        </TabsTrigger>
      </TabsList>
      <TabsContent value="config" className="mt-4">
        <AlertWebhooksTab />
      </TabsContent>
      <TabsContent value="logs" className="mt-4">
        <DeliveryLogsPanel />
      </TabsContent>
    </Tabs>
  );
}

export default AlertWebhooksTabWrapper;
