import { eq, desc, asc, sql, and, gte, lte, like, or, count, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomUUID } from "node:crypto";
import {
  InsertUser, users,
  customers, InsertCustomer,
  orders, InsertOrder,
  orderStatusHistory,
  inventoryItems, InsertInventoryItem,
  inventoryMovements,
  invoices, InsertInvoice,
  transactions, InsertTransaction,
  qualityInspections, InsertQualityInspection,
  employeeTasks,
  performanceEvaluations,
  campaigns,
  activityLog,
  suppliers, InsertSupplier,
  pricingTemplates,
  savedQuotes, InsertSavedQuote,
  paperPrices, InsertPaperPrice,
  exchangeRates,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
const INVITED_OPENID_PREFIX = "invited:";
const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USERS ====================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const normalizedEmail = normalizeEmail(email);
  const result = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role: role as any }).where(eq(users.id, userId));
}

export async function setUserActive(userId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isActive }).where(eq(users.id, userId));
}

export async function createInvitedUser(data: {
  email: string;
  name?: string;
  role?: "admin" | "sales" | "production" | "designer" | "technician" | "user";
}) {
  const db = await getDb();
  if (!db) throw new Error("تعذر الاتصال بقاعدة البيانات");

  const normalizedEmail = normalizeEmail(data.email);
  const existingUser = await getUserByEmail(normalizedEmail);

  if (existingUser) {
    if (existingUser.openId.startsWith(INVITED_OPENID_PREFIX)) {
      throw new Error("تمت دعوة هذا المستخدم مسبقًا");
    }
    throw new Error("هذا المستخدم موجود بالفعل");
  }

  const inviteName =
    data.name?.trim() ||
    normalizedEmail.split("@")[0] ||
    "مستخدم جديد";

  const result = await db.insert(users).values({
    openId: `${INVITED_OPENID_PREFIX}${randomUUID()}`,
    email: normalizedEmail,
    name: inviteName,
    role: data.role || "user",
    loginMethod: "invite",
    isActive: true,
    lastSignedIn: new Date(),
  });

  return result[0].insertId;
}

export async function claimInvitedUserByEmail(data: {
  email: string;
  openId: string;
  name?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
}) {
  const db = await getDb();
  if (!db) return undefined;

  const user = await getUserByEmail(data.email);
  if (!user) return undefined;

  if (!user.openId.startsWith(INVITED_OPENID_PREFIX)) {
    return user;
  }

  await db
    .update(users)
    .set({
      openId: data.openId,
      name: data.name ?? user.name,
      loginMethod: data.loginMethod ?? user.loginMethod,
      lastSignedIn: data.lastSignedIn ?? new Date(),
    })
    .where(eq(users.id, user.id));

  return getUserByOpenId(data.openId);
}

export async function createManualUser(data: {
  name: string;
  email?: string;
  phone?: string;
  role?: "admin" | "sales" | "production" | "designer" | "technician" | "user";
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(users).values({
    openId: `manual_${randomUUID()}`,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role ?? "user",
    isActive: data.isActive ?? true,
    loginMethod: "manual",
    lastSignedIn: new Date(),
  });
  return result[0].insertId;
}

// ==================== CUSTOMERS ====================
export async function getCustomers(search?: string) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db.select().from(customers)
      .where(or(like(customers.name, `%${search}%`), like(customers.phone, `%${search}%`), like(customers.company, `%${search}%`)))
      .orderBy(desc(customers.createdAt));
  }
  return db.select().from(customers).orderBy(desc(customers.createdAt));
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0];
}

export async function createCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(customers).values(data);
  return result[0].insertId;
}

export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) return;
  await db.update(customers).set(data).where(eq(customers.id, id));
}

export async function deleteCustomer(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(customers).where(eq(customers.id, id));
}

// ==================== ORDERS ====================
export async function getOrders(filters?: { status?: string; customerId?: number; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(orders.status, filters.status as any));
  if (filters?.customerId) conditions.push(eq(orders.customerId, filters.customerId));
  if (filters?.search) conditions.push(or(like(orders.title, `%${filters.search}%`), like(orders.orderNumber, `%${filters.search}%`)));
  if (conditions.length > 0) {
    return db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt));
  }
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0];
}

export async function createOrder(data: InsertOrder) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(orders).values(data);
  return result[0].insertId;
}

export async function updateOrder(id: number, data: Partial<InsertOrder>) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set(data).where(eq(orders.id, id));
}

export async function deleteOrder(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(orders).where(eq(orders.id, id));
}

export async function getNextOrderNumber() {
  const db = await getDb();
  if (!db) return "ORD-0001";
  const result = await db.select({ cnt: count() }).from(orders);
  const num = (result[0]?.cnt || 0) + 1;
  return `ORD-${String(num).padStart(4, "0")}`;
}

export async function addOrderStatusHistory(data: { orderId: number; fromStatus?: string; toStatus: string; changedBy?: number; notes?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(orderStatusHistory).values(data);
}

export async function getOrderStatusHistory(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId)).orderBy(desc(orderStatusHistory.createdAt));
}

// ==================== INVENTORY ====================
export async function getInventoryItems(category?: string) {
  const db = await getDb();
  if (!db) return [];
  if (category) {
    return db.select().from(inventoryItems).where(eq(inventoryItems.category, category as any)).orderBy(asc(inventoryItems.name));
  }
  return db.select().from(inventoryItems).orderBy(asc(inventoryItems.name));
}

export async function getInventoryItemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
  return result[0];
}

export async function createInventoryItem(data: InsertInventoryItem) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(inventoryItems).values(data);
  return result[0].insertId;
}

export async function updateInventoryItem(id: number, data: Partial<InsertInventoryItem>) {
  const db = await getDb();
  if (!db) return;
  await db.update(inventoryItems).set(data).where(eq(inventoryItems.id, id));
}

export async function getLowStockItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventoryItems)
    .where(and(eq(inventoryItems.isActive, true), sql`${inventoryItems.currentStock} <= ${inventoryItems.minStock}`))
    .orderBy(asc(inventoryItems.currentStock));
}

export async function addInventoryMovement(data: { itemId: number; type: "inbound" | "outbound"; quantity: number; reason?: string; orderId?: number; performedBy?: number; notes?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(inventoryMovements).values(data);
  const item = await getInventoryItemById(data.itemId);
  if (item) {
    const newStock = data.type === "inbound" ? (item.currentStock || 0) + data.quantity : (item.currentStock || 0) - data.quantity;
    const unitCost = Number(item.unitCost) || 0;
    await db.update(inventoryItems).set({ currentStock: Math.max(0, newStock), totalValue: String(Math.max(0, newStock) * unitCost) }).where(eq(inventoryItems.id, data.itemId));
  }
}

export async function getInventoryMovements(itemId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (itemId) {
    return db.select().from(inventoryMovements).where(eq(inventoryMovements.itemId, itemId)).orderBy(desc(inventoryMovements.createdAt));
  }
  return db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.createdAt)).limit(100);
}

// ==================== INVOICES ====================
export async function getInvoices(status?: string) {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db.select().from(invoices).where(eq(invoices.status, status as any)).orderBy(desc(invoices.createdAt));
  }
  return db.select().from(invoices).orderBy(desc(invoices.createdAt));
}

export async function getInvoiceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return result[0];
}

export async function createInvoice(data: InsertInvoice) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(invoices).values(data);
  return result[0].insertId;
}

export async function updateInvoice(id: number, data: Partial<InsertInvoice>) {
  const db = await getDb();
  if (!db) return;
  await db.update(invoices).set(data).where(eq(invoices.id, id));
}

export async function getNextInvoiceNumber() {
  const db = await getDb();
  if (!db) return "INV-0001";
  const result = await db.select({ cnt: count() }).from(invoices);
  const num = (result[0]?.cnt || 0) + 1;
  return `INV-${String(num).padStart(4, "0")}`;
}

// ==================== TRANSACTIONS ====================
export async function getTransactions(type?: string) {
  const db = await getDb();
  if (!db) return [];
  if (type) {
    return db.select().from(transactions).where(eq(transactions.type, type as any)).orderBy(desc(transactions.createdAt));
  }
  return db.select().from(transactions).orderBy(desc(transactions.createdAt));
}

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(transactions).values(data);
  return result[0].insertId;
}

export async function getNextVoucherNumber(type: "receipt" | "payment") {
  const db = await getDb();
  if (!db) return type === "receipt" ? "RCV-0001" : "PAY-0001";
  const result = await db.select({ cnt: count() }).from(transactions).where(eq(transactions.type, type));
  const num = (result[0]?.cnt || 0) + 1;
  const prefix = type === "receipt" ? "RCV" : "PAY";
  return `${prefix}-${String(num).padStart(4, "0")}`;
}

// ==================== QUALITY ====================
export async function getQualityInspections(orderId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (orderId) {
    return db.select().from(qualityInspections).where(eq(qualityInspections.orderId, orderId)).orderBy(desc(qualityInspections.createdAt));
  }
  return db.select().from(qualityInspections).orderBy(desc(qualityInspections.createdAt));
}

export async function createQualityInspection(data: InsertQualityInspection) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(qualityInspections).values(data);
  return result[0].insertId;
}

// ==================== EMPLOYEES / TASKS ====================
export async function getEmployeeTasks(employeeId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (employeeId) {
    return db.select().from(employeeTasks).where(eq(employeeTasks.employeeId, employeeId)).orderBy(desc(employeeTasks.createdAt));
  }
  return db.select().from(employeeTasks).orderBy(desc(employeeTasks.createdAt));
}

export async function createEmployeeTask(data: { employeeId: number; orderId?: number; taskType: string; description?: string; quantity?: number; ratePerUnit?: string; totalDue?: string }) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(employeeTasks).values(data);
  return result[0].insertId;
}

export async function updateEmployeeTask(id: number, data: Partial<typeof employeeTasks.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(employeeTasks).set(data).where(eq(employeeTasks.id, id));
}

export async function getPerformanceEvaluations(employeeId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (employeeId) {
    return db.select().from(performanceEvaluations).where(eq(performanceEvaluations.employeeId, employeeId)).orderBy(desc(performanceEvaluations.createdAt));
  }
  return db.select().from(performanceEvaluations).orderBy(desc(performanceEvaluations.createdAt));
}

export async function createPerformanceEvaluation(data: typeof performanceEvaluations.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(performanceEvaluations).values(data);
  return result[0].insertId;
}

// ==================== SUPPLIERS ====================
export async function getSuppliers(type?: string) {
  const db = await getDb();
  if (!db) return [];
  if (type) {
    return db.select().from(suppliers).where(eq(suppliers.type, type as any)).orderBy(asc(suppliers.name));
  }
  return db.select().from(suppliers).orderBy(asc(suppliers.name));
}

export async function getSupplierById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return result[0];
}

export async function createSupplier(data: InsertSupplier) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(suppliers).values(data);
  return result[0].insertId;
}

export async function updateSupplier(id: number, data: Partial<InsertSupplier>) {
  const db = await getDb();
  if (!db) return;
  await db.update(suppliers).set(data).where(eq(suppliers.id, id));
}

export async function deleteSupplier(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(suppliers).where(eq(suppliers.id, id));
}

// ==================== CAMPAIGNS ====================
export async function getCampaigns() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
}

export async function createCampaign(data: typeof campaigns.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(campaigns).values(data);
  return result[0].insertId;
}

export async function updateCampaign(id: number, data: Partial<typeof campaigns.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(campaigns).set(data).where(eq(campaigns.id, id));
}

// ==================== ACTIVITY LOG ====================
export async function logActivity(data: { userId?: number; action: string; entity?: string; entityId?: number; details?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLog).values(data);
}

export async function getRecentActivity(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(limit);
}

// ==================== DASHBOARD STATS ====================
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalOrders: 0, activeOrders: 0, totalRevenue: "0", totalProfit: "0", totalCustomers: 0, lowStockCount: 0, pendingInvoices: 0, monthlyOrders: [] };

  const [orderStats] = await db.select({
    total: count(),
    totalRevenue: sum(orders.totalPrice),
    totalProfit: sum(orders.profit),
  }).from(orders);

  const [activeOrderStats] = await db.select({ cnt: count() }).from(orders)
    .where(and(
      sql`${orders.status} != 'delivered'`,
      sql`${orders.status} != 'cancelled'`
    ));

  const [customerStats] = await db.select({ cnt: count() }).from(customers);

  const lowStock = await getLowStockItems();

  const [pendingInv] = await db.select({ cnt: count() }).from(invoices)
    .where(or(eq(invoices.status, "draft"), eq(invoices.status, "sent"), eq(invoices.status, "partial"), eq(invoices.status, "overdue")));

  return {
    totalOrders: orderStats?.total || 0,
    activeOrders: activeOrderStats?.cnt || 0,
    totalRevenue: orderStats?.totalRevenue || "0",
    totalProfit: orderStats?.totalProfit || "0",
    totalCustomers: customerStats?.cnt || 0,
    lowStockCount: lowStock.length,
    pendingInvoices: pendingInv?.cnt || 0,
    lowStockItems: lowStock,
  };
}

// ==================== PRICING TEMPLATES ====================
export async function getPricingTemplates(productType?: string) {
  const db = await getDb();
  if (!db) return [];
  if (productType) {
    return db.select().from(pricingTemplates).where(eq(pricingTemplates.productType, productType)).orderBy(asc(pricingTemplates.name));
  }
  return db.select().from(pricingTemplates).orderBy(asc(pricingTemplates.name));
}

export async function savePricingTemplate(data: typeof pricingTemplates.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(pricingTemplates).values(data);
  return result[0].insertId;
}

// ==================== SAVED QUOTES ====================
export async function getSavedQuotes(status?: string) {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db.select().from(savedQuotes).where(eq(savedQuotes.status, status as any)).orderBy(desc(savedQuotes.createdAt));
  }
  return db.select().from(savedQuotes).orderBy(desc(savedQuotes.createdAt));
}

export async function getSavedQuoteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(savedQuotes).where(eq(savedQuotes.id, id)).limit(1);
  return result[0];
}

export async function createSavedQuote(data: InsertSavedQuote) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(savedQuotes).values(data);
  return result[0].insertId;
}

export async function updateSavedQuote(id: number, data: Partial<InsertSavedQuote>) {
  const db = await getDb();
  if (!db) return;
  await db.update(savedQuotes).set(data).where(eq(savedQuotes.id, id));
}

export async function deleteSavedQuote(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(savedQuotes).where(eq(savedQuotes.id, id));
}

export async function getNextQuoteNumber() {
  const db = await getDb();
  if (!db) return "QT-0001";
  const result = await db.select({ cnt: count() }).from(savedQuotes);
  const num = (result[0]?.cnt || 0) + 1;
  return `QT-${String(num).padStart(4, "0")}`;
}

// ==================== PAPER PRICES ====================
export async function getPaperPrices(currency?: string) {
  const db = await getDb();
  if (!db) return [];
  if (currency) {
    return db.select().from(paperPrices).where(eq(paperPrices.currency, currency)).orderBy(asc(paperPrices.paperType));
  }
  return db.select().from(paperPrices).orderBy(asc(paperPrices.paperType));
}

export async function upsertPaperPrice(data: { paperType: string; grammage: string; pricePerSheet: string; currency: string; updatedBy?: number }) {
  const db = await getDb();
  if (!db) return;
  // Check if exists
  const existing = await db.select().from(paperPrices)
    .where(and(
      eq(paperPrices.paperType, data.paperType),
      eq(paperPrices.grammage, data.grammage),
      eq(paperPrices.currency, data.currency)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(paperPrices)
      .set({ pricePerSheet: data.pricePerSheet, updatedBy: data.updatedBy })
      .where(eq(paperPrices.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(paperPrices).values(data);
    return result[0].insertId;
  }
}

// ==================== EXCHANGE RATES ====================
export async function getExchangeRates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(exchangeRates).orderBy(exchangeRates.toCurrency);
}

export async function upsertExchangeRate(data: { fromCurrency: string; toCurrency: string; rate: string; updatedBy?: number }) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(exchangeRates)
    .where(and(
      eq(exchangeRates.fromCurrency, data.fromCurrency),
      eq(exchangeRates.toCurrency, data.toCurrency)
    ))
    .limit(1);

  if (existing.length > 0) {
    await db.update(exchangeRates)
      .set({ rate: data.rate, updatedBy: data.updatedBy })
      .where(eq(exchangeRates.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(exchangeRates).values(data);
    return result[0].insertId;
  }
}
