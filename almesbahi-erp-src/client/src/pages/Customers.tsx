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
import { Plus, Search, Users, Phone, Mail, Trash2, Edit } from "lucide-react";
import { useState } from "react";
import { CUSTOMER_SOURCE_LABELS } from "@shared/constants";

export default function Customers() {
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: customers, isLoading } = trpc.customers.list.useQuery({ search: search || undefined });
  const utils = trpc.useUtils();

  const createCustomer = trpc.customers.create.useMutation({
    onSuccess: () => { utils.customers.list.invalidate(); setShowDialog(false); resetForm(); toast.success("تم إضافة العميل بنجاح"); },
    onError: (err) => toast.error(err.message),
  });

  const updateCustomer = trpc.customers.update.useMutation({
    onSuccess: () => { utils.customers.list.invalidate(); setShowDialog(false); setEditingId(null); resetForm(); toast.success("تم تحديث بيانات العميل"); },
    onError: (err) => toast.error(err.message),
  });

  const deleteCustomer = trpc.customers.delete.useMutation({
    onSuccess: () => { utils.customers.list.invalidate(); toast.success("تم حذف العميل"); },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "", address: "", source: "direct" as const, notes: "" });

  const resetForm = () => setForm({ name: "", phone: "", email: "", company: "", address: "", source: "direct", notes: "" });

  const handleEdit = (customer: any) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      company: customer.company || "",
      address: customer.address || "",
      source: customer.source || "direct",
      notes: customer.notes || "",
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.name) { toast.error("اسم العميل مطلوب"); return; }
    if (editingId) {
      updateCustomer.mutate({ id: editingId, ...form });
    } else {
      createCustomer.mutate(form);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold font-heading">إدارة العملاء</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{customers?.length || 0} عميل</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(v) => { setShowDialog(v); if (!v) { setEditingId(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 w-full sm:w-auto"><Plus className="w-4 h-4" />عميل جديد</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">{editingId ? "تعديل بيانات العميل" : "إضافة عميل جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>الاسم *</Label>
                  <Input className="mt-1" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <Label>الهاتف</Label>
                  <Input className="mt-1" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>البريد الإلكتروني</Label>
                  <Input className="mt-1" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} dir="ltr" />
                </div>
                <div>
                  <Label>الشركة</Label>
                  <Input className="mt-1" value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>العنوان</Label>
                <Input className="mt-1" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
              </div>
              <div>
                <Label>مصدر العميل</Label>
                <Select value={form.source} onValueChange={(v: any) => setForm((p) => ({ ...p, source: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CUSTOMER_SOURCE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Textarea className="mt-1" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} />
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={createCustomer.isPending || updateCustomer.isPending}>
                {editingId ? "تحديث" : "إضافة"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث بالاسم أو الهاتف..." className="pr-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !customers || customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-muted-foreground">
          <Users className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 opacity-30" />
          <p className="text-base sm:text-lg font-medium">لا يوجد عملاء</p>
          <p className="text-xs sm:text-sm mt-1">ابدأ بإضافة أول عميل</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {customers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs sm:text-sm font-bold text-primary">{customer.name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{customer.name}</p>
                      {customer.company && <p className="text-xs text-muted-foreground truncate">{customer.company}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(customer)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => { if (confirm("هل تريد حذف هذا العميل؟")) deleteCustomer.mutate({ id: customer.id }); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span dir="ltr" className="text-xs sm:text-sm">{customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span dir="ltr" className="truncate text-xs sm:text-sm">{customer.email}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 sm:mt-3 pt-2 sm:pt-3 border-t">
                  <Badge variant="secondary" className="text-[10px]">
                    {CUSTOMER_SOURCE_LABELS[customer.source || "direct"]}
                  </Badge>
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                    <span>{customer.totalOrders || 0} طلب</span>
                    <span>•</span>
                    <span>{Number(customer.totalSpent || 0).toLocaleString("ar-SA")} ر.س</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
