import Link from "next/link";
import { Button } from "@/components/ui/button";

export function MerchantActions({ merchantId }: { merchantId: string }) {
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline">
        <Link href={`/dashboard/merchants/${merchantId}/edit`}>تعديل بيانات التاجر</Link>
      </Button>
    </div>
  );
}
