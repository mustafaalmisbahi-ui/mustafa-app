import { notFound } from "next/navigation";
import { MerchantForm } from "@/components/dashboard/merchant-form";
import { getMerchantById } from "@/lib/data";
import { updateMerchantAction } from "@/actions/merchant";

export default async function EditMerchantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const merchant = await getMerchantById(id);
  if (!merchant) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">تعديل التاجر</h1>
      <MerchantForm
        submitLabel="حفظ التعديلات"
        action={updateMerchantAction.bind(null, merchant.id)}
        defaults={{
          id: merchant.id,
          storeName: merchant.storeName,
          ownerName: merchant.ownerName,
          phone: merchant.phone,
          city: merchant.city,
          district: merchant.district,
          businessType: merchant.businessType,
          address: merchant.address,
          status: merchant.status,
          notes: merchant.notes ?? "",
        }}
      />
    </div>
  );
}
