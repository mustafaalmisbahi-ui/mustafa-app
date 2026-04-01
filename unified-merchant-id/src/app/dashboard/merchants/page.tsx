import Link from "next/link";
import { listMerchants } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/dashboard/search-box";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function MerchantsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    city?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "all";
  const city = params.city ?? "all";
  const page = Number(params.page ?? "1");
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const pageSize = 10;
  const data = await listMerchants({
    query: q,
    status,
    city,
    page: safePage,
    pageSize,
  });
  const pagination = data.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">إدارة التجار</h1>
          <p className="text-sm text-muted-foreground">
            إدارة بيانات التجار والفروع والمحافظ المرتبطة.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/merchants/new">إضافة تاجر</Link>
        </Button>
      </div>

      <SearchBox
        basePath="/dashboard/merchants"
        query={q}
        status={status}
        city={city}
        cityOptions={data.cities}
      />

      <Card>
        <CardHeader>
          <CardTitle>قائمة التجار</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رمز التاجر</TableHead>
                <TableHead>اسم المتجر</TableHead>
                <TableHead>المدينة</TableHead>
                <TableHead>نوع النشاط</TableHead>
                <TableHead>عدد الفروع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.merchants.map((merchant) => (
                <TableRow key={merchant.id}>
                  <TableCell className="font-medium">{merchant.merchantCode}</TableCell>
                  <TableCell>{merchant.storeName}</TableCell>
                  <TableCell>{merchant.city}</TableCell>
                  <TableCell>{merchant.businessType}</TableCell>
                  <TableCell>{merchant._count.branches}</TableCell>
                  <TableCell>
                    <StatusBadge status={merchant.status} />
                  </TableCell>
                  <TableCell className="text-left">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/merchants/${merchant.id}`}>عرض</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              صفحة {pagination.page} من {pagination.totalPages} - إجمالي النتائج:{" "}
              {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
              >
                <Link
                  href={`/dashboard/merchants?q=${encodeURIComponent(q)}&status=${status}&city=${city}&page=${Math.max(1, pagination.page - 1)}`}
                  aria-disabled={pagination.page <= 1}
                  tabIndex={pagination.page <= 1 ? -1 : undefined}
                >
                  السابق
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
              >
                <Link
                  href={`/dashboard/merchants?q=${encodeURIComponent(q)}&status=${status}&city=${city}&page=${Math.min(pagination.totalPages, pagination.page + 1)}`}
                  aria-disabled={pagination.page >= pagination.totalPages}
                  tabIndex={pagination.page >= pagination.totalPages ? -1 : undefined}
                >
                  التالي
                </Link>
              </Button>
            </div>
          </div>
          {data.merchants.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
