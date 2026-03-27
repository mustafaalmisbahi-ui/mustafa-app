import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, ClipboardCheck, CheckCircle2, XCircle, RotateCcw, Star } from "lucide-react";
import { useState } from "react";
import { QUALITY_RESULT_LABELS, QUALITY_RESULT_COLORS } from "@shared/constants";

const CHECKLIST_ITEMS = [
  "مطابقة الألوان للعينة المعتمدة",
  "دقة القص والتقطيع",
  "جودة التجليد/اللصق",
  "خلو المطبوعات من البقع",
  "مطابقة الكمية المطلوبة",
  "سلامة التغليف",
  "مطابقة المقاسات",
  "جودة الورق المستخدم",
  "وضوح النصوص والصور",
  "جودة التشطيب (سلوفان/يو في/فويل)",
];

export default function Quality() {
  const [showDialog, setShowDialog] = useState(false);
  const { data: inspections, isLoading } = trpc.quality.list.useQuery({});
  const { data: orders } = trpc.orders.list.useQuery({});
  const utils = trpc.useUtils();

  const createInspection = trpc.quality.create.useMutation({
    onSuccess: () => { utils.quality.list.invalidate(); setShowDialog(false); resetForm(); toast.success("تم حفظ تقرير الفحص"); },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({
    orderId: 0,
    result: "pass" as "pass" | "fail" | "rework",
    checklist: CHECKLIST_ITEMS.map((item) => ({ item, passed: true })),
    defects: "",
    supplierRating: 5,
    printerRating: 5,
    notes: "",
  });

  const resetForm = () => setForm({
    orderId: 0,
    result: "pass",
    checklist: CHECKLIST_ITEMS.map((item) => ({ item, passed: true })),
    defects: "",
    supplierRating: 5,
    printerRating: 5,
    notes: "",
  });

  const toggleChecklist = (index: number) => {
    setForm((p) => {
      const newChecklist = [...p.checklist];
      newChecklist[index] = { ...newChecklist[index], passed: !newChecklist[index].passed };
      return { ...p, checklist: newChecklist };
    });
  };

  const passCount = (inspections || []).filter((i) => i.result === "pass").length;
  const failCount = (inspections || []).filter((i) => i.result === "fail").length;
  const reworkCount = (inspections || []).filter((i) => i.result === "rework").length;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold font-heading">فحص الجودة</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{inspections?.length || 0} تقرير فحص</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 w-full sm:w-auto"><Plus className="w-4 h-4" />فحص جديد</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-heading">تقرير فحص جودة</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>الطلب *</Label>
                  <Select onValueChange={(v) => setForm((p) => ({ ...p, orderId: Number(v) }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="اختر الطلب" /></SelectTrigger>
                    <SelectContent>
                      {(orders || []).map((o) => (<SelectItem key={o.id} value={String(o.id)}>{o.orderNumber} - {o.title}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>النتيجة</Label>
                  <Select value={form.result} onValueChange={(v: any) => setForm((p) => ({ ...p, result: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(QUALITY_RESULT_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">قائمة الفحص</Label>
                <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                  {form.checklist.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => toggleChecklist(i)}
                      className={`flex items-center gap-3 w-full p-2.5 rounded-lg transition-colors text-right ${
                        item.passed ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-red-50 dark:bg-red-950/20"
                      }`}
                    >
                      {item.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                      )}
                      <span className="text-sm">{item.item}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>تقييم المورد (1-5)</Label>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button key={v} onClick={() => setForm((p) => ({ ...p, supplierRating: v }))}>
                        <Star className={`w-6 h-6 ${v <= form.supplierRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>تقييم المطبعة (1-5)</Label>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button key={v} onClick={() => setForm((p) => ({ ...p, printerRating: v }))}>
                        <Star className={`w-6 h-6 ${v <= form.printerRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {(form.result === "fail" || form.result === "rework") && (
                <div>
                  <Label>وصف العيوب</Label>
                  <Textarea className="mt-1" value={form.defects} onChange={(e) => setForm((p) => ({ ...p, defects: e.target.value }))} rows={3} />
                </div>
              )}

              <div>
                <Label>ملاحظات</Label>
                <Textarea className="mt-1" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} />
              </div>

              <Button onClick={() => {
                if (!form.orderId) { toast.error("يرجى اختيار الطلب"); return; }
                createInspection.mutate({
                  orderId: form.orderId,
                  result: form.result,
                  checklistResults: form.checklist,
                  defects: form.defects || undefined,
                  supplierRating: form.supplierRating,
                  printerRating: form.printerRating,
                  notes: form.notes || undefined,
                });
              }} className="w-full" disabled={createInspection.isPending}>
                حفظ التقرير
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30"><CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /></div>
            <div><p className="text-[10px] sm:text-xs text-muted-foreground">ناجح</p><p className="text-base sm:text-xl font-bold text-emerald-600">{passCount}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-red-50 dark:bg-red-950/30"><XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" /></div>
            <div><p className="text-[10px] sm:text-xs text-muted-foreground">فاشل</p><p className="text-base sm:text-xl font-bold text-red-600">{failCount}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30"><RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" /></div>
            <div><p className="text-[10px] sm:text-xs text-muted-foreground">إعادة عمل</p><p className="text-base sm:text-xl font-bold text-amber-600">{reworkCount}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Inspections List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !inspections || inspections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ClipboardCheck className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">لا توجد تقارير فحص</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="space-y-2 sm:hidden">
            {inspections.map((insp) => (
              <Card key={insp.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">طلب #{insp.orderId}</span>
                    <Badge variant="secondary" className={`text-[10px] ${QUALITY_RESULT_COLORS[insp.result || "pass"]}`}>
                      {QUALITY_RESULT_LABELS[insp.result || "pass"]}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground mb-0.5">المورد</p>
                      <div className="flex gap-0.5">{[1,2,3,4,5].map(v=>(<Star key={v} className={`w-3 h-3 ${v<=(insp.supplierRating||0)?"fill-amber-400 text-amber-400":"text-muted-foreground/30"}`}/>))}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground mb-0.5">المطبعة</p>
                      <div className="flex gap-0.5">{[1,2,3,4,5].map(v=>(<Star key={v} className={`w-3 h-3 ${v<=(insp.printerRating||0)?"fill-amber-400 text-amber-400":"text-muted-foreground/30"}`}/>))}</div>
                    </div>
                  </div>
                  {insp.defects && <p className="text-xs text-muted-foreground truncate">{insp.defects}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(insp.createdAt).toLocaleDateString("ar-SA")}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">رقم الطلب</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">النتيجة</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">تقييم المورد</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">تقييم المطبعة</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">العيوب</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspections.map((insp) => (
                      <tr key={insp.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 text-sm font-medium">#{insp.orderId}</td>
                        <td className="p-3">
                          <Badge variant="secondary" className={`text-[10px] ${QUALITY_RESULT_COLORS[insp.result || "pass"]}`}>
                            {QUALITY_RESULT_LABELS[insp.result || "pass"]}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((v) => (
                              <Star key={v} className={`w-3 h-3 ${v <= (insp.supplierRating || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((v) => (
                              <Star key={v} className={`w-3 h-3 ${v <= (insp.printerRating || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground max-w-[200px] truncate">{insp.defects || "-"}</td>
                        <td className="p-3 text-xs text-muted-foreground">{new Date(insp.createdAt).toLocaleDateString("ar-SA")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
