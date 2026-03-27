import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, Eye, Trash2, FileText, Search, Filter, ArrowRight, Pencil, Share2 } from "lucide-react";
import { useState, useMemo } from "react";
import { PRODUCT_TYPE_LABELS, CURRENCY_LABELS, formatCurrency } from "@shared/constants";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  sent: "مرسلة",
  accepted: "مقبولة",
  rejected: "مرفوضة",
  converted: "محولة لفاتورة",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  converted: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
};

export default function Quotes() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [, navigate] = useLocation();

  const { data: quotes, isLoading } = trpc.quotes.list.useQuery(
    statusFilter !== "all" ? { status: statusFilter } : {}
  );

  const utils = trpc.useUtils();

  const updateQuote = trpc.quotes.update.useMutation({
    onSuccess: () => {
      utils.quotes.list.invalidate();
      toast.success("تم تحديث حالة التسعيرة");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteQuote = trpc.quotes.delete.useMutation({
    onSuccess: () => {
      utils.quotes.list.invalidate();
      setShowDeleteConfirm(null);
      toast.success("تم حذف التسعيرة");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];
    if (!search) return quotes;
    const s = search.toLowerCase();
    return quotes.filter((q: any) =>
      q.quoteNumber?.toLowerCase().includes(s) ||
      q.customerName?.toLowerCase().includes(s) ||
      (PRODUCT_TYPE_LABELS[q.productType] || "").includes(s)
    );
  }, [quotes, search]);

  const stats = useMemo(() => {
    if (!quotes) return { total: 0, draft: 0, sent: 0, accepted: 0, rejected: 0, converted: 0, totalValue: 0 };
    return {
      total: quotes.length,
      draft: quotes.filter((q: any) => q.status === "draft").length,
      sent: quotes.filter((q: any) => q.status === "sent").length,
      accepted: quotes.filter((q: any) => q.status === "accepted").length,
      rejected: quotes.filter((q: any) => q.status === "rejected").length,
      converted: quotes.filter((q: any) => q.status === "converted").length,
      totalValue: quotes.reduce((sum: number, q: any) => sum + Number(q.totalPrice || 0), 0),
    };
  }, [quotes]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* العنوان */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold font-heading flex items-center gap-2">
            <Archive className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            التسعيرات المحفوظة
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">عرض وإدارة جميع التسعيرات المحفوظة</p>
        </div>
        <Button onClick={() => navigate("/pricing")} className="gap-1.5" size="sm">
          <ArrowRight className="w-4 h-4" />
          حاسبة التسعير
        </Button>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">الإجمالي</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-50 dark:bg-gray-900/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">مسودة</p>
            <p className="text-xl font-bold text-gray-600">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">مرسلة</p>
            <p className="text-xl font-bold text-blue-600">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-900/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">مقبولة</p>
            <p className="text-xl font-bold text-emerald-600">{stats.accepted}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">مرفوضة</p>
            <p className="text-xl font-bold text-red-600">{stats.rejected}</p>
          </CardContent>
        </Card>
        <Card className="bg-violet-50 dark:bg-violet-900/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">محولة</p>
            <p className="text-xl font-bold text-violet-600">{stats.converted}</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">القيمة الإجمالية</p>
            <p className="text-sm font-bold text-primary">{formatCurrency(stats.totalValue, "YER")}</p>
          </CardContent>
        </Card>
      </div>

      {/* البحث والفلترة */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pr-10"
            placeholder="بحث برقم التسعيرة أو اسم العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 ml-2" />
            <SelectValue placeholder="جميع الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="draft">مسودة</SelectItem>
            <SelectItem value="sent">مرسلة</SelectItem>
            <SelectItem value="accepted">مقبولة</SelectItem>
            <SelectItem value="rejected">مرفوضة</SelectItem>
            <SelectItem value="converted">محولة لفاتورة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* قائمة التسعيرات */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredQuotes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium text-muted-foreground">لا توجد تسعيرات محفوظة</p>
            <p className="text-sm text-muted-foreground mt-1">اذهب إلى حاسبة التسعير لإنشاء تسعيرة جديدة</p>
            <Button className="mt-4 gap-2" onClick={() => navigate("/pricing")}>
              <ArrowRight className="w-4 h-4" /> حاسبة التسعير
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredQuotes.map((quote: any) => (
            <Card key={quote.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{quote.quoteNumber}</span>
                      <Badge className={`text-xs ${STATUS_COLORS[quote.status] || ""}`}>
                        {STATUS_LABELS[quote.status] || quote.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {PRODUCT_TYPE_LABELS[quote.productType] || quote.productType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                      {quote.customerName && <span>العميل: {quote.customerName}</span>}
                      <span>الكمية: {quote.quantity?.toLocaleString("ar-SA")}</span>
                      <span>التاريخ: {new Date(quote.createdAt).toLocaleDateString("ar-SA")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <p className="text-lg font-bold text-primary">{formatCurrency(Number(quote.totalPrice), quote.currency)}</p>
                      <p className="text-xs text-muted-foreground">سعر النسخة: {formatCurrency(Number(quote.unitPrice), quote.currency)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/pricing?quoteId=${quote.id}`)} title="فتح في حاسبة التسعير">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedQuote(quote)} title="عرض التفاصيل">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setShowDeleteConfirm(quote.id)} title="حذف">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* نافذة تفاصيل التسعيرة */}
      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              تفاصيل التسعيرة - {selectedQuote?.quoteNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الحالة</span>
                  <Badge className={`text-xs ${STATUS_COLORS[selectedQuote.status] || ""}`}>
                    {STATUS_LABELS[selectedQuote.status] || selectedQuote.status}
                  </Badge>
                </div>
                {selectedQuote.customerName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">العميل</span>
                    <span className="font-medium">{selectedQuote.customerName}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المنتج</span>
                  <span className="font-medium">{PRODUCT_TYPE_LABELS[selectedQuote.productType] || selectedQuote.productType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الكمية</span>
                  <span className="font-medium">{selectedQuote.quantity?.toLocaleString("ar-SA")} نسخة</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">هامش الربح</span>
                  <span className="font-medium">{selectedQuote.profitMargin}%</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">إجمالي التكلفة</span>
                  <span className="font-medium">{formatCurrency(Number(selectedQuote.totalCost), selectedQuote.currency)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-lg">
                  <span>السعر الإجمالي</span>
                  <span className="text-primary">{formatCurrency(Number(selectedQuote.totalPrice), selectedQuote.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">سعر النسخة</span>
                  <span className="font-medium">{formatCurrency(Number(selectedQuote.unitPrice), selectedQuote.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">التاريخ</span>
                  <span className="font-medium">{new Date(selectedQuote.createdAt).toLocaleDateString("ar-SA")}</span>
                </div>
              </div>

              {/* تفاصيل الحساب */}
              {selectedQuote.pricingData?.calculation && (
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium mb-2">تفاصيل الحساب</p>
                  {selectedQuote.pricingData.calculation.totalPaperCost > 0 && (
                    <div className="flex justify-between text-xs">
                      <span>تكلفة الورق</span>
                      <span>{formatCurrency(selectedQuote.pricingData.calculation.totalPaperCost, selectedQuote.currency)}</span>
                    </div>
                  )}
                  {selectedQuote.pricingData.calculation.totalPrintingCost > 0 && (
                    <div className="flex justify-between text-xs">
                      <span>تكلفة الطباعة</span>
                      <span>{formatCurrency(selectedQuote.pricingData.calculation.totalPrintingCost, selectedQuote.currency)}</span>
                    </div>
                  )}
                  {selectedQuote.pricingData.calculation.totalClicheCost > 0 && (
                    <div className="flex justify-between text-xs">
                      <span>الكليشات</span>
                      <span>{formatCurrency(selectedQuote.pricingData.calculation.totalClicheCost, selectedQuote.currency)}</span>
                    </div>
                  )}
                  {selectedQuote.pricingData.calculation.finishingTotal > 0 && (
                    <div className="flex justify-between text-xs">
                      <span>التشطيب</span>
                      <span>{formatCurrency(selectedQuote.pricingData.calculation.finishingTotal, selectedQuote.currency)}</span>
                    </div>
                  )}
                  {selectedQuote.pricingData.calculation.fixedCosts > 0 && (
                    <div className="flex justify-between text-xs">
                      <span>تكاليف ثابتة</span>
                      <span>{formatCurrency(selectedQuote.pricingData.calculation.fixedCosts, selectedQuote.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs border-t pt-1 font-medium">
                    <span>هامش الربح</span>
                    <span className="text-emerald-600">{formatCurrency(selectedQuote.pricingData.calculation.margin, selectedQuote.currency)}</span>
                  </div>
                </div>
              )}

              {/* تغيير الحالة */}
              {selectedQuote.status !== "converted" && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">تغيير الحالة</p>
                  <div className="flex flex-wrap gap-2">
                    {["draft", "sent", "accepted", "rejected"].map((s) => (
                      <Button
                        key={s}
                        variant={selectedQuote.status === s ? "default" : "outline"}
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          updateQuote.mutate({ id: selectedQuote.id, status: s as any });
                          setSelectedQuote({ ...selectedQuote, status: s });
                        }}
                        disabled={updateQuote.isPending}
                      >
                        {STATUS_LABELS[s]}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {selectedQuote.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">ملاحظات: </span>
                  <span>{selectedQuote.notes}</span>
                </div>
              )}

              {/* زر فتح في حاسبة التسعير */}
              <div className="border-t pt-3">
                <Button className="w-full gap-2" onClick={() => { setSelectedQuote(null); navigate(`/pricing?quoteId=${selectedQuote.id}`); }}>
                  <Pencil className="w-4 h-4" /> فتح في حاسبة التسعير (تعديل / مشاركة)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* تأكيد الحذف */}
      <Dialog open={showDeleteConfirm !== null} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف هذه التسعيرة؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1" onClick={() => showDeleteConfirm && deleteQuote.mutate({ id: showDeleteConfirm })} disabled={deleteQuote.isPending}>
                {deleteQuote.isPending ? "جاري الحذف..." : "حذف"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(null)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
