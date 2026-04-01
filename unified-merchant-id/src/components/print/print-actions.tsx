"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
type PrintActionsProps = {
  merchantId: string;
  entityId: string;
  actionType: "signage_exported" | "cashier_card_exported";
  description: string;
  onLogAction: (
    merchantId: string,
    entityId: string,
    actionType: "signage_exported" | "cashier_card_exported",
    description: string,
  ) => Promise<void>;
};

export function PrintActions({
  merchantId,
  entityId,
  actionType,
  description,
  onLogAction,
}: PrintActionsProps) {
  const [isLogging, setIsLogging] = useState(false);

  const onPrint = async () => {
    setIsLogging(true);
    try {
      await onLogAction(merchantId, entityId, actionType, description);
    } finally {
      setIsLogging(false);
      window.print();
    }
  };

  const onExport = async () => {
    setIsLogging(true);
    try {
      await onLogAction(merchantId, entityId, actionType, description);
    } finally {
      setIsLogging(false);
      window.print();
    }
  };

  return (
    <div className="print:hidden flex items-center gap-3">
      <Button onClick={onPrint} disabled={isLogging}>
        <Printer className="size-4" />
        طباعة
      </Button>
      <Button variant="outline" onClick={onExport} disabled={isLogging}>
        <Download className="size-4" />
        تصدير PDF
      </Button>
    </div>
  );
}
