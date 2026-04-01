import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GlobalSearchForm } from "@/components/dashboard/global-search-form";
import { globalSearch } from "@/lib/data";
import { StatusBadge } from "@/components/dashboard/status-badge";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const results = query ? await globalSearch(query) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">البحث الشامل</h1>
        <p className="text-sm text-muted-foreground">
          ابحث برمز التاجر، رمز الفرع، اسم المتجر، الهاتف أو رقم المحفظة.
        </p>
      </div>

      <GlobalSearchForm defaultValue={query} />

      {!query ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            أدخل عبارة بحث لعرض النتائج.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>التجار</CardTitle>
              <CardDescription>{results?.merchants.length ?? 0} نتيجة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {results?.merchants.length ? (
                results.merchants.map((merchant) => (
                  <Link
                    key={merchant.id}
                    href={`/dashboard/merchants/${merchant.id}`}
                    className="block rounded-lg border p-3 transition hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{merchant.storeName}</p>
                      <StatusBadge status={merchant.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {merchant.merchantCode} - {merchant.phone}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد نتائج.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الفروع</CardTitle>
              <CardDescription>{results?.branches.length ?? 0} نتيجة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {results?.branches.length ? (
                results.branches.map((branch) => (
                  <Link
                    key={branch.id}
                    href={`/dashboard/merchants/${branch.merchantId}`}
                    className="block rounded-lg border p-3 transition hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{branch.branchName}</p>
                      <Badge variant="outline">{branch.branchCode}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {branch.merchant.storeName} - {branch.city}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد نتائج.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>المحافظ</CardTitle>
              <CardDescription>{results?.wallets.length ?? 0} نتيجة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {results?.wallets.length ? (
                results.wallets.map((wallet) => (
                  <Link
                    key={wallet.id}
                    href={`/dashboard/merchants/${wallet.branch.merchantId}`}
                    className="block rounded-lg border p-3 transition hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{wallet.walletProviderName}</p>
                      <StatusBadge status={wallet.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {wallet.walletNumber} - {wallet.branch.branchCode}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {wallet.branch.merchant.storeName}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد نتائج.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
