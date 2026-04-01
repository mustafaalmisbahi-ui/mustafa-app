"use client";

import { useActionState } from "react";
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
import { BRANCH_STATUSES } from "@/lib/constants";

const statusLabel: Record<(typeof BRANCH_STATUSES)[number], string> = {
  active: "نشط",
  inactive: "موقوف",
  pending_update: "بانتظار تحديث",
};

type BranchDefaults = {
  branchName?: string;
  city?: string;
  district?: string;
  locationDescription?: string;
  status?: (typeof BRANCH_STATUSES)[number];
  notes?: string | null;
};

type Props = {
  submitLabel: string;
  action: (
    prevState: { error?: string; success?: boolean } | undefined,
    formData: FormData,
  ) => Promise<{ error?: string; success?: boolean }>;
  defaultValues?: BranchDefaults;
};

export function BranchForm({ submitLabel, action, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-2">
        <Label htmlFor="branchName">اسم الفرع</Label>
        <Input
          id="branchName"
          name="branchName"
          defaultValue={defaultValues?.branchName ?? ""}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="city">المدينة</Label>
          <Input id="city" name="city" defaultValue={defaultValues?.city ?? ""} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="district">المديرية / الحي</Label>
          <Input
            id="district"
            name="district"
            defaultValue={defaultValues?.district ?? ""}
            required
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="locationDescription">وصف الموقع</Label>
        <Textarea
          id="locationDescription"
          name="locationDescription"
          defaultValue={defaultValues?.locationDescription ?? ""}
          rows={2}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="status">الحالة</Label>
        <Select name="status" defaultValue={defaultValues?.status ?? "active"}>
          <SelectTrigger id="status" className="w-full">
            <SelectValue placeholder="اختر الحالة" />
          </SelectTrigger>
          <SelectContent>
            {BRANCH_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabel[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">ملاحظات</Label>
        <Textarea id="notes" name="notes" defaultValue={defaultValues?.notes ?? ""} rows={2} />
      </div>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-green-700">تم الحفظ بنجاح.</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الحفظ..." : submitLabel}
      </Button>
    </form>
  );
}
