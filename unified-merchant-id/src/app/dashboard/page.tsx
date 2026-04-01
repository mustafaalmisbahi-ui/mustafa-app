import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSummary } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">لوحة التحكم</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="إجمالي التجار" value={summary.totalMerchants} />
        <MetricCard title="إجمالي الفروع" value={summary.totalBranches} />
        <MetricCard
          title="إجمالي حسابات المحافظ"
          value={summary.totalWalletAccounts}
        />
        <MetricCard
          title="فروع تحتاج تحديث"
          value={summary.needingUpdates}
          helperText="منطق مبدئي للـ MVP"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>أحدث التجار المضافين</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.recentMerchants.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد بيانات بعد.</p>
          ) : (
            <div className="space-y-3">
              {summary.recentMerchants.map((merchant) => (
                <div
                  key={merchant.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{merchant.storeName}</p>
                    <p className="text-sm text-muted-foreground">
                      {merchant.merchantCode} - {merchant.city}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(merchant.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
