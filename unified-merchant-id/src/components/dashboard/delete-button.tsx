"use client";

import { Button } from "@/components/ui/button";

type DeleteButtonProps = {
  label: string;
  action: () => Promise<unknown>;
};

export function DeleteButton({ label, action }: DeleteButtonProps) {
  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={async () => {
        const ok = window.confirm("هل أنت متأكد من تنفيذ الحذف؟");
        if (!ok) return;
        await action();
      }}
    >
      {label}
    </Button>
  );
}
