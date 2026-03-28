import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, FileText, ArrowDownToLine, ArrowUpFromLine, DollarSign, Receipt, CreditCard, Banknote } from "lucide-react";
import { useState } from "react";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS, PAYMENT_METHOD_LABELS, TAX_RATE, CURRENCIES, CURRENCY_LABELS, formatCurrency } from "@shared/constants";

export default function Finance() {
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [transactionType, setTransactionType] = useState<"receipt" | "payment">("receipt");
  const [invoiceFilter, setInvoiceFilter] = useState<string>("all");

  const { data: invoices } = trpc.invoices.list.useQuery(invoiceFilter !== "all" ? { status: invoiceFilter } : {});
  const { data: transactions } = trpc.transactions.list.useQuery({});
  const { data: customers } = trpc.customers.list.useQuery({});
  const { data: nextInvNum } = trpc.invoices.getNextNumber.useQuery();
  const utils = trpc.useUtils();

  const createInvoice = trpc.invoices.create.useMutation({
    onSuccess: () => { utils.invoices.list.invalidate(); setShowInvoiceDialog(false); toast.success("تم إنشاء الفاتورة"); },
    onError: (err) => toast.error(err.message),
  });
  const updateInvoice = trpc.invoices.update.useMutation({
    onSuccess: () => { utils.invoices.list.invalidate(); toast.success("تم تحديث الفاتورة"); },
    onError: (err) => toast.error(err.message),
  });
  const createTransaction = trpc.transactions.create.useMutation({
    onSuccess: () => { utils.transactions.list.invalidate(); utils.invoices.list.invalidate(); setShowTransactionDialog(false); toast.success("تم تسجيل السند"); },
    onError: (err) => toast.error(err.message),
  });

  const [invForm, setInvForm] = useState({ customerId: 0, currency: "YER" as "YER" | "SAR" | "USD", subtotal: "", taxAmount: "", total: "", notes: "" });
  const [txForm, setTxForm] = useState({ amount: "", currency: "YER" as "YER" | "SAR" | "USD", invoiceId: 0, customerId: 0, paymentMethod: "cash" as const, description: "", voucherNumber: "" });

  const calcInvoice = (subtotal: string) => {
    const sub = Number(subtotal) || 0;
    const tax = sub * (TAX_RATE / 100);
    setInvForm((p) => ({ ...p, subtotal, taxAmount: tax.toFixed(2), total: (sub + tax).toFixed(2) }));
  };

  const openTransaction = (type: "receipt" | "payment") => {
    setTransactionType(type);
    setTxForm({ amount: "", currency: "YER", invoiceId: 0, customerId: 0, paymentMethod: "cash", description: "", voucherNumber: "" });
    setShowTransactionDialog(true);
  };

  const totalInvoiced = (invoices || []).reduce((s, i) => s + Number(i.total || 0), 0);
  const totalPaid = (invoices || []).reduce((s, i) => s + Number(i.paidAmount || 0), 0);
  const totalPending = totalInvoiced - totalPaid;

  const totalReceipts = (transactions || []).filter((t) => t.type === "receipt").reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalPayments = (transactions || []).filter((t) => t.type === "payment").reduce((s, t) => s + Number(t.amount || 0), 0);

  const getCurrencyBadge = (currency?: string) => {
    const c = CURRENCIES.find(cur => cur.code === (currency || "YER"));
    return c ? `${c.flag} ${c.symbol}` : currency || "ر.ي";
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold font-heading">الإدارة المالية</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">الفواتير والسندات المالية</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="gap-1 text-emerald-600 flex-1 sm:flex-none" onClick={() => openTransaction("receipt")}>
            <ArrowDownToLine className="w-4 h-4" /><span className="hidden sm:inline">سند</span> قبض
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-orange-600 flex-1 sm:flex-none" onClick={() => openTransaction("payment")}>
            <ArrowUpFromLine className="w-4 h-4" /><span className="hidden sm:inline">سند</span> صرف
          </Button>
          <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />فاتورة جديدة</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-heading">إنشاء فاتورة</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>رقم الفاتورة</Label><Input value={nextInvNum || ""} disabled className="mt-1" /></div>
                  <div>
                    <Label>العميل *</Label>
                    <Select onValueChange={(v) => setInvForm((p) => ({ ...p, customerId: Number(v) }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                      <SelectContent>{(customers || []).map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>العملة</Label>
                  <Select value={invForm.currency} onValueChange={(v) => setInvForm((p) => ({ ...p, currency: v as "YER" | "SAR" | "USD" }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.flag} {c.label} ({c.symbol})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><Label>المبلغ قبل الضريبة ({CURRENCY_LABELS[invForm.currency]})</Label><Input type="number" step="0.01" className="mt-1" value={invForm.subtotal} onChange={(e) => calcInvoice(e.target.value)} /></div>
                  <div><Label>الضريبة ({TAX_RATE}%)</Label><Input className="mt-1" value={invForm.taxAmount} disabled /></div>
                  <div><Label>الإجمالي</Label><Input className="mt-1" value={invForm.total} disabled /></div>
                </div>
                <div><Label>ملاحظات</Label><Textarea className="mt-1" value={invForm.notes} onChange={(e) => setInvForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
                <Button onClick={() => {
                  if (!invForm.customerId || !invForm.subtotal) { toast.error("يرجى ملء الحقول المطلوبة"); return; }
                  createInvoice.mutate({ invoiceNumber: nextInvNum || "INV-0001", ...invForm });
                }} className="w-full" disabled={createInvoice.isPending}>إنشاء الفاتورة</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30"><FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /></div>
              <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground">إجمالي الفواتير</p><p className="text-sm sm:text-lg font-bold truncate">{totalInvoiced.toLocaleString("ar-SA")}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30"><DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /></div>
              <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground">المحصّل</p><p className="text-sm sm:text-lg font-bold text-emerald-600 truncate">{totalPaid.toLocaleString("ar-SA")}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30"><Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" /></div>
              <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground">المعلّق</p><p className="text-sm sm:text-lg font-bold text-amber-600 truncate">{totalPending.toLocaleString("ar-SA")}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-violet-50 dark:bg-violet-950/30"><Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" /></div>
              <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground">صافي التدفق</p><p className="text-sm sm:text-lg font-bold truncate">{(totalReceipts - totalPayments).toLocaleString("ar-SA")}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">الفواتير</TabsTrigger>
          <TabsTrigger value="receipts">سندات القبض</TabsTrigger>
          <TabsTrigger value="payments">سندات الصرف</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="جميع الحالات" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {Object.entries(INVOICE_STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {/* Mobile Invoice Cards */}
          <div className="space-y-2 sm:hidden">
            {(invoices || []).map((inv) => (
              <Card key={inv.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{inv.invoiceNumber}</span>
                      <Badge variant="outline" className="text-[9px] px-1.5">{getCurrencyBadge(inv.currency)}</Badge>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] ${INVOICE_STATUS_COLORS[inv.status || 'draft']}`}>
                      {INVOICE_STATUS_LABELS[inv.status || 'draft']}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div className="bg-muted/50 rounded-lg p-1.5">
                      <p className="text-[10px] text-muted-foreground">الإجمالي</p>
                      <p className="text-xs font-bold">{formatCurrency(Number(inv.total), inv.currency || "YER")}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-1.5">
                      <p className="text-[10px] text-muted-foreground">المدفوع</p>
                      <p className="text-xs font-bold text-emerald-600">{formatCurrency(Number(inv.paidAmount || 0), inv.currency || "YER")}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-1.5">
                      <p className="text-[10px] text-muted-foreground">المتبقي</p>
                      <p className="text-xs font-bold text-amber-600">{formatCurrency(Number(inv.total) - Number(inv.paidAmount || 0), inv.currency || "YER")}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString("ar-SA")}</span>
                    {inv.status !== "paid" && inv.status !== "cancelled" && (
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => updateInvoice.mutate({ id: inv.id, status: "paid" })}>
                        تحصيل
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!invoices || invoices.length === 0) && (
              <div className="text-center py-12 text-muted-foreground text-sm">لا توجد فواتير</div>
            )}
          </div>

          {/* Desktop Invoice Table */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">رقم الفاتورة</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">العملة</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">الإجمالي</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">المدفوع</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">المتبقي</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">الحالة</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">التاريخ</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoices || []).map((inv) => (
                      <tr key={inv.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 text-sm font-medium">{inv.invoiceNumber}</td>
                        <td className="p-3 text-sm"><Badge variant="outline" className="text-[10px]">{getCurrencyBadge(inv.currency)}</Badge></td>
                        <td className="p-3 text-sm">{formatCurrency(Number(inv.total), inv.currency || "YER")}</td>
                        <td className="p-3 text-sm text-emerald-600">{formatCurrency(Number(inv.paidAmount || 0), inv.currency || "YER")}</td>
                        <td className="p-3 text-sm text-amber-600">{formatCurrency(Number(inv.total) - Number(inv.paidAmount || 0), inv.currency || "YER")}</td>
                        <td className="p-3">
                          <Badge variant="secondary" className={`text-[10px] ${INVOICE_STATUS_COLORS[inv.status || 'draft']}`}>
                            {INVOICE_STATUS_LABELS[inv.status || 'draft']}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString("ar-SA")}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {inv.status !== "paid" && inv.status !== "cancelled" && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => updateInvoice.mutate({ id: inv.id, status: "paid" })}>
                                تحصيل
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!invoices || invoices.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground text-sm">لا توجد فواتير</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts" className="mt-4">
          <TransactionTable transactions={(transactions || []).filter((t) => t.type === "receipt")} type="receipt" />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <TransactionTable transactions={(transactions || []).filter((t) => t.type === "payment")} type="payment" />
        </TabsContent>
      </Tabs>

      {/* Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {transactionType === "receipt" ? "سند قبض" : "سند صرف"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>العملة</Label>
              <Select value={txForm.currency} onValueChange={(v) => setTxForm((p) => ({ ...p, currency: v as "YER" | "SAR" | "USD" }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.flag} {c.label} ({c.symbol})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>المبلغ ({CURRENCY_LABELS[txForm.currency]}) *</Label><Input type="number" step="0.01" className="mt-1" value={txForm.amount} onChange={(e) => setTxForm((p) => ({ ...p, amount: e.target.value }))} /></div>
            {transactionType === "receipt" && (
              <div>
                <Label>العميل</Label>
                <Select onValueChange={(v) => setTxForm((p) => ({ ...p, customerId: Number(v) }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                  <SelectContent>{(customers || []).map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>طريقة الدفع</Label>
              <Select value={txForm.paymentMethod} onValueChange={(v: any) => setTxForm((p) => ({ ...p, paymentMethod: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>الوصف</Label><Input className="mt-1" value={txForm.description} onChange={(e) => setTxForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <Button onClick={() => {
              if (!txForm.amount) { toast.error("المبلغ مطلوب"); return; }
              const { voucherNumber: _vn, ...txRest } = txForm;
              createTransaction.mutate({ type: transactionType, voucherNumber: `${transactionType === "receipt" ? "RCV" : "PAY"}-${Date.now()}`, ...txRest });
            }} className="w-full" disabled={createTransaction.isPending}>
              تأكيد
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransactionTable({ transactions, type }: { transactions: any[]; type: string }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">رقم السند</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">العملة</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">المبلغ</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">طريقة الدفع</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">الوصف</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 text-sm font-medium">{t.voucherNumber}</td>
                  <td className="p-3 text-sm"><Badge variant="outline" className="text-[10px]">{CURRENCY_LABELS[t.currency] || "ر.ي"}</Badge></td>
                  <td className="p-3 text-sm font-semibold">{formatCurrency(Number(t.amount), t.currency || "YER")}</td>
                  <td className="p-3 text-sm">{PAYMENT_METHOD_LABELS[t.paymentMethod] || t.paymentMethod}</td>
                  <td className="p-3 text-sm">{t.description || "-"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString("ar-SA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {type === "receipt" ? "لا توجد سندات قبض" : "لا توجد سندات صرف"}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
