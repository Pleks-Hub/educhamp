import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tag,
  Plus,
  Pencil,
  Archive,
  RefreshCw,
  Percent,
  DollarSign,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  PauseCircle,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  paused: "bg-amber-100 text-amber-700 border-amber-200",
  expired: "bg-slate-100 text-slate-600 border-slate-200",
  archived: "bg-red-100 text-red-600 border-red-200",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  active: <CheckCircle className="h-3.5 w-3.5" />,
  paused: <PauseCircle className="h-3.5 w-3.5" />,
  expired: <Clock className="h-3.5 w-3.5" />,
  archived: <XCircle className="h-3.5 w-3.5" />,
};

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
  discountType: "percentage" as "percentage" | "fixed",
  discountValue: 10,
  maxDiscountAmount: undefined as number | undefined,
  applicablePlans: [] as string[],
  eligibility: "all" as "all" | "new_users" | "parents" | "students" | "schools" | "selected",
  minAmount: undefined as number | undefined,
  usageLimit: undefined as number | undefined,
  perUserLimit: 1,
  duration: "once" as "once" | "repeating" | "forever",
  durationMonths: undefined as number | undefined,
  startDate: undefined as Date | undefined,
  expiresAt: undefined as Date | undefined,
  isStackable: false,
};

export function CouponManagerTab() {
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const utils = trpc.useUtils();

  const { data: coupons, isLoading } = trpc.payment.admin.listCoupons.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 100,
    offset: 0,
  });

  const createCoupon = trpc.payment.admin.createCoupon.useMutation({
    onSuccess: () => {
      toast.success("Coupon created successfully.");
      utils.payment.admin.listCoupons.invalidate();
      setShowCreate(false);
      setForm({ ...EMPTY_FORM });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateCoupon = trpc.payment.admin.updateCoupon.useMutation({
    onSuccess: () => {
      toast.success("Coupon updated.");
      utils.payment.admin.listCoupons.invalidate();
      setEditId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const archiveCoupon = trpc.payment.admin.archiveCoupon.useMutation({
    onSuccess: () => {
      toast.success("Coupon archived.");
      utils.payment.admin.listCoupons.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    const payload = {
      ...form,
      discountValue: Number(form.discountValue),
      perUserLimit: Number(form.perUserLimit) || 1,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined,
      minAmount: form.minAmount ? Number(form.minAmount) : undefined,
      durationMonths: form.durationMonths ? Number(form.durationMonths) : undefined,
    };
    if (editId !== null) {
      updateCoupon.mutate({ id: editId, data: payload });
    } else {
      createCoupon.mutate(payload);
    }
  };

  const openEdit = (coupon: any) => {
    setForm({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description ?? "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount ?? undefined,
      applicablePlans: (coupon.applicablePlans as string[]) ?? [],
      eligibility: coupon.eligibility,
      minAmount: coupon.minAmount ?? undefined,
      usageLimit: coupon.usageLimit ?? undefined,
      perUserLimit: coupon.perUserLimit,
      duration: coupon.duration,
      durationMonths: coupon.durationMonths ?? undefined,
      startDate: coupon.startDate ? new Date(coupon.startDate) : undefined,
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt) : undefined,
      isStackable: coupon.isStackable,
    });
    setEditId(coupon.id);
    setShowCreate(true);
  };

  const fmtDate = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString() : "—";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold">Coupon Manager</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => {
              setForm({ ...EMPTY_FORM });
              setEditId(null);
              setShowCreate(true);
            }}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            New Coupon
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading coupons…
                </TableCell>
              </TableRow>
            ) : !coupons?.rows?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No coupons found.
                </TableCell>
              </TableRow>
            ) : (
              coupons.rows.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div>
                      <p className="font-mono font-semibold text-sm">{c.code}</p>
                      <p className="text-xs text-muted-foreground">{c.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {c.discountType === "percentage" ? (
                        <Percent className="h-3.5 w-3.5 text-indigo-500" />
                      ) : (
                        <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                      <span className="font-medium">
                        {c.discountType === "percentage"
                          ? `${c.discountValue}%`
                          : `$${(c.discountValue / 100).toFixed(2)}`}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        · {c.duration}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {c.usageCount}
                      {c.usageLimit !== null ? ` / ${c.usageLimit}` : " / ∞"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {fmtDate(c.expiresAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`gap-1 capitalize ${STATUS_COLORS[c.status] ?? ""}`}
                    >
                      {STATUS_ICONS[c.status]}
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {c.status !== "archived" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => archiveCoupon.mutate({ id: c.id })}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        open={showCreate}
        onOpenChange={(v) => {
          if (!v) {
            setShowCreate(false);
            setEditId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId !== null ? "Edit Coupon" : "Create Coupon"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Code *</label>
                <Input
                  placeholder="WELCOME20"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="uppercase font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  placeholder="Welcome Discount"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Discount Type</label>
                <Select
                  value={form.discountType}
                  onValueChange={(v) =>
                    setForm({ ...form, discountType: v as "percentage" | "fixed" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Value {form.discountType === "percentage" ? "(%)" : "(cents)"}
                </label>
                <Input
                  type="number"
                  min={1}
                  value={form.discountValue}
                  onChange={(e) =>
                    setForm({ ...form, discountValue: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Duration</label>
                <Select
                  value={form.duration}
                  onValueChange={(v) =>
                    setForm({ ...form, duration: v as "once" | "repeating" | "forever" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="repeating">Repeating</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.duration === "repeating" && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Months</label>
                  <Input
                    type="number"
                    min={1}
                    value={form.durationMonths ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, durationMonths: Number(e.target.value) || undefined })
                    }
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Eligibility</label>
                <Select
                  value={form.eligibility}
                  onValueChange={(v) => setForm({ ...form, eligibility: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="new_users">New Users Only</SelectItem>
                    <SelectItem value="parents">Parents</SelectItem>
                    <SelectItem value="students">Students</SelectItem>
                    <SelectItem value="schools">Schools</SelectItem>
                    <SelectItem value="selected">Selected Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Per-User Limit</label>
                <Input
                  type="number"
                  min={1}
                  value={form.perUserLimit}
                  onChange={(e) =>
                    setForm({ ...form, perUserLimit: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Global Usage Limit</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={form.usageLimit ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, usageLimit: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Min Amount (cents)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="No minimum"
                  value={form.minAmount ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, minAmount: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={
                    form.startDate
                      ? form.startDate.toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      startDate: e.target.value ? new Date(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Expiry Date</label>
                <Input
                  type="date"
                  value={
                    form.expiresAt
                      ? form.expiresAt.toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      expiresAt: e.target.value ? new Date(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="stackable"
                checked={form.isStackable}
                onChange={(e) => setForm({ ...form, isStackable: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="stackable" className="text-sm">
                Allow stacking with other coupons
              </label>
            </div>
          </div>

          <Separator />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                setEditId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createCoupon.isPending || updateCoupon.isPending}
            >
              {editId !== null ? "Save Changes" : "Create Coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
