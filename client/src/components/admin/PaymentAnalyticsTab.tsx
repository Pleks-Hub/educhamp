import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Tag,
  RefreshCw,
  AlertTriangle,
  Download,
} from "lucide-react";

const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
            {trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function exportCsv(rows: any[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h];
          if (v === null || v === undefined) return "";
          const s = String(v);
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PaymentAnalyticsTab() {
  const { data, isLoading } = trpc.payment.admin.getPaymentAnalytics.useQuery();

  const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading analytics…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <AlertTriangle className="h-5 w-5" />
        Failed to load analytics.
      </div>
    );
  }

  const planDistribution = Object.entries(data.planBreakdown ?? {}).map(([name, count]) => ({
    name: name.replace("_", " "),
    value: count as number,
  }));

  const billingDistribution = [
    { name: "Monthly", value: data.monthlyCount ?? 0 },
    { name: "Annual", value: data.annualCount ?? 0 },
  ];

  const recentEvents = (data.recentEvents ?? []).slice(0, 10);

  const handleExportPaymentEvents = () => {
    const rows = (data.recentEvents ?? []).map((e: any) => ({
      id: e.id,
      event: e.event,
      stripeObjectId: e.stripeObjectId ?? "",
      amountCents: e.amountCents ?? "",
      currency: e.currency ?? "usd",
      status: e.status ?? "",
      createdAt: new Date(e.createdAt).toISOString(),
    }));
    exportCsv(rows, `payment-events-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportPlanBreakdown = () => {
    const rows = Object.entries(data.planBreakdown ?? {}).map(([plan, count]) => ({
      plan,
      activeSubscriptions: count,
    }));
    exportCsv(rows, `plan-breakdown-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header with export buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Payment Analytics</h2>
          <p className="text-sm text-muted-foreground">Revenue, subscription, and coupon metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportPlanBreakdown}>
            <Download className="h-3.5 w-3.5" /> Plan CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportPaymentEvents}>
            <Download className="h-3.5 w-3.5" /> Events CSV
          </Button>
        </div>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Subscriptions"
          value={data.activeSubscriptions ?? 0}
          icon={Users}
          trend="up"
          sub="Currently active"
        />
        <StatCard
          title="Monthly Revenue"
          value={fmt(data.monthlyRevenueCents ?? 0)}
          icon={DollarSign}
          trend="up"
          sub="From active subs"
        />
        <StatCard
          title="Coupon Redemptions"
          value={data.totalRedemptions ?? 0}
          icon={Tag}
          sub={`${fmt(data.totalDiscountCents ?? 0)} total discounts`}
        />
        <StatCard
          title="Failed Payments"
          value={data.failedPayments ?? 0}
          icon={AlertTriangle}
          trend={data.failedPayments > 0 ? "down" : "neutral"}
          sub="Requires attention"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Plan distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Subscriptions by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {planDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {planDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} subs`, ""]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly vs Annual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Billing Period Split</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={billingDistribution} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Subscriptions" radius={[4, 4, 0, 0]}>
                  {billingDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent payment events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Payment Events</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No events yet.</p>
          ) : (
            <div className="space-y-2">
              {recentEvents.map((e: any) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{e.event}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.stripeObjectId ?? "—"} · {new Date(e.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {e.amountCents !== null && e.amountCents !== undefined && (
                      <p className="text-sm font-semibold">{fmt(e.amountCents)}</p>
                    )}
                    {e.status && (
                      <p
                        className={`text-xs capitalize ${
                          e.status === "paid" || e.status === "succeeded"
                            ? "text-emerald-600"
                            : e.status === "failed"
                            ? "text-red-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {e.status}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
