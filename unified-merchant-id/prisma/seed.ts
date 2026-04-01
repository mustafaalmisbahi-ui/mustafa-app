import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
} from "../src/lib/constants";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.walletAccount.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.session.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.sequenceCounter.deleteMany();

  await prisma.sequenceCounter.create({
    data: { id: 1, merchantSeq: 1003 },
  });

  await prisma.adminUser.create({
    data: {
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash: await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12),
    },
  });

  const merchant1 = await prisma.merchant.create({
    data: {
      sequenceNumber: 1001,
      merchantCode: "M-1001",
      nextBranchNumber: 3,
      storeName: "سوبر ماركت القمة",
      ownerName: "أحمد محمد علي",
      phone: "771234567",
      city: "صنعاء",
      district: "التحرير",
      businessType: "مواد غذائية",
      address: "شارع الزبيري - قرب جولة التحرير",
      status: "active",
      notes: "فرع رئيسي مع كثافة عمل عالية.",
    },
  });

  const merchant2 = await prisma.merchant.create({
    data: {
      sequenceNumber: 1002,
      merchantCode: "M-1002",
      nextBranchNumber: 2,
      storeName: "صيدلية الشفاء",
      ownerName: "سميرة عبدالسلام",
      phone: "733445566",
      city: "تعز",
      district: "القاهرة",
      businessType: "صيدلية",
      address: "جولة وادي القاضي - بجانب المستشفى",
      status: "active",
      notes: "تحتاج مراجعة شهرية لأرقام المحافظ.",
    },
  });

  const merchant3 = await prisma.merchant.create({
    data: {
      sequenceNumber: 1003,
      merchantCode: "M-1003",
      nextBranchNumber: 3,
      storeName: "مخبز الريان",
      ownerName: "يحيى عبدالله",
      phone: "780998877",
      city: "إب",
      district: "المشنة",
      businessType: "مخبوزات",
      address: "شارع الجامعة - جوار حديقة الشعب",
      status: "pending_update",
      notes: "بانتظار تحديث بيانات الفرع الثاني.",
    },
  });

  const b11 = await prisma.branch.create({
    data: {
      merchantId: merchant1.id,
      branchNumber: 1,
      branchCode: "M-1001-01",
      branchName: "الفرع الرئيسي",
      city: "صنعاء",
      district: "التحرير",
      locationDescription: "قرب البنك المركزي",
      status: "active",
      notes: "يعمل من 8 صباحا حتى 11 مساء.",
    },
  });

  const b12 = await prisma.branch.create({
    data: {
      merchantId: merchant1.id,
      branchNumber: 2,
      branchCode: "M-1001-02",
      branchName: "فرع حدة",
      city: "صنعاء",
      district: "حدة",
      locationDescription: "خلف شارع الستين",
      status: "active",
      notes: "حركة متوسطة.",
    },
  });

  const b21 = await prisma.branch.create({
    data: {
      merchantId: merchant2.id,
      branchNumber: 1,
      branchCode: "M-1002-01",
      branchName: "فرع المسبح",
      city: "تعز",
      district: "القاهرة",
      locationDescription: "بالقرب من محطة المسبح",
      status: "active",
      notes: "تحديث دوري أسبوعي.",
    },
  });

  const b31 = await prisma.branch.create({
    data: {
      merchantId: merchant3.id,
      branchNumber: 1,
      branchCode: "M-1003-01",
      branchName: "فرع السوق",
      city: "إب",
      district: "المشنة",
      locationDescription: "السوق المركزي",
      status: "pending_update",
      notes: "بعض المحافظ غير مفعلة.",
    },
  });

  const b32 = await prisma.branch.create({
    data: {
      merchantId: merchant3.id,
      branchNumber: 2,
      branchCode: "M-1003-02",
      branchName: "فرع الجامعة",
      city: "إب",
      district: "الظهار",
      locationDescription: "بوابة جامعة إب الجنوبية",
      status: "inactive",
      notes: "مغلق مؤقتا لإعادة الترتيب.",
    },
  });

  const wallets = [
    [b11, "Mobile Money", "771111001", "الصندوق الرئيسي"],
    [b11, "Jawali", "771111002", "الكاشير 1"],
    [b11, "One Cash", "771111003", "الكاشير 2"],
    [b12, "Mobile Money", "771111101", "الكاشير حدة"],
    [b12, "Floosak", "771111102", null],
    [b21, "Jawali", "733222001", "الصندوق"],
    [b21, "One Cash", "733222002", "وردية مساء"],
    [b31, "Mobile Money", "780333001", "المبيعات"],
    [b31, "Floosak", "780333002", null],
    [b31, "Jawali", "780333003", "احتياطي"],
    [b32, "One Cash", "780444001", "مؤقت"],
    [b32, "Mobile Money", "780444002", null],
  ] as const;

  for (const [branch, provider, number, accountName] of wallets) {
    await prisma.walletAccount.create({
      data: {
        branchId: branch.id,
        walletProviderName: provider,
        walletNumber: number,
        accountName,
        status: "active",
      },
    });
  }

  await prisma.auditLog.createMany({
    data: [
      {
        merchantId: merchant1.id,
        entityType: "merchant",
        entityId: merchant1.id,
        actionType: "merchant_created",
        description: "تم إنشاء التاجر سوبر ماركت القمة",
      },
      {
        merchantId: merchant2.id,
        entityType: "merchant",
        entityId: merchant2.id,
        actionType: "merchant_created",
        description: "تم إنشاء التاجر صيدلية الشفاء",
      },
      {
        merchantId: merchant3.id,
        entityType: "merchant",
        entityId: merchant3.id,
        actionType: "merchant_created",
        description: "تم إنشاء التاجر مخبز الريان",
      },
      {
        merchantId: merchant1.id,
        entityType: "print",
        entityId: b11.id,
        actionType: "signage_exported",
        description: "تم طباعة لوحة وسائل الدفع للفرع M-1001-01",
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
