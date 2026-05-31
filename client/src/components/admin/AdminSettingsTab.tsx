import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { DEFAULT_SETTINGS } from "./adminHelpers";

export function AdminSettingsTab() {
  const { data: settings, isLoading, refetch } = trpc.admin.getSettings.useQuery();
  const upsert = trpc.admin.upsertSetting.useMutation({ onSuccess: () => { toast.success("Setting saved"); refetch(); } });
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const getValue = (key: string) => {
    const saved = (settings ?? []).find((s: any) => s.key === key);
    return editValues[key] ?? saved?.value ?? DEFAULT_SETTINGS.find(d => d.key === key)?.value ?? "";
  };
  const isBool = (key: string) => ["true", "false"].includes(getValue(key));
  const categories = Array.from(new Set(DEFAULT_SETTINGS.map(s => s.category)));
  if (isLoading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  return (
    <div className="space-y-8">
      {categories.map(cat => (
        <div key={cat}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 capitalize">{cat}</h3>
          <div className="space-y-3">
            {DEFAULT_SETTINGS.filter(s => s.category === cat).map(setting => (
              <div key={setting.key} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div>
                  <p className="text-sm font-medium">{setting.label}</p>
                  <p className="text-xs text-muted-foreground font-mono">{setting.key}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isBool(setting.key) ? (
                    <Switch
                      checked={getValue(setting.key) === "true"}
                      onCheckedChange={(v) => {
                        const val = v ? "true" : "false";
                        setEditValues(prev => ({ ...prev, [setting.key]: val }));
                        upsert.mutate({ key: setting.key, value: val, description: setting.label });
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={getValue(setting.key)}
                        onChange={(e) => setEditValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                        className="h-8 w-48 text-sm"
                      />
                      <Button size="sm" variant="outline" className="h-8"
                        onClick={() => upsert.mutate({ key: setting.key, value: getValue(setting.key), description: setting.label })}>
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default AdminSettingsTab;
