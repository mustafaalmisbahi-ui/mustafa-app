import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Clock, FileText, Package } from "lucide-react";
import { useRoute, useLocation } from "wouter";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PRODUCT_TYPE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  KANBAN_STAGES,
  formatCurrency,
} from "@shared/constants";

export default function OrderDetail() {
  const [, params] = useRoute("/orders/:id");
  const [, setLocation] = useLocation();
  const orderId = Number(params?.id);

  const { data: order, isLoading } = trpc.orders.getById.useQuery({ id: orderId }, { enabled: !!orderId });
  const { data: history } = trpc.orders.statusHistory.useQuery({ orderId }, { enabled: !!orderId });
  const { data: customer } = trpc.customers.getById.useQuery({ id: order?.customerId || 0 }, { enabled: !!order?.customerId });
  const utils = trpc.useUtils();

  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      utils.orders.getById.invalidate({ id: orderId });
      utils.orders.statusHistory.invalidate({ orderId });
      utils.orders.list.invalidate();
      toast.success("تم تحديث حالة الطلب");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Package className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">الطلب غير موجود</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/orders")}>
          العودة للطلبات
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/orders")} className="gap-1">
              <ArrowRight className="w-4 h-4" />
              الطلبات
            </Button>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold font-heading">{order.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">{order.orderNumber}</Badge>
            <Badge variant="secondary" className={`text-xs ${ORDER_STATUS_COLORS[order.status]}`}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
            <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[order.priority || "medium"]}`}>
              {PRIORITY_LABELS[order.priority || "medium"]}
            </Badge>
          </div>
        </div>
        <Select
          value={order.status}
          onValueChange={(v) => updateStatus.mutate({ id: orderId, status: v as any })}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="تغيير الحالة" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Order Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-heading">تفاصيل الطلب</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <InfoRow label="نوع المنتج" value={PRODUCT_TYPE_LABELS[order.productType]} />
              <InfoRow label="الكمية" value={`${order.quantity} قطعة`} />
              <InfoRow label="سعر الوحدة" value={order.unitPrice ? formatCurrency(Number(order.unitPrice), order.currency || "YER") : "-"} />
               <InfoRow label="إجمالي السعر" value={order.totalPrice ? formatCurrency(Number(order.totalPrice), order.currency || "YER") : "-"} />
               <InfoRow label="التكلفة" value={order.totalCost ? formatCurrency(Number(order.totalCost), order.currency || "YER") : "-"} />
               <InfoRow label="الربح" value={order.profit ? formatCurrency(Number(order.profit), order.currency || "YER") : "-"} />
              <InfoRow label="تاريخ الإنشاء" value={new Date(order.createdAt).toLocaleDateString("ar-SA")} />
              <InfoRow label="تاريخ التسليم المتوقع" value={order.dueDate ? new Date(order.dueDate).toLocaleDateString("ar-SA") : "-"} />
            </div>
            {order.notes && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">ملاحظات</p>
                <p className="text-sm">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-heading">بيانات العميل</CardTitle>
          </CardHeader>
          <CardContent>
            {customer ? (
              <div className="space-y-3">
                <InfoRow label="الاسم" value={customer.name} />
                <InfoRow label="الهاتف" value={customer.phone || "-"} />
                <InfoRow label="البريد" value={customer.email || "-"} />
                <InfoRow label="الشركة" value={customer.company || "-"} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Production Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">خط سير الإنتاج</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {KANBAN_STAGES.map((stage, i) => {
              const currentIdx = KANBAN_STAGES.indexOf(order.status as any);
              const isCompleted = i < currentIdx;
              const isCurrent = order.status === stage;
              return (
                <div key={stage} className="flex items-center shrink-0">
                  <div
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : isCompleted
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {ORDER_STATUS_LABELS[stage]}
                  </div>
                  {i < KANBAN_STAGES.length - 1 && (
                    <div className={`w-6 h-0.5 mx-1 ${i < currentIdx ? "bg-primary" : "bg-muted"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">سجل التحديثات</CardTitle>
        </CardHeader>
        <CardContent>
          {!history || history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد تحديثات</p>
          ) : (
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm">
                      {h.fromStatus ? (
                        <>
                          <span className="text-muted-foreground">{ORDER_STATUS_LABELS[h.fromStatus] || h.fromStatus}</span>
                          {" ← "}
                          <span className="font-medium">{ORDER_STATUS_LABELS[h.toStatus] || h.toStatus}</span>
                        </>
                      ) : (
                        <span className="font-medium">{ORDER_STATUS_LABELS[h.toStatus] || h.toStatus}</span>
                      )}
                    </p>
                    {h.notes && <p className="text-xs text-muted-foreground mt-1">{h.notes}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(h.createdAt).toLocaleDateString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
