"use server";

import { redirect } from "next/navigation";
import {
  createBranch,
  createMerchant,
  createWallet,
  deleteBranch,
  deleteMerchant,
  deleteWallet,
  logPrintAction,
  toFormDataString,
  updateBranch,
  updateMerchant,
  updateWallet,
} from "@/lib/data";
import { branchSchema, merchantSchema, walletSchema } from "@/lib/schemas";

export type ActionResult = {
  success?: boolean;
  message?: string;
  error?: string;
};

function getOptional(formData: FormData, name: string) {
  const value = toFormDataString(formData.get(name)).trim();
  return value.length > 0 ? value : undefined;
}

export async function createMerchantAction(formData: FormData) {
  const payload = {
    storeName: toFormDataString(formData.get("storeName")),
    ownerName: toFormDataString(formData.get("ownerName")),
    phone: toFormDataString(formData.get("phone")),
    city: toFormDataString(formData.get("city")),
    district: toFormDataString(formData.get("district")),
    businessType: toFormDataString(formData.get("businessType")),
    address: toFormDataString(formData.get("address")),
    status: toFormDataString(formData.get("status")),
    notes: toFormDataString(formData.get("notes")),
  };

  const parsed = merchantSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "تحقق من بيانات النموذج.");
  }

  const merchant = await createMerchant(parsed.data);
  redirect(`/dashboard/merchants/${merchant.id}`);
}

export async function updateMerchantAction(
  merchantId: string,
  formData: FormData,
): Promise<void> {
  const payload = {
    storeName: toFormDataString(formData.get("storeName")),
    ownerName: toFormDataString(formData.get("ownerName")),
    phone: toFormDataString(formData.get("phone")),
    city: toFormDataString(formData.get("city")),
    district: toFormDataString(formData.get("district")),
    businessType: toFormDataString(formData.get("businessType")),
    address: toFormDataString(formData.get("address")),
    status: toFormDataString(formData.get("status")),
    notes: toFormDataString(formData.get("notes")),
  };

  const parsed = merchantSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "تحقق من بيانات النموذج.");
  }

  await updateMerchant(merchantId, parsed.data);
  redirect(`/dashboard/merchants/${merchantId}`);
}

export async function deleteMerchantAction(merchantId: string) {
  await deleteMerchant(merchantId);
  redirect("/dashboard/merchants");
}

export async function createBranchAction(
  merchantId: string,
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = branchSchema.safeParse({
    merchantId,
    branchName: toFormDataString(formData.get("branchName")),
    city: toFormDataString(formData.get("city")),
    district: toFormDataString(formData.get("district")),
    locationDescription: toFormDataString(formData.get("locationDescription")),
    status: toFormDataString(formData.get("status")),
    notes: getOptional(formData, "notes"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات الفرع غير صحيحة." };
  }

  await createBranch(parsed.data);
  return { success: true, message: "تمت إضافة الفرع بنجاح." };
}

export async function updateBranchAction(
  merchantId: string,
  branchId: string,
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = branchSchema.omit({ merchantId: true }).safeParse({
    branchName: toFormDataString(formData.get("branchName")),
    city: toFormDataString(formData.get("city")),
    district: toFormDataString(formData.get("district")),
    locationDescription: toFormDataString(formData.get("locationDescription")),
    status: toFormDataString(formData.get("status")),
    notes: getOptional(formData, "notes"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات الفرع غير صحيحة." };
  }

  await updateBranch(branchId, parsed.data);
  return { success: true, message: "تم تحديث بيانات الفرع." };
}

export async function deleteBranchAction(branchId: string): Promise<ActionResult> {
  await deleteBranch(branchId);
  return { success: true, message: "تم حذف الفرع." };
}

export async function createWalletAction(
  _merchantId: string,
  branchId: string,
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = walletSchema.safeParse({
    branchId,
    walletProviderName: toFormDataString(formData.get("walletProviderName")),
    walletNumber: toFormDataString(formData.get("walletNumber")),
    accountName: getOptional(formData, "accountName"),
    status: toFormDataString(formData.get("status")),
    notes: getOptional(formData, "notes"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات المحفظة غير صحيحة." };
  }

  try {
    await createWallet(parsed.data);
    return { success: true, message: "تمت إضافة المحفظة." };
  } catch (error) {
    if (error instanceof Error && error.message === "duplicate_wallet") {
      return { success: false, error: "رقم المحفظة مكرر داخل نفس الفرع." };
    }
    throw error;
  }
}

export async function updateWalletAction(
  _merchantId: string,
  _branchId: string,
  walletId: string,
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = walletSchema.omit({ branchId: true }).safeParse({
    walletProviderName: toFormDataString(formData.get("walletProviderName")),
    walletNumber: toFormDataString(formData.get("walletNumber")),
    accountName: getOptional(formData, "accountName"),
    status: toFormDataString(formData.get("status")),
    notes: getOptional(formData, "notes"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات المحفظة غير صحيحة." };
  }

  try {
    await updateWallet(walletId, parsed.data);
    return { success: true, message: "تم تحديث المحفظة." };
  } catch (error) {
    if (error instanceof Error && error.message === "duplicate_wallet") {
      return { success: false, error: "رقم المحفظة مكرر داخل نفس الفرع." };
    }
    throw error;
  }
}

export async function deleteWalletAction(
  _merchantId: string,
  walletId: string,
): Promise<ActionResult> {
  await deleteWallet(walletId);
  return { success: true, message: "تم حذف المحفظة." };
}

export async function logPrintActionAction(
  merchantId: string,
  entityId: string,
  actionType: "signage_exported" | "cashier_card_exported",
  description: string,
) {
  await logPrintAction({ merchantId, entityId, actionType, description });
}
