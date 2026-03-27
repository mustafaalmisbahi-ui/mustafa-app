import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  FileText,
  Package,
  ArrowUpLeft,
  ArrowDownLeft,
  Activity,
} from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PRODUCT_TYPE_LABELS, formatCurrency } from "@shared/constants";

export default function Home() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const { data: recentOrders } = trpc.orders.list.useQuery({});
  const { data: activity } = trpc.dashboard.recentActivity.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-heading">لوحة التحكم</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: "إجمالي الطلبات",
      value: stats?.totalOrders || 0,
      subtitle: `${stats?.activeOrders || 0} طلب نشط`,
      icon: ShoppingCart,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "إجمالي الإيرادات",
      value: formatCurrency(Number(stats?.totalRevenue || 0), "YER"),
      subtitle: "إجمالي المبيعات",
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      title: "صافي الأرباح",
      value: formatCurrency(Number(stats?.totalProfit || 0), "YER"),
      subtitle: "بعد خصم التكاليف",
      icon: TrendingUp,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/30",
    },
    {
      title: "العملاء",
      value: stats?.totalCustomers || 0,
      subtitle: `${stats?.pendingInvoices || 0} فاتورة معلقة`,
      icon: Users,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
  ];

  const recentOrdersList = (recentOrders || []).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold font-heading">لوحة التحكم</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            نظرة عامة على أداء المؤسسة
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          <Activity className="w-3 h-3 ml-1" />
          مباشر
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {kpiCards.map((kpi, i) => (
          <Card key={i} className="relative overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1 sm:space-y-2 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">
                    {kpi.title}
                  </p>
                  <p className="text-lg sm:text-2xl font-bold tracking-tight truncate">{kpi.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{kpi.subtitle}</p>
                </div>
                <div className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl ${kpi.bg} shrink-0`}>
                  <kpi.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low Stock Alert */}
      {stats?.lowStockCount && stats.lowStockCount > 0 ? (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  تنبيه المخزون
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  يوجد {stats.lowStockCount} صنف وصل للحد الأدنى من المخزون
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-heading">أحدث الطلبات</CardTitle>
              <a href="/orders" className="text-sm text-primary hover:underline">
                عرض الكل
              </a>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrdersList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">لا توجد طلبات بعد</p>
                <p className="text-xs mt-1">ابدأ بإنشاء أول طلب من صفحة الطلبات</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrdersList.map((order) => (
                  <a
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {order.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.orderNumber} • {PRODUCT_TYPE_LABELS[order.productType] || order.productType}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${ORDER_STATUS_COLORS[order.status] || ""}`}
                      >
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">سجل النشاط</CardTitle>
          </CardHeader>
          <CardContent>
            {!activity || activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">لا يوجد نشاط بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activity.slice(0, 10).map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      {item.action.includes("create") ? (
                        <ArrowUpLeft className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-blue-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm truncate">{item.details || item.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString("ar-SA", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
