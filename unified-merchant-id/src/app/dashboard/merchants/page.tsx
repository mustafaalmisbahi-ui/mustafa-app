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
  }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "all";
  const city = params.city ?? "all";
  const data = await listMerchants({ query: q, status, city });

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
