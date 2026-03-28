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
import { Plus, Megaphone, TrendingUp, Target, DollarSign } from "lucide-react";
import { useState } from "react";
import { CAMPAIGN_CHANNEL_LABELS, CAMPAIGN_STATUS_LABELS } from "@shared/constants";

export default function Marketing() {
  const [showDialog, setShowDialog] = useState(false);
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery();
  const utils = trpc.useUtils();

  const createCampaign = trpc.campaigns.create.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); setShowDialog(false); toast.success("تم إنشاء الحملة"); },
    onError: (err) => toast.error(err.message),
  });

  const updateCampaign = trpc.campaigns.update.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); toast.success("تم تحديث الحملة"); },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({ name: "", channel: "instagram" as const, budget: "", notes: "" });

  const totalBudget = (campaigns || []).reduce((s, c) => s + Number(c.budget || 0), 0);
  const totalLeads = (campaigns || []).reduce((s, c) => s + (c.leads || 0), 0);
  const totalConversions = (campaigns || []).reduce((s, c) => s + (c.conversions || 0), 0);
  const totalRevenue = (campaigns || []).reduce((s, c) => s + Number(c.revenue || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold font-heading">التسويق والحملات</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{campaigns?.length || 0} حملة</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 w-full sm:w-auto"><Plus className="w-4 h-4" />حملة جديدة</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">إنشاء حملة تسويقية</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><Label>اسم الحملة *</Label><Input className="mt-1" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>القناة</Label>
                  <Select value={form.channel} onValueChange={(v: any) => setForm((p) => ({ ...p, channel: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(CAMPAIGN_CHANNEL_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div><Label>الميزانية (ر.س)</Label><Input type="number" className="mt-1" value={form.budget} onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))} /></div>
              </div>
              <div><Label>ملاحظات</Label><Textarea className="mt-1" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
              <Button onClick={() => {
                if (!form.name) { toast.error("اسم الحملة مطلوب"); return; }
                createCampaign.mutate(form);
              }} className="w-full" disabled={createCampaign.isPending}>إنشاء الحملة</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30"><DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /></div>
            <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground">الميزانية</p><p className="text-sm sm:text-lg font-bold truncate">{totalBudget.toLocaleString("ar-SA")}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-violet-50 dark:bg-violet-950/30"><Target className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" /></div>
            <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground">عملاء محتملين</p><p className="text-sm sm:text-lg font-bold">{totalLeads}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30"><TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /></div>
            <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground">تحويلات</p><p className="text-sm sm:text-lg font-bold">{totalConversions}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30"><Megaphone className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" /></div>
            <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground">الإيرادات</p><p className="text-sm sm:text-lg font-bold truncate">{totalRevenue.toLocaleString("ar-SA")}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !campaigns || campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Megaphone className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">لا توجد حملات</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {campaigns.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    <Badge variant="secondary" className="text-[10px] mt-1">{CAMPAIGN_CHANNEL_LABELS[c.channel || "other"]}</Badge>
                  </div>
                  <Select
                    value={c.status || "planned"}
                    onValueChange={(v: any) => updateCampaign.mutate({ id: c.id, status: v })}
                  >
                    <SelectTrigger className="h-7 text-xs w-auto"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CAMPAIGN_STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">الميزانية</p>
                    <p className="text-sm font-bold">{Number(c.budget || 0).toLocaleString("ar-SA")}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">عملاء</p>
                    <p className="text-sm font-bold">{c.leads || 0}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">تحويلات</p>
                    <p className="text-sm font-bold">{c.conversions || 0}</p>
                  </div>
                </div>
                {c.notes && <p className="text-xs text-muted-foreground mt-2 truncate">{c.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
