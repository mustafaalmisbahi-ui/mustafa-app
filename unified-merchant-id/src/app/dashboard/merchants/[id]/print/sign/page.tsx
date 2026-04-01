import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { logPrintActionAction } from "@/actions/merchant";
import { Button } from "@/components/ui/button";
import { PrintActions } from "@/components/print/print-actions";
import { MerchantSignage } from "@/components/print/merchant-signage";
import { getPrintData } from "@/lib/data";

export default async function MerchantSignPrintPage(props: PageProps<"/dashboard/merchants/[id]/print/sign">) {
  const params = await props.params;
  const merchant = await getPrintData(params.id);
  if (!merchant) notFound();

  return (
    <div className="space-y-4">
      <div className="print:hidden flex items-center justify-between">
        <Button asChild variant="outline">
          <Link href={`/dashboard/merchants/${merchant.id}`}>
            <ArrowRight className="h-4 w-4" />
            العودة إلى ملف التاجر
          </Link>
        </Button>
      </div>
      <PrintActions
        merchantId={merchant.id}
        entityId={merchant.id}
        actionType="signage_exported"
        description={`تمت طباعة لافتة الدفع للتاجر ${merchant.merchantCode}`}
        onLogAction={logPrintActionAction}
      />
      <MerchantSignage merchant={merchant} />
    </div>
  );
}
