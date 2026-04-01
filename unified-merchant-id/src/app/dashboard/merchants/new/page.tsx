import Link from "next/link";
import { createMerchantAction } from "@/actions/merchant";
import { MerchantForm } from "@/components/dashboard/merchant-form";

export default function NewMerchantPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">إضافة تاجر جديد</h1>
        <Link href="/dashboard/merchants" className="text-sm text-blue-700 underline">
          رجوع
        </Link>
      </div>
      <MerchantForm submitLabel="إضافة التاجر" action={createMerchantAction} />
    </div>
  );
}
