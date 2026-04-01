import { z } from "zod";

export const merchantStatusSchema = z.enum([
  "active",
  "inactive",
  "pending_update",
  "draft",
]);

export const branchStatusSchema = z.enum(["active", "inactive", "pending_update"]);

export const walletStatusSchema = z.enum(["active", "inactive", "temporary"]);

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

export const merchantSchema = z.object({
  storeName: z.string().min(2, "اسم المتجر مطلوب"),
  ownerName: z.string().min(2, "اسم المالك مطلوب"),
  phone: z.string().min(6, "رقم الهاتف مطلوب"),
  city: z.string().min(2, "المدينة مطلوبة"),
  district: z.string().min(2, "المديرية/الحي مطلوب"),
  businessType: z.string().min(2, "نوع النشاط مطلوب"),
  address: z.string().min(4, "العنوان مطلوب"),
  status: merchantStatusSchema,
  notes: optionalText,
});

export const branchSchema = z.object({
  merchantId: z.string().min(1),
  branchName: z.string().min(2, "اسم الفرع مطلوب"),
  city: z.string().min(2, "المدينة مطلوبة"),
  district: z.string().min(2, "المديرية/الحي مطلوب"),
  locationDescription: z.string().min(4, "وصف الموقع مطلوب"),
  status: branchStatusSchema,
  notes: optionalText,
});

export const walletSchema = z.object({
  branchId: z.string().min(1),
  walletProviderName: z.string().min(2, "مزود المحفظة مطلوب"),
  walletNumber: z.string().min(4, "رقم المحفظة مطلوب"),
  accountName: optionalText,
  status: walletStatusSchema,
  notes: optionalText,
});

export const loginSchema = z.object({
  username: z.string().min(3, "اسم المستخدم مطلوب"),
  password: z.string().min(6, "كلمة المرور مطلوبة"),
});

export type MerchantInput = z.infer<typeof merchantSchema>;
export type BranchInput = z.infer<typeof branchSchema>;
export type WalletInput = z.infer<typeof walletSchema>;
