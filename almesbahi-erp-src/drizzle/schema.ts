import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

// ==================== USERS ====================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "sales", "production", "designer", "technician", "user"]).default("user").notNull(),
  phone: varchar("phone", { length: 20 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==================== CUSTOMERS ====================
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  company: varchar("company", { length: 255 }),
  address: text("address"),
  source: mysqlEnum("source", ["direct", "referral", "social_media", "website", "exhibition", "other"]).default("direct"),
  notes: text("notes"),
  rating: int("rating").default(0),
  totalOrders: int("totalOrders").default(0),
  totalSpent: decimal("totalSpent", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ==================== ORDERS ====================
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 20 }).notNull().unique(),
  customerId: int("customerId").notNull(),
  productType: mysqlEnum("productType", ["magazine", "bag", "box", "invitation", "folder", "sticker", "brochure", "other"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  quantity: int("quantity").notNull(),
  currency: varchar("currency", { length: 5 }).default("YER").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).default("0"),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }).default("0"),
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }).default("0"),
  profit: decimal("profit", { precision: 12, scale: 2 }).default("0"),
  status: mysqlEnum("status", ["pricing", "design", "paper_purchase", "printing", "external_finishing", "internal_finishing", "quality_check", "ready_delivery", "delivered", "cancelled"]).default("pricing").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium"),
  assignedTo: int("assignedTo"),
  designerId: int("designerId"),
  designApproved: boolean("designApproved").default(false),
  designApprovedAt: timestamp("designApprovedAt"),
  dueDate: timestamp("dueDate"),
  deliveredAt: timestamp("deliveredAt"),
  specs: json("specs"),
  pricingDetails: json("pricingDetails"),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ==================== ORDER STATUS HISTORY ====================
export const orderStatusHistory = mysqlTable("orderStatusHistory", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  fromStatus: varchar("fromStatus", { length: 50 }),
  toStatus: varchar("toStatus", { length: 50 }).notNull(),
  changedBy: int("changedBy"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ==================== INVENTORY ====================
export const inventoryItems = mysqlTable("inventoryItems", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 50 }).unique(),
  category: mysqlEnum("category", ["carton", "paper", "ink", "finishing_material", "other"]).default("carton"),
  size: varchar("size", { length: 100 }),
  unit: varchar("unit", { length: 20 }).default("piece"),
  currentStock: int("currentStock").default(0),
  minStock: int("minStock").default(10),
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }).default("0"),
  totalValue: decimal("totalValue", { precision: 12, scale: 2 }).default("0"),
  location: varchar("location", { length: 100 }),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = typeof inventoryItems.$inferInsert;

// ==================== INVENTORY MOVEMENTS ====================
export const inventoryMovements = mysqlTable("inventoryMovements", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull(),
  type: mysqlEnum("type", ["inbound", "outbound"]).notNull(),
  quantity: int("quantity").notNull(),
  reason: varchar("reason", { length: 255 }),
  orderId: int("orderId"),
  performedBy: int("performedBy"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InventoryMovement = typeof inventoryMovements.$inferSelect;

// ==================== INVOICES ====================
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 20 }).notNull().unique(),
  orderId: int("orderId"),
  customerId: int("customerId").notNull(),
  currency: varchar("currency", { length: 5 }).default("YER").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("15.00"),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paidAmount", { precision: 12, scale: 2 }).default("0"),
  status: mysqlEnum("status", ["draft", "sent", "partial", "paid", "overdue", "cancelled"]).default("draft"),
  dueDate: timestamp("dueDate"),
  notes: text("notes"),
  items: json("items"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// ==================== FINANCIAL TRANSACTIONS ====================
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["receipt", "payment"]).notNull(),
  voucherNumber: varchar("voucherNumber", { length: 20 }).notNull().unique(),
  currency: varchar("currency", { length: 5 }).default("YER").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  invoiceId: int("invoiceId"),
  orderId: int("orderId"),
  customerId: int("customerId"),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank_transfer", "check", "other"]).default("cash"),
  category: varchar("category", { length: 100 }),
  description: text("description"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ==================== QUALITY INSPECTIONS ====================
export const qualityInspections = mysqlTable("qualityInspections", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  inspectorId: int("inspectorId"),
  result: mysqlEnum("result", ["pass", "fail", "rework"]).default("pass"),
  checklistResults: json("checklistResults"),
  defects: text("defects"),
  defectPhotos: json("defectPhotos"),
  supplierRating: int("supplierRating"),
  printerRating: int("printerRating"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QualityInspection = typeof qualityInspections.$inferSelect;
export type InsertQualityInspection = typeof qualityInspections.$inferInsert;

// ==================== EMPLOYEE TASKS ====================
export const employeeTasks = mysqlTable("employeeTasks", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  orderId: int("orderId"),
  taskType: varchar("taskType", { length: 100 }).notNull(),
  description: text("description"),
  quantity: int("quantity").default(0),
  ratePerUnit: decimal("ratePerUnit", { precision: 10, scale: 2 }).default("0"),
  totalDue: decimal("totalDue", { precision: 10, scale: 2 }).default("0"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmployeeTask = typeof employeeTasks.$inferSelect;

// ==================== PERFORMANCE EVALUATIONS ====================
export const performanceEvaluations = mysqlTable("performanceEvaluations", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  evaluatorId: int("evaluatorId"),
  period: varchar("period", { length: 20 }).notNull(),
  qualityScore: int("qualityScore").default(0),
  speedScore: int("speedScore").default(0),
  attendanceScore: int("attendanceScore").default(0),
  teamworkScore: int("teamworkScore").default(0),
  overallScore: int("overallScore").default(0),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ==================== MARKETING CAMPAIGNS ====================
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  channel: mysqlEnum("channel", ["instagram", "tiktok", "linkedin", "whatsapp", "email", "direct", "other"]).default("instagram"),
  budget: decimal("budget", { precision: 10, scale: 2 }).default("0"),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  status: mysqlEnum("status", ["planned", "active", "completed", "cancelled"]).default("planned"),
  leads: int("leads").default(0),
  conversions: int("conversions").default(0),
  revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;

// ==================== ACTIVITY LOG ====================
export const activityLog = mysqlTable("activityLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 100 }).notNull(),
  entity: varchar("entity", { length: 50 }),
  entityId: int("entityId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ==================== SUPPLIERS ====================
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["paper_supplier", "printer", "finishing_shop", "die_maker", "other"]).default("other"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  rating: int("rating").default(0),
  totalOrders: int("totalOrders").default(0),
  notes: text("notes"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// ==================== PRICING TEMPLATES ====================
export const pricingTemplates = mysqlTable("pricingTemplates", {
  id: int("id").autoincrement().primaryKey(),
  productType: varchar("productType", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  paperTypes: json("paperTypes"),
  finishingOptions: json("finishingOptions"),
  quantityBreaks: json("quantityBreaks"),
  defaultMargin: decimal("defaultMargin", { precision: 5, scale: 2 }).default("30.00"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ==================== SAVED QUOTES ====================
export const savedQuotes = mysqlTable("savedQuotes", {
  id: int("id").autoincrement().primaryKey(),
  quoteNumber: varchar("quoteNumber", { length: 20 }).notNull().unique(),
  customerName: varchar("customerName", { length: 255 }),
  customerId: int("customerId"),
  productType: varchar("productType", { length: 50 }).notNull(),
  currency: varchar("currency", { length: 5 }).default("YER").notNull(),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).default("0"),
  profitMargin: decimal("profitMargin", { precision: 5, scale: 2 }).default("20"),
  quantity: int("quantity").notNull(),
  pricingData: json("pricingData").notNull(),
  status: mysqlEnum("status", ["draft", "sent", "accepted", "rejected", "converted"]).default("draft"),
  convertedInvoiceId: int("convertedInvoiceId"),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavedQuote = typeof savedQuotes.$inferSelect;
export type InsertSavedQuote = typeof savedQuotes.$inferInsert;

// ==================== PAPER PRICES (Auto-saved) ====================
export const paperPrices = mysqlTable("paperPrices", {
  id: int("id").autoincrement().primaryKey(),
  paperType: varchar("paperType", { length: 100 }).notNull(),
  grammage: varchar("grammage", { length: 20 }).notNull(),
  pricePerSheet: decimal("pricePerSheet", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 5 }).default("YER").notNull(),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaperPrice = typeof paperPrices.$inferSelect;
export type InsertPaperPrice = typeof paperPrices.$inferInsert;

// ==================== EXCHANGE RATES ====================
export const exchangeRates = mysqlTable("exchangeRates", {
  id: int("id").autoincrement().primaryKey(),
  fromCurrency: varchar("fromCurrency", { length: 5 }).default("YER").notNull(),
  toCurrency: varchar("toCurrency", { length: 5 }).notNull(),
  rate: decimal("rate", { precision: 12, scale: 4 }).notNull(),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type InsertExchangeRate = typeof exchangeRates.$inferInsert;
