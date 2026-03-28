import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  FileText,
  ChevronLeft,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PRODUCT_TYPE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  KANBAN_STAGES,
  CURRENCIES,
  formatCurrency,
} from "@shared/constants";

type ViewMode = "kanban" | "list";

export default function Orders() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: orders, isLoading } = trpc.orders.list.useQuery({
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(search ? { search } : {}),
  });
  const { data: customers } = trpc.customers.list.useQuery({});
  const { data: nextNumber } = trpc.orders.getNextNumber.useQuery();
  const utils = trpc.useUtils();

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: () => {
      utils.orders.list.invalidate();
      utils.orders.getNextNumber.invalidate();
      utils.dashboard.stats.invalidate();
      setShowCreateDialog(false);
      toast.success("تم إنشاء الطلب بنجاح");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      utils.orders.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("تم تحديث حالة الطلب");
    },
    onError: (err) => toast.error(err.message),
  });

  const [newOrder, setNewOrder] = useState({
    customerId: 0,
    productType: "magazine" as const,
    title: "",
    description: "",
    quantity: 1,
    priority: "medium" as const,
    currency: "YER" as "YER" | "SAR" | "USD",
    notes: "",
  });

  const kanbanData = useMemo(() => {
    if (!orders) return {};
    const grouped: Record<string, typeof orders> = {};
    KANBAN_STAGES.forEach((stage) => {
      grouped[stage] = orders.filter((o) => o.status === stage);
    });
    return grouped;
  }, [orders]);

  const handleCreateOrder = () => {
    if (!newOrder.title || !newOrder.customerId) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    createOrder.mutate({
      orderNumber: nextNumber || "ORD-0001",
      ...newOrder,
    });
  };

  const handleMoveForward = (orderId: number, currentStatus: string) => {
    const idx = KANBAN_STAGES.indexOf(currentStatus as any);
    if (idx < KANBAN_STAGES.length - 1) {
      updateStatus.mutate({ id: orderId, status: KANBAN_STAGES[idx + 1] as any });
    } else {
      updateStatus.mutate({ id: orderId, status: "delivered" });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold font-heading">إدارة الطلبات</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {orders?.length || 0} طلب
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-2 rounded-md transition-colors ${viewMode === "kanban" ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 flex-1 sm:flex-none">
                <Plus className="w-4 h-4" />
                طلب جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading">إنشاء طلب جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>رقم الطلب</Label>
                    <Input value={nextNumber || ""} disabled className="mt-1" />
                  </div>
                  <div>
                    <Label>العميل *</Label>
                    <Select onValueChange={(v) => setNewOrder((p) => ({ ...p, customerId: Number(v) }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                      <SelectContent>
                        {(customers || []).map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>عنوان الطلب *</Label>
                  <Input className="mt-1" value={newOrder.title} onChange={(e) => setNewOrder((p) => ({ ...p, title: e.target.value }))} placeholder="مثال: مجلة الشركة - العدد 5" />
                </div>
                <div>
                  <Label>العملة</Label>
                  <Select value={newOrder.currency} onValueChange={(v) => setNewOrder((p) => ({ ...p, currency: v as "YER" | "SAR" | "USD" }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.flag} {c.label} ({c.symbol})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>نوع المنتج</Label>
                    <Select value={newOrder.productType} onValueChange={(v: any) => setNewOrder((p) => ({ ...p, productType: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRODUCT_TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>الكمية</Label>
                    <Input type="number" className="mt-1" value={newOrder.quantity} onChange={(e) => setNewOrder((p) => ({ ...p, quantity: Number(e.target.value) }))} min={1} />
                  </div>
                  <div>
                    <Label>الأولوية</Label>
                    <Select value={newOrder.priority} onValueChange={(v: any) => setNewOrder((p) => ({ ...p, priority: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>ملاحظات</Label>
                  <Textarea className="mt-1" value={newOrder.notes} onChange={(e) => setNewOrder((p) => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>
                <Button onClick={handleCreateOrder} className="w-full" disabled={createOrder.isPending}>
                  {createOrder.isPending ? "جاري الإنشاء..." : "إنشاء الطلب"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            className="pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="جميع الحالات" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === "kanban" ? (
        <div className="overflow-x-auto pb-4 -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex gap-3 sm:gap-4" style={{ minWidth: `${KANBAN_STAGES.length * 260}px` }}>
            {KANBAN_STAGES.map((stage) => (
              <div key={stage} className="w-[240px] sm:w-[270px] shrink-0">
                <div className="flex items-center justify-between mb-2 sm:mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={`text-[10px] ${ORDER_STATUS_COLORS[stage]}`}>
                      {ORDER_STATUS_LABELS[stage]}
                    </Badge>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      ({kanbanData[stage]?.length || 0})
                    </span>
                  </div>
                </div>
                <div className="space-y-2 min-h-[200px] bg-muted/30 rounded-xl p-2">
                  {(kanbanData[stage] || []).map((order) => (
                    <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <a href={`/orders/${order.id}`} className="text-sm font-medium hover:text-primary truncate flex-1">
                            {order.title}
                          </a>
                          <Badge variant="outline" className={`text-[10px] shrink-0 mr-2 ${PRIORITY_COLORS[order.priority || "medium"]}`}>
                            {PRIORITY_LABELS[order.priority || "medium"]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <span>{order.orderNumber}</span>
                          <span>•</span>
                          <span>{PRODUCT_TYPE_LABELS[order.productType]}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {order.quantity} قطعة
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 opacity-70 group-hover:opacity-100"
                            onClick={(e) => {
                              e.preventDefault();
                              handleMoveForward(order.id, order.status);
                            }}
                          >
                            التالي
                            <ChevronLeft className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* List View - Card-based on mobile, table on desktop */
        <>
          {/* Mobile Card View */}
          <div className="space-y-2 sm:hidden">
            {(orders || []).map((order) => (
              <a key={order.id} href={`/orders/${order.id}`} className="block">
                <Card className="hover:shadow-md transition-shadow active:bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{order.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.orderNumber} • {PRODUCT_TYPE_LABELS[order.productType]} • {order.quantity} قطعة
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 mr-2 ${PRIORITY_COLORS[order.priority || "medium"]}`}>
                        {PRIORITY_LABELS[order.priority || "medium"]}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="secondary" className={`text-[10px] ${ORDER_STATUS_COLORS[order.status]}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("ar-SA")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">رقم الطلب</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">العنوان</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">المنتج</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">الكمية</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">الحالة</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">الأولوية</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(orders || []).map((order) => (
                      <tr key={order.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <a href={`/orders/${order.id}`} className="text-sm font-medium text-primary hover:underline">
                            {order.orderNumber}
                          </a>
                        </td>
                        <td className="p-3 text-sm">{order.title}</td>
                        <td className="p-3 text-sm">{PRODUCT_TYPE_LABELS[order.productType]}</td>
                        <td className="p-3 text-sm">{order.quantity}</td>
                        <td className="p-3">
                          <Badge variant="secondary" className={`text-[10px] ${ORDER_STATUS_COLORS[order.status]}`}>
                            {ORDER_STATUS_LABELS[order.status]}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[order.priority || "medium"]}`}>
                            {PRIORITY_LABELS[order.priority || "medium"]}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("ar-SA")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {(!orders || orders.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">لا توجد طلبات</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
