import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  createBranchAction,
  createWalletAction,
  deleteBranchAction,
  deleteWalletAction,
  updateBranchAction,
  updateWalletAction,
} from "@/actions/merchant";
import { getMerchantById } from "@/lib/data";
import { formatDateArabic } from "@/lib/format";
import { MerchantActions } from "@/components/dashboard/merchant-actions";
import { BranchForm } from "@/components/dashboard/branch-form";
import { WalletForm } from "@/components/dashboard/wallet-form";
import { DeleteButton } from "@/components/dashboard/delete-button";
import { StatusBadge } from "@/components/dashboard/status-badge";

export default async function MerchantDetailsPage(props: PageProps<"/dashboard/merchants/[id]">) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const rawBranchQuery = searchParams.branchQ;
  const branchQuery =
    typeof rawBranchQuery === "string"
      ? rawBranchQuery.trim()
      : Array.isArray(rawBranchQuery)
        ? (rawBranchQuery[0] ?? "").trim()
        : "";
  const merchant = await getMerchantById(params.id);
  if (!merchant) {
    notFound();
  }

  const filteredBranches = branchQuery
    ? merchant.branches.filter((branch) =>
        `${branch.branchCode} ${branch.branchName} ${branch.city} ${branch.district}`
          .toLowerCase()
          .includes(branchQuery.toLowerCase()),
      )
    : merchant.branches;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{merchant.storeName}</h1>
          <p className="text-sm text-muted-foreground">
            الرمز الموحد: <span className="font-medium">{merchant.merchantCode}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MerchantActions merchantId={merchant.id} />
          <Button asChild variant="outline">
            <Link href={`/dashboard/merchants/${merchant.id}/print/sign`}>
              طباعة لوحة الدفع
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/dashboard/merchants/${merchant.id}/print/cashier-card`}>
              طباعة بطاقة التشغيل
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>بيانات التاجر</CardTitle>
          <CardDescription>المعلومات الأساسية وبيانات التواصل</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-muted-foreground">اسم المالك</p>
            <p className="font-medium">{merchant.ownerName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">الهاتف</p>
            <p className="font-medium">{merchant.phone}</p>
          </div>
          <div>
            <p className="text-muted-foreground">الحالة</p>
            <StatusBadge status={merchant.status} />
          </div>
          <div>
            <p className="text-muted-foreground">المدينة</p>
            <p className="font-medium">{merchant.city}</p>
          </div>
          <div>
            <p className="text-muted-foreground">المديرية / الحي</p>
            <p className="font-medium">{merchant.district}</p>
          </div>
          <div>
            <p className="text-muted-foreground">نوع النشاط</p>
            <p className="font-medium">{merchant.businessType}</p>
          </div>
          <div className="md:col-span-3">
            <p className="text-muted-foreground">العنوان</p>
            <p className="font-medium">{merchant.address}</p>
          </div>
          {merchant.notes ? (
            <div className="md:col-span-3">
              <p className="text-muted-foreground">ملاحظات</p>
              <p className="font-medium">{merchant.notes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إضافة فرع جديد</CardTitle>
          <CardDescription>
            سيتم إنشاء رمز الفرع تلقائيًا مثل: {merchant.merchantCode}-01
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BranchForm
            submitLabel="إضافة الفرع"
            action={createBranchAction.bind(null, merchant.id)}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <form className="grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                type="text"
                name="branchQ"
                defaultValue={branchQuery}
                placeholder="بحث داخل الفروع (بالاسم أو الرمز أو الموقع)"
                className="h-10 rounded-md border px-3 text-sm"
              />
              <Button type="submit" variant="outline">
                بحث
              </Button>
            </form>
          </CardContent>
        </Card>
        {filteredBranches.map((branch) => (
          <Card key={branch.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">
                    {branch.branchName} <span className="text-muted-foreground">({branch.branchCode})</span>
                  </CardTitle>
                  <CardDescription>
                    {branch.city} - {branch.district}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={branch.status} />
                  <DeleteButton
                    action={deleteBranchAction.bind(null, branch.id)}
                    label="حذف الفرع"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <BranchForm
                submitLabel="تحديث بيانات الفرع"
                action={updateBranchAction.bind(null, merchant.id, branch.id)}
                defaultValues={{
                  branchName: branch.branchName,
                  city: branch.city,
                  district: branch.district,
                  locationDescription: branch.locationDescription,
                  status: branch.status,
                  notes: branch.notes ?? "",
                }}
              />

              <Separator />

              <div className="space-y-3">
                <h3 className="text-base font-semibold">إضافة محفظة جديدة</h3>
                <WalletForm
                  submitLabel="إضافة المحفظة"
                  action={createWalletAction.bind(null, merchant.id, branch.id)}
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold">محافظ الفرع</h3>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المزود</TableHead>
                        <TableHead className="text-right">رقم المحفظة</TableHead>
                        <TableHead className="text-right">اسم الحساب</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">آخر تحديث</TableHead>
                        <TableHead className="text-right">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branch.walletAccounts.length ? (
                        branch.walletAccounts.map((wallet) => (
                          <TableRow key={wallet.id}>
                            <TableCell>{wallet.walletProviderName}</TableCell>
                            <TableCell className="font-medium">{wallet.walletNumber}</TableCell>
                            <TableCell>{wallet.accountName ?? "-"}</TableCell>
                            <TableCell>
                              <StatusBadge status={wallet.status} />
                            </TableCell>
                            <TableCell>{formatDateArabic(wallet.updatedAt)}</TableCell>
                            <TableCell>
                              <details className="space-y-2">
                                <summary className="cursor-pointer text-sm text-primary">
                                  تعديل
                                </summary>
                                <WalletForm
                                  submitLabel="حفظ التعديل"
                                  action={updateWalletAction.bind(
                                    null,
                                    merchant.id,
                                    branch.id,
                                    wallet.id,
                                  )}
                                  defaultValues={{
                                    walletProviderName: wallet.walletProviderName,
                                    walletNumber: wallet.walletNumber,
                                    accountName: wallet.accountName ?? "",
                                    status: wallet.status,
                                    notes: wallet.notes ?? "",
                                  }}
                                />
                                <DeleteButton
                                  action={deleteWalletAction.bind(
                                    null,
                                    merchant.id,
                                    wallet.id,
                                  )}
                                  label="حذف المحفظة"
                                />
                              </details>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            لا توجد محافظ مرتبطة بهذا الفرع.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredBranches.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              لا توجد فروع مطابقة لبحثك.
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجل التحديثات</CardTitle>
          <CardDescription>يتتبع الإنشاء والتعديل والطباعة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {merchant.auditLogs.length ? (
              merchant.auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{log.entityType}</Badge>
                      <span className="font-medium">{log.actionType}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{log.description}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateArabic(log.createdAt)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">لا يوجد سجل تحديثات بعد.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
