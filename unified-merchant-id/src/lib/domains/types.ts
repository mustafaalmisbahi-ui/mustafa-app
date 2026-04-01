import type { Merchant, Branch, WalletAccount, AuditLog } from "@prisma/client";

export type MerchantStatus = "active" | "inactive" | "pending_update" | "draft";
export type BranchStatus = "active" | "inactive" | "pending_update";
export type WalletStatus = "active" | "inactive" | "temporary";

export type CreateMerchantInput = {
  storeName: string;
  ownerName: string;
  phone: string;
  city: string;
  district: string;
  businessType: string;
  address: string;
  status: MerchantStatus;
  notes?: string;
};

export type UpdateMerchantInput = CreateMerchantInput;

export type CreateBranchInput = {
  merchantId: string;
  branchName: string;
  city: string;
  district: string;
  locationDescription: string;
  status: BranchStatus;
  notes?: string;
};

export type UpdateBranchInput = {
  branchName: string;
  city: string;
  district: string;
  locationDescription: string;
  status: BranchStatus;
  notes?: string;
};

export type CreateWalletInput = {
  branchId: string;
  walletProviderName: string;
  walletNumber: string;
  accountName?: string;
  status: WalletStatus;
  notes?: string;
};

export type UpdateWalletInput = {
  walletProviderName: string;
  walletNumber: string;
  accountName?: string;
  status: WalletStatus;
  notes?: string;
};

export type MerchantWithRelations = Merchant & {
  branches: (Branch & { walletAccounts: WalletAccount[] })[];
  auditLogs: AuditLog[];
};

export type PrintableMerchant = Merchant & {
  branches: (Branch & { walletAccounts: WalletAccount[] })[];
};
