import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  branchSchema,
  loginSchema,
  merchantSchema,
  walletSchema,
} from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  BRANCH_UPDATE_THRESHOLD_DAYS,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
  MERCHANT_CODE_PREFIX,
} from "@/lib/constants";
import {
  clearLoginAttempts,
  clearSessionCookie,
  createSession,
  deleteSessionByRawToken,
  getLoginLockStatus,
  hashPassword,
  recordFailedLogin,
  readSessionToken,
  requireAdminSession,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import type {
  CreateBranchInput,
  CreateMerchantInput,
  CreateWalletInput,
  MerchantStatus,
  UpdateBranchInput,
  UpdateMerchantInput,
  UpdateWalletInput,
} from "@/lib/domains/types";

export type MerchantWithRelations = NonNullable<
  Awaited<ReturnType<typeof getMerchantById>>
>;

function toCode(sequence: number) {
  return `${MERCHANT_CODE_PREFIX}-${sequence.toString().padStart(4, "0")}`;
}

function toBranchCode(merchantCode: string, branchNumber: number) {
  return `${merchantCode}-${branchNumber.toString().padStart(2, "0")}`;
}

async function createAuditLog(params: {
  merchantId: string;
  entityType: "merchant" | "branch" | "wallet" | "print";
  entityId: string;
  actionType: string;
  description: string;
}) {
  await prisma.auditLog.create({ data: params });
}

export async function ensureDefaultAdmin() {
  const admin = await prisma.adminUser.findUnique({
    where: { username: DEFAULT_ADMIN_USERNAME },
  });
  if (admin) return admin;

  return prisma.adminUser.create({
    data: {
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash: await hashPassword(DEFAULT_ADMIN_PASSWORD),
    },
  });
}

export async function loginAdmin(formData: FormData): Promise<void> {
  const username = String(formData.get("username") ?? "");
  const lockStatus = getLoginLockStatus(username);
  if (lockStatus.locked) {
    redirect("/login?error=locked");
  }

  const parsed = loginSchema.safeParse({
    username,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    recordFailedLogin(username);
    redirect("/login?error=1");
  }

  await ensureDefaultAdmin();
  const admin = await prisma.adminUser.findUnique({
    where: { username: parsed.data.username },
  });

  if (!admin) {
    recordFailedLogin(parsed.data.username);
    redirect("/login?error=1");
  }

  const ok = await verifyPassword(parsed.data.password, admin.passwordHash);
  if (!ok) {
    recordFailedLogin(parsed.data.username);
    redirect("/login?error=1");
  }

  clearLoginAttempts(parsed.data.username);
  const session = await createSession(admin.id);
  await setSessionCookie(session.rawToken);
  redirect("/dashboard");
}

export async function logoutAdmin() {
  const token = await readSessionToken();
  if (token) {
    await deleteSessionByRawToken(token);
  }
  await clearSessionCookie();
  redirect("/login");
}

export async function getDashboardSummary() {
  await requireAdminSession();
  const [totalMerchants, totalBranches, totalWalletAccounts, recentMerchants] =
    await Promise.all([
      prisma.merchant.count(),
      prisma.branch.count(),
      prisma.walletAccount.count(),
      prisma.merchant.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          merchantCode: true,
          storeName: true,
          city: true,
          createdAt: true,
        },
      }),
    ]);

  // MVP placeholder logic: branches not updated for a while.
  const needingUpdates = await prisma.branch.count({
    where: {
      updatedAt: {
        lt: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * BRANCH_UPDATE_THRESHOLD_DAYS,
        ),
      },
      status: "active",
    },
  });

  return {
    totalMerchants,
    totalBranches,
    totalWalletAccounts,
    recentMerchants,
    needingUpdates,
  };
}

export async function listMerchants(params?: {
  query?: string;
  status?: string;
  city?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAdminSession();
  const query = params?.query?.trim();
  const pageSize = Math.min(Math.max(params?.pageSize ?? 10, 5), 50);
  const page = Math.max(params?.page ?? 1, 1);
  const skip = (page - 1) * pageSize;

  const where: Prisma.MerchantWhereInput = {
    ...(query
      ? {
          OR: [
            { merchantCode: { contains: query } },
            { storeName: { contains: query } },
            { phone: { contains: query } },
          ],
        }
      : {}),
    ...(params?.status && params.status !== "all"
      ? { status: params.status as MerchantStatus }
      : {}),
    ...(params?.city && params.city !== "all" ? { city: params.city } : {}),
  };

  const [merchants, total] = await Promise.all([
    prisma.merchant.findMany({
      where,
      include: {
        _count: {
          select: { branches: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.merchant.count({ where }),
  ]);

  const cities = await prisma.merchant.findMany({
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });

  return {
    merchants,
    cities: cities.map((c) => c.city),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getMerchantById(merchantId: string) {
  await requireAdminSession();
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: {
      branches: {
        include: {
          walletAccounts: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { branchNumber: "asc" },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!merchant) {
    return null;
  }

  return {
    ...merchant,
    branches: merchant.branches.map((branch) => ({
      ...branch,
      walletAccounts: branch.walletAccounts.sort((a, b) =>
        a.createdAt > b.createdAt ? -1 : 1,
      ),
    })),
  };
}

export async function createMerchant(input: CreateMerchantInput) {
  await requireAdminSession();
  const parsed = merchantSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid merchant input");
  }

  const merchant = await prisma.$transaction(async (tx) => {
    const seq = await tx.sequenceCounter.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, merchantSeq: 1000 },
    });

    const nextSeq = seq.merchantSeq + 1;
    await tx.sequenceCounter.update({
      where: { id: 1 },
      data: { merchantSeq: nextSeq },
    });

    const created = await tx.merchant.create({
      data: {
        ...parsed.data,
        notes: parsed.data.notes || null,
        sequenceNumber: nextSeq,
        merchantCode: toCode(nextSeq),
      },
    });

    await tx.auditLog.create({
      data: {
        merchantId: created.id,
        entityType: "merchant",
        entityId: created.id,
        actionType: "merchant_created",
        description: `تم إنشاء التاجر ${created.storeName} بالرمز ${created.merchantCode}`,
      },
    });

    return created;
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/merchants");
  return merchant;
}

export async function updateMerchant(merchantId: string, input: UpdateMerchantInput) {
  await requireAdminSession();
  const parsed = merchantSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid merchant input");
  }

  const merchant = await prisma.merchant.update({
    where: { id: merchantId },
    data: { ...parsed.data, notes: parsed.data.notes || null },
  });

  await createAuditLog({
    merchantId: merchant.id,
    entityType: "merchant",
    entityId: merchant.id,
    actionType: "merchant_updated",
    description: `تم تحديث بيانات التاجر ${merchant.storeName}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/merchants");
  revalidatePath(`/dashboard/merchants/${merchant.id}`);
  return merchant;
}

export async function deleteMerchant(merchantId: string) {
  await requireAdminSession();
  await prisma.merchant.delete({ where: { id: merchantId } });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/merchants");
}

export async function createBranch(input: CreateBranchInput) {
  await requireAdminSession();
  const parsed = branchSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid branch input");
  }

  const branch = await prisma.$transaction(async (tx) => {
    const merchant = await tx.merchant.findUniqueOrThrow({
      where: { id: parsed.data.merchantId },
    });

    const branchNumber = merchant.nextBranchNumber;
    const branchCode = toBranchCode(merchant.merchantCode, branchNumber);

    const created = await tx.branch.create({
      data: {
        merchantId: merchant.id,
        branchNumber,
        branchCode,
        branchName: parsed.data.branchName,
        city: parsed.data.city,
        district: parsed.data.district,
        locationDescription: parsed.data.locationDescription,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
      },
    });

    await tx.merchant.update({
      where: { id: merchant.id },
      data: { nextBranchNumber: branchNumber + 1 },
    });

    await tx.auditLog.create({
      data: {
        merchantId: merchant.id,
        entityType: "branch",
        entityId: created.id,
        actionType: "branch_added",
        description: `تمت إضافة الفرع ${created.branchName} برمز ${created.branchCode}`,
      },
    });

    return created;
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/merchants");
  revalidatePath(`/dashboard/merchants/${branch.merchantId}`);
  return branch;
}

export async function updateBranch(branchId: string, input: UpdateBranchInput) {
  await requireAdminSession();
  const parsed = branchSchema
    .omit({ merchantId: true })
    .safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid branch input");
  }

  const branch = await prisma.branch.update({
    where: { id: branchId },
    data: { ...parsed.data, notes: parsed.data.notes || null },
    include: { merchant: true },
  });

  await createAuditLog({
    merchantId: branch.merchantId,
    entityType: "branch",
    entityId: branch.id,
    actionType: "branch_updated",
    description: `تم تحديث الفرع ${branch.branchCode}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/merchants");
  revalidatePath(`/dashboard/merchants/${branch.merchantId}`);
  return branch;
}

export async function deleteBranch(branchId: string) {
  await requireAdminSession();
  const branch = await prisma.branch.findUniqueOrThrow({
    where: { id: branchId },
    include: { merchant: true },
  });

  await prisma.branch.delete({ where: { id: branchId } });
  await createAuditLog({
    merchantId: branch.merchantId,
    entityType: "branch",
    entityId: branch.id,
    actionType: "branch_removed",
    description: `تم حذف الفرع ${branch.branchCode}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/merchants");
  revalidatePath(`/dashboard/merchants/${branch.merchantId}`);
}

export async function createWallet(input: CreateWalletInput) {
  await requireAdminSession();
  const parsed = walletSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid wallet input");
  }

  const wallet = await prisma.$transaction(async (tx) => {
    const branch = await tx.branch.findUniqueOrThrow({
      where: { id: parsed.data.branchId },
    });

    const existing = await tx.walletAccount.findUnique({
      where: {
        branchId_walletNumber: {
          branchId: parsed.data.branchId,
          walletNumber: parsed.data.walletNumber,
        },
      },
    });
    if (existing) {
      throw new Error("duplicate_wallet");
    }

    const created = await tx.walletAccount.create({
      data: {
        branchId: parsed.data.branchId,
        walletProviderName: parsed.data.walletProviderName,
        walletNumber: parsed.data.walletNumber,
        accountName: parsed.data.accountName || null,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
      },
    });

    await tx.auditLog.create({
      data: {
        merchantId: branch.merchantId,
        entityType: "wallet",
        entityId: created.id,
        actionType: "wallet_added",
        description: `تمت إضافة محفظة ${created.walletProviderName} للفرع ${branch.branchCode}`,
      },
    });

    return created;
  });

  const branch = await prisma.branch.findUniqueOrThrow({
    where: { id: wallet.branchId },
  });
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/merchants/${branch.merchantId}`);
  return wallet;
}

export async function updateWallet(walletId: string, input: UpdateWalletInput) {
  await requireAdminSession();
  const parsed = walletSchema.omit({ branchId: true }).safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid wallet input");
  }

  const wallet = await prisma.$transaction(async (tx) => {
    const current = await tx.walletAccount.findUniqueOrThrow({
      where: { id: walletId },
      include: { branch: true },
    });

    if (current.walletNumber !== parsed.data.walletNumber) {
      const existing = await tx.walletAccount.findUnique({
        where: {
          branchId_walletNumber: {
            branchId: current.branchId,
            walletNumber: parsed.data.walletNumber,
          },
        },
      });
      if (existing) {
        throw new Error("duplicate_wallet");
      }
    }

    const updated = await tx.walletAccount.update({
      where: { id: walletId },
      data: {
        walletProviderName: parsed.data.walletProviderName,
        walletNumber: parsed.data.walletNumber,
        accountName: parsed.data.accountName || null,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
      },
    });

    await tx.auditLog.create({
      data: {
        merchantId: current.branch.merchantId,
        entityType: "wallet",
        entityId: updated.id,
        actionType: "wallet_updated",
        description: `تم تحديث المحفظة ${updated.walletProviderName}`,
      },
    });

    return { updated, merchantId: current.branch.merchantId };
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/merchants/${wallet.merchantId}`);
  return wallet.updated;
}

export async function deleteWallet(walletId: string) {
  await requireAdminSession();
  const wallet = await prisma.walletAccount.findUniqueOrThrow({
    where: { id: walletId },
    include: {
      branch: true,
    },
  });

  await prisma.walletAccount.delete({ where: { id: walletId } });
  await createAuditLog({
    merchantId: wallet.branch.merchantId,
    entityType: "wallet",
    entityId: wallet.id,
    actionType: "wallet_removed",
    description: `تم حذف المحفظة ${wallet.walletProviderName} (${wallet.walletNumber})`,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/merchants/${wallet.branch.merchantId}`);
}

export async function logPrintAction(params: {
  merchantId: string;
  entityId: string;
  actionType: "signage_exported" | "cashier_card_exported";
  description: string;
}) {
  await requireAdminSession();
  await createAuditLog({
    merchantId: params.merchantId,
    entityType: "print",
    entityId: params.entityId,
    actionType: params.actionType,
    description: params.description,
  });
  revalidatePath(`/dashboard/merchants/${params.merchantId}`);
}

export async function globalSearch(query: string) {
  await requireAdminSession();
  const trimmed = query.trim();
  if (!trimmed) {
    return { merchants: [], branches: [], wallets: [] };
  }

  const [merchants, branches, wallets] = await Promise.all([
    prisma.merchant.findMany({
      where: {
        OR: [
          { merchantCode: { contains: trimmed } },
          { storeName: { contains: trimmed } },
          { phone: { contains: trimmed } },
        ],
      },
      take: 10,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.branch.findMany({
      where: {
        OR: [{ branchCode: { contains: trimmed } }, { branchName: { contains: trimmed } }],
      },
      include: { merchant: true },
      take: 10,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.walletAccount.findMany({
      where: { walletNumber: { contains: trimmed } },
      include: { branch: { include: { merchant: true } } },
      take: 10,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return { merchants, branches, wallets };
}

export async function getPrintData(merchantId: string) {
  await requireAdminSession();
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: {
      branches: {
        include: {
          walletAccounts: true,
        },
        orderBy: { branchNumber: "asc" },
      },
    },
  });

  if (!merchant) return null;

  return {
    ...merchant,
    branches: merchant.branches.map((branch) => ({
      ...branch,
      walletAccounts: branch.walletAccounts.sort((a, b) =>
        a.createdAt > b.createdAt ? -1 : 1,
      ),
    })),
  };
}

export function toFormDataString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

export function normalizeOptional(value: string) {
  const v = value.trim();
  return v.length > 0 ? v : undefined;
}
