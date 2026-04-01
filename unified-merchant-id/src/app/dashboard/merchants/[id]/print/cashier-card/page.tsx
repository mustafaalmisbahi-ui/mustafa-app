import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { logPrintActionAction } from "@/actions/merchant";
import { Button } from "@/components/ui/button";
import { getPrintData } from "@/lib/data";
import { CashierCard } from "@/components/print/cashier-card";
import { PrintActions } from "@/components/print/print-actions";

export default async function CashierCardPrintPage(props: PageProps<"/dashboard/merchants/[id]/print/cashier-card">) {
  const { id } = await props.params;
  const merchant = await getPrintData(id);

  if (!merchant) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="outline">
          <Link href={`/dashboard/merchants/${merchant.id}`}>
            <ArrowRight className="h-4 w-4" />
            العودة إلى ملف التاجر
          </Link>
        </Button>
        <PrintActions
          merchantId={merchant.id}
          entityId={merchant.id}
          actionType="cashier_card_exported"
          description={`تمت طباعة بطاقة التشغيل للتاجر ${merchant.merchantCode}`}
          onLogAction={logPrintActionAction}
        />
      </div>
      <div className="grid gap-4">
        {merchant.branches.map((branch) => (
          <CashierCard
            key={branch.id}
            storeName={merchant.storeName}
            merchantCode={merchant.merchantCode}
            branch={branch}
          />
        ))}
      </div>
    </main>
  );
}
