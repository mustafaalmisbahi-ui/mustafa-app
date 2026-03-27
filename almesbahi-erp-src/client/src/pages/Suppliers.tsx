import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Truck, Phone, Mail, MapPin, Star, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { SUPPLIER_TYPE_LABELS } from "@shared/constants";

export default function Suppliers() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: suppliers, isLoading } = trpc.suppliers.list.useQuery(typeFilter !== "all" ? { type: typeFilter } : {});
  const utils = trpc.useUtils();

  const createSupplier = trpc.suppliers.create.useMutation({
    onSuccess: () => { utils.suppliers.list.invalidate(); setShowDialog(false); resetForm(); toast.success("تم إضافة المورد"); },
    onError: (err) => toast.error(err.message),
  });
  const updateSupplier = trpc.suppliers.update.useMutation({
    onSuccess: () => { utils.suppliers.list.invalidate(); setShowDialog(false); setEditingId(null); resetForm(); toast.success("تم تحديث المورد"); },
    onError: (err) => toast.error(err.message),
  });
  const deleteSupplier = trpc.suppliers.delete.useMutation({
    onSuccess: () => { utils.suppliers.list.invalidate(); toast.success("تم حذف المورد"); },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({ name: "", type: "other" as const, phone: "", email: "", address: "", notes: "" });
  const resetForm = () => setForm({ name: "", type: "other", phone: "", email: "", address: "", notes: "" });

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    setForm({ name: s.name || "", type: s.type || "other", phone: s.phone || "", email: s.email || "", address: s.address || "", notes: s.notes || "" });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.name) { toast.error("اسم المورد مطلوب"); return; }
    if (editingId) updateSupplier.mutate({ id: editingId, ...form });
    else createSupplier.mutate(form);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-3.5 h-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
    ));
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold font-heading">إدارة الموردين</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{suppliers?.length || 0} مورد</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(v) => { setShowDialog(v); if (!v) { setEditingId(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 w-full sm:w-auto"><Plus className="w-4 h-4" />مورد جديد</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">{editingId ? "تعديل المورد" : "إضافة مورد جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>الاسم *</Label><Input className="mt-1" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
                <div>
                  <Label>النوع</Label>
                  <Select value={form.type} onValueChange={(v: any) => setForm((p) => ({ ...p, type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SUPPLIER_TYPE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>الهاتف</Label><Input className="mt-1" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} dir="ltr" /></div>
                <div><Label>البريد</Label><Input className="mt-1" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} dir="ltr" /></div>
              </div>
              <div><Label>العنوان</Label><Input className="mt-1" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} /></div>
              <div><Label>ملاحظات</Label><Textarea className="mt-1" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
              <Button onClick={handleSubmit} className="w-full" disabled={createSupplier.isPending || updateSupplier.isPending}>
                {editingId ? "تحديث" : "إضافة"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="جميع الأنواع" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع الأنواع</SelectItem>
          {Object.entries(SUPPLIER_TYPE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !suppliers || suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Truck className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">لا يوجد موردين</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {suppliers.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{s.name}</p>
                      <Badge variant="secondary" className="text-[10px] mt-0.5">{SUPPLIER_TYPE_LABELS[s.type || "other"]}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(s)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => { if (confirm("حذف المورد؟")) deleteSupplier.mutate({ id: s.id }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  {s.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" /><span dir="ltr">{s.phone}</span></div>}
                  {s.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5" /><span dir="ltr" className="truncate">{s.email}</span></div>}
                  {s.address && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-3.5 h-3.5" /><span className="truncate">{s.address}</span></div>}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-0.5">{renderStars(s.rating || 0)}</div>
                  <span className="text-xs text-muted-foreground">{s.totalOrders || 0} طلب</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
