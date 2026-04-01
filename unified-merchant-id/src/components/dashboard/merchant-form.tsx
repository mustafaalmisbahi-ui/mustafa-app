"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MERCHANT_STATUSES } from "@/lib/constants";

const statusLabels: Record<(typeof MERCHANT_STATUSES)[number], string> = {
  active: "نشط",
  inactive: "غير نشط",
  pending_update: "بانتظار تحديث",
  draft: "مسودة",
};

type MerchantDefaults = {
  id?: string;
  storeName?: string;
  ownerName?: string;
  phone?: string;
  city?: string;
  district?: string;
  businessType?: string;
  address?: string;
  status?: (typeof MERCHANT_STATUSES)[number];
  notes?: string | null;
};

type Props = {
  submitLabel: string;
  action: (formData: FormData) => Promise<void>;
  defaults?: MerchantDefaults;
};

export function MerchantForm({ submitLabel, action, defaults }: Props) {
  return (
    <form action={action} className="space-y-4">
      {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="storeName">اسم المتجر</Label>
          <Input id="storeName" name="storeName" defaultValue={defaults?.storeName ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerName">اسم المالك</Label>
          <Input id="ownerName" name="ownerName" defaultValue={defaults?.ownerName ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">رقم الهاتف</Label>
          <Input id="phone" name="phone" defaultValue={defaults?.phone ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">المدينة</Label>
          <Input id="city" name="city" defaultValue={defaults?.city ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="district">المديرية / الحي</Label>
          <Input id="district" name="district" defaultValue={defaults?.district ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessType">نوع النشاط</Label>
          <Input
            id="businessType"
            name="businessType"
            defaultValue={defaults?.businessType ?? ""}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">العنوان</Label>
        <Input id="address" name="address" defaultValue={defaults?.address ?? ""} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">الحالة</Label>
        <Select name="status" defaultValue={defaults?.status ?? "draft"}>
          <SelectTrigger id="status" className="w-full">
            <SelectValue placeholder="اختر الحالة" />
          </SelectTrigger>
          <SelectContent>
            {MERCHANT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">ملاحظات</Label>
        <Textarea id="notes" name="notes" defaultValue={defaults?.notes ?? ""} rows={3} />
      </div>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
