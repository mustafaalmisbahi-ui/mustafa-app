"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WALLET_STATUSES } from "@/lib/constants";
import type { ActionResult } from "@/actions/merchant";

type WalletFormProps = {
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  defaultValues?: {
    walletProviderName: string;
    walletNumber: string;
    accountName?: string | null;
    status: (typeof WALLET_STATUSES)[number];
    notes?: string | null;
  };
};

const statusLabel: Record<(typeof WALLET_STATUSES)[number], string> = {
  active: "نشط",
  inactive: "غير نشط",
  temporary: "مؤقت",
};

export function WalletForm({ action, submitLabel, defaultValues }: WalletFormProps) {
  const [state, formAction, pending] = useActionState(action, {
    success: false,
    message: "",
  });

  return (
    <form action={formAction} className="space-y-3 rounded-xl border p-4">
      <div className="grid gap-2">
        <Label htmlFor={`walletProviderName-${defaultValues?.walletNumber ?? "new"}`}>
          مزود المحفظة
        </Label>
        <Input
          id={`walletProviderName-${defaultValues?.walletNumber ?? "new"}`}
          name="walletProviderName"
          defaultValue={defaultValues?.walletProviderName ?? ""}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`walletNumber-${defaultValues?.walletNumber ?? "new"}`}>رقم المحفظة</Label>
        <Input
          id={`walletNumber-${defaultValues?.walletNumber ?? "new"}`}
          name="walletNumber"
          defaultValue={defaultValues?.walletNumber ?? ""}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`accountName-${defaultValues?.walletNumber ?? "new"}`}>
          اسم الحساب (اختياري)
        </Label>
        <Input
          id={`accountName-${defaultValues?.walletNumber ?? "new"}`}
          name="accountName"
          defaultValue={defaultValues?.accountName ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label>الحالة</Label>
        <Select name="status" defaultValue={defaultValues?.status ?? "active"}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="اختر الحالة" />
          </SelectTrigger>
          <SelectContent>
            {WALLET_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabel[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`wallet-notes-${defaultValues?.walletNumber ?? "new"}`}>ملاحظات</Label>
        <Textarea
          id={`wallet-notes-${defaultValues?.walletNumber ?? "new"}`}
          name="notes"
          defaultValue={defaultValues?.notes ?? ""}
        />
      </div>
      {state.message ? (
        <p className={`text-sm ${state.success ? "text-green-700" : "text-red-700"}`}>
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الحفظ..." : submitLabel}
      </Button>
    </form>
  );
}
