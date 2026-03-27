import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Warehouse } from "lucide-react";
import { useState } from "react";
import { INVENTORY_CATEGORY_LABELS, CARTON_SIZES } from "@shared/constants";

export default function Inventory() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const { data: items, isLoading } = trpc.inventory.list.useQuery(categoryFilter !== "all" ? { category: categoryFilter } : {});
  const { data: lowStock } = trpc.inventory.lowStock.useQuery();
  const { data: movements } = trpc.inventory.movements.useQuery({});
  const utils = trpc.useUtils();

  const createItem = trpc.inventory.create.useMutation({
    onSuccess: () => { utils.inventory.list.invalidate(); setShowAddDialog(false); resetForm(); toast.success("تم إضافة الصنف"); },
    onError: (err) => toast.error(err.message),
  });

  const addMovement = trpc.inventory.addMovement.useMutation({
    onSuccess: () => {
      utils.inventory.list.invalidate();
      utils.inventory.movements.invalidate();
      utils.inventory.lowStock.invalidate();
      setShowMovementDialog(false);
      setMovementForm({ itemId: 0, type: "inbound", quantity: 1, reason: "", notes: "" });
      toast.success("تم تسجيل الحركة");
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({ name: "", sku: "", category: "carton" as const, size: "", unit: "قطعة", currentStock: 0, minStock: 10, unitCost: "0", location: "" });
  const resetForm = () => setForm({ name: "", sku: "", category: "carton", size: "", unit: "قطعة", currentStock: 0, minStock: 10, unitCost: "0", location: "" });

  const [movementForm, setMovementForm] = useState<{ itemId: number; type: "inbound" | "outbound"; quantity: number; reason: string; notes: string }>({ itemId: 0, type: "inbound", quantity: 1, reason: "", notes: "" });

  const openMovement = (itemId: number, type: "inbound" | "outbound") => {
    setMovementForm({ itemId, type, quantity: 1, reason: "", notes: "" });
    setShowMovementDialog(true);
  };

  const totalValue = (items || []).reduce((sum, item) => sum + Number(item.totalValue || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold font-heading">إدارة المخازن</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{items?.length || 0} صنف • {totalValue.toLocaleString("ar-SA")} ر.س</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 w-full sm:w-auto"><Plus className="w-4 h-4" />صنف جديد</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-heading">إضافة صنف جديد</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>اسم الصنف *</Label><Input className="mt-1" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
                <div><Label>رمز الصنف (SKU)</Label><Input className="mt-1" value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} dir="ltr" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>التصنيف</Label>
                  <Select value={form.category} onValueChange={(v: any) => setForm((p) => ({ ...p, category: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(INVENTORY_CATEGORY_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>المقاس</Label>
                  {form.category === "carton" ? (
                    <Select value={form.size} onValueChange={(v) => setForm((p) => ({ ...p, size: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="اختر المقاس" /></SelectTrigger>
                      <SelectContent>{CARTON_SIZES.map((s) => (<SelectItem key={s} value={s}>{s} سم</SelectItem>))}</SelectContent>
                    </Select>
                  ) : (
                    <Input className="mt-1" value={form.size} onChange={(e) => setForm((p) => ({ ...p, size: e.target.value }))} />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><Label>الرصيد الحالي</Label><Input type="number" className="mt-1" value={form.currentStock} onChange={(e) => setForm((p) => ({ ...p, currentStock: Number(e.target.value) }))} /></div>
                <div><Label>الحد الأدنى</Label><Input type="number" className="mt-1" value={form.minStock} onChange={(e) => setForm((p) => ({ ...p, minStock: Number(e.target.value) }))} /></div>
                <div><Label>سعر الوحدة (ر.س)</Label><Input type="number" step="0.01" className="mt-1" value={form.unitCost} onChange={(e) => setForm((p) => ({ ...p, unitCost: e.target.value }))} /></div>
              </div>
              <div><Label>الموقع</Label><Input className="mt-1" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="مثال: مستودع 1 - رف A" /></div>
              <Button onClick={() => { if (!form.name) { toast.error("اسم الصنف مطلوب"); return; } createItem.mutate(form); }} className="w-full" disabled={createItem.isPending}>
                إضافة الصنف
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Low Stock Alert */}
      {lowStock && lowStock.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-amber-800 dark:text-amber-200">أصناف تحت الحد الأدنى ({lowStock.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStock.map((item) => (
                <Badge key={item.id} variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-300">
                  {item.name} ({item.currentStock}/{item.minStock})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">الأصناف</TabsTrigger>
          <TabsTrigger value="movements">حركة المخزون</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="جميع التصنيفات" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التصنيفات</SelectItem>
                {Object.entries(INVENTORY_CATEGORY_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : !items || items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Warehouse className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">لا توجد أصناف</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="space-y-2 sm:hidden">
                {items.map((item) => {
                  const isLow = (item.currentStock || 0) <= (item.minStock || 0);
                  return (
                    <Card key={item.id} className={isLow ? "border-amber-300/50" : ""}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{item.name}</p>
                              {item.sku && <p className="text-[10px] text-muted-foreground" dir="ltr">{item.sku}</p>}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">{INVENTORY_CATEGORY_LABELS[item.category || "other"]}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center mb-2">
                          <div className="bg-muted/50 rounded-lg p-1.5">
                            <p className="text-[10px] text-muted-foreground">الرصيد</p>
                            <p className={`text-sm font-bold ${isLow ? "text-amber-600" : ""}`}>{item.currentStock}</p>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-1.5">
                            <p className="text-[10px] text-muted-foreground">الحد الأدنى</p>
                            <p className="text-sm font-medium">{item.minStock}</p>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-1.5">
                            <p className="text-[10px] text-muted-foreground">القيمة</p>
                            <p className="text-sm font-medium">{Number(item.totalValue).toLocaleString("ar-SA")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="flex-1 h-9 gap-1 text-xs text-emerald-600" onClick={() => openMovement(item.id, "inbound")}>
                            <ArrowDownToLine className="w-3.5 h-3.5" />إضافة
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 h-9 gap-1 text-xs text-orange-600" onClick={() => openMovement(item.id, "outbound")}>
                            <ArrowUpFromLine className="w-3.5 h-3.5" />صرف
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <Card className="hidden sm:block">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">الصنف</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">التصنيف</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">المقاس</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">الرصيد</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">الحد الأدنى</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">سعر الوحدة</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">القيمة</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          const isLow = (item.currentStock || 0) <= (item.minStock || 0);
                          return (
                            <tr key={item.id} className={`border-b hover:bg-muted/30 transition-colors ${isLow ? "bg-amber-50/30 dark:bg-amber-950/10" : ""}`}>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <div>
                                    <p className="text-sm font-medium">{item.name}</p>
                                    {item.sku && <p className="text-xs text-muted-foreground" dir="ltr">{item.sku}</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3"><Badge variant="secondary" className="text-[10px]">{INVENTORY_CATEGORY_LABELS[item.category || "other"]}</Badge></td>
                              <td className="p-3 text-sm">{item.size || "-"}</td>
                              <td className="p-3">
                                <span className={`text-sm font-semibold ${isLow ? "text-amber-600" : ""}`}>{item.currentStock}</span>
                                {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline mr-1" />}
                              </td>
                              <td className="p-3 text-sm text-muted-foreground">{item.minStock}</td>
                              <td className="p-3 text-sm">{Number(item.unitCost).toFixed(2)} ر.س</td>
                              <td className="p-3 text-sm font-medium">{Number(item.totalValue).toLocaleString("ar-SA")} ر.س</td>
                              <td className="p-3">
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-emerald-600" onClick={() => openMovement(item.id, "inbound")}>
                                    <ArrowDownToLine className="w-3.5 h-3.5" />إضافة
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-orange-600" onClick={() => openMovement(item.id, "outbound")}>
                                    <ArrowUpFromLine className="w-3.5 h-3.5" />صرف
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">التاريخ</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">النوع</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">الكمية</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">السبب</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(movements || []).map((m) => (
                      <tr key={m.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 text-xs">{new Date(m.createdAt).toLocaleDateString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="p-3">
                          <Badge variant={m.type === "inbound" ? "default" : "secondary"} className={`text-[10px] ${m.type === "inbound" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"}`}>
                            {m.type === "inbound" ? "إضافة" : "صرف"}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm font-medium">{m.quantity}</td>
                        <td className="p-3 text-sm">{m.reason || "-"}</td>
                        <td className="p-3 text-xs text-muted-foreground">{m.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!movements || movements.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground text-sm">لا توجد حركات مخزون</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Movement Dialog */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {movementForm.type === "inbound" ? "إذن إضافة مخزون" : "إذن صرف مخزون"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>الكمية</Label><Input type="number" className="mt-1" value={movementForm.quantity} onChange={(e) => setMovementForm((p) => ({ ...p, quantity: Number(e.target.value) }))} min={1} /></div>
            <div><Label>السبب</Label><Input className="mt-1" value={movementForm.reason} onChange={(e) => setMovementForm((p) => ({ ...p, reason: e.target.value }))} placeholder="مثال: توريد جديد / طلب رقم..." /></div>
            <div><Label>ملاحظات</Label><Input className="mt-1" value={movementForm.notes} onChange={(e) => setMovementForm((p) => ({ ...p, notes: e.target.value }))} /></div>
            <Button onClick={() => addMovement.mutate(movementForm)} className="w-full" disabled={addMovement.isPending}>
              تأكيد
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
