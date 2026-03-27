import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module to avoid real database calls
vi.mock("./db", () => {
  return {
    getDashboardStats: vi.fn().mockResolvedValue({
      totalOrders: 15,
      activeOrders: 8,
      totalCustomers: 12,
      totalRevenue: 150000,
      totalCost: 90000,
      totalProfit: 60000,
      lowStockCount: 3,
      pendingInvoices: 5,
      ordersByStatus: { pricing: 2, design: 3, printing: 3 },
      revenueByMonth: [],
    }),
    getRecentActivity: vi.fn().mockResolvedValue([
      { id: 1, action: "create_order", entity: "order", entityId: 1, details: "إنشاء طلب", createdAt: new Date() },
    ]),
    getCustomers: vi.fn().mockResolvedValue([
      { id: 1, name: "شركة الاتحاد", phone: "0501234567", email: "union@test.com", company: "الاتحاد", source: "direct", totalOrders: 5, totalSpent: "50000", createdAt: new Date(), updatedAt: new Date() },
    ]),
    getCustomerById: vi.fn().mockResolvedValue({ id: 1, name: "شركة الاتحاد" }),
    createCustomer: vi.fn().mockResolvedValue(1),
    updateCustomer: vi.fn().mockResolvedValue(undefined),
    deleteCustomer: vi.fn().mockResolvedValue(undefined),
    getOrders: vi.fn().mockResolvedValue([
      { id: 1, orderNumber: "ORD-0001", customerId: 1, productType: "magazine", title: "مجلة تعريفية", quantity: 1000, status: "printing", priority: "high", createdAt: new Date(), updatedAt: new Date() },
    ]),
    getOrderById: vi.fn().mockResolvedValue({ id: 1, orderNumber: "ORD-0001", status: "printing", title: "مجلة تعريفية" }),
    getNextOrderNumber: vi.fn().mockResolvedValue("ORD-0002"),
    createOrder: vi.fn().mockResolvedValue(2),
    updateOrder: vi.fn().mockResolvedValue(undefined),
    deleteOrder: vi.fn().mockResolvedValue(undefined),
    addOrderStatusHistory: vi.fn().mockResolvedValue(undefined),
    getOrderStatusHistory: vi.fn().mockResolvedValue([]),
    getInventoryItems: vi.fn().mockResolvedValue([
      { id: 1, name: "كرتون 30x20x15", sku: "CTN-001", category: "carton", currentStock: 500, minStock: 100, unitCost: "5.00", createdAt: new Date() },
    ]),
    getInventoryItemById: vi.fn().mockResolvedValue({ id: 1, name: "كرتون 30x20x15" }),
    createInventoryItem: vi.fn().mockResolvedValue(1),
    updateInventoryItem: vi.fn().mockResolvedValue(undefined),
    addInventoryMovement: vi.fn().mockResolvedValue(undefined),
    getInventoryMovements: vi.fn().mockResolvedValue([]),
    getLowStockItems: vi.fn().mockResolvedValue([]),
    getInvoices: vi.fn().mockResolvedValue([
      { id: 1, invoiceNumber: "INV-0001", customerId: 1, subtotal: "10000", taxAmount: "1500", total: "11500", paidAmount: "0", status: "draft", createdAt: new Date() },
    ]),
    getInvoiceById: vi.fn().mockResolvedValue({ id: 1, invoiceNumber: "INV-0001", total: "11500", paidAmount: "0", status: "draft" }),
    getNextInvoiceNumber: vi.fn().mockResolvedValue("INV-0002"),
    createInvoice: vi.fn().mockResolvedValue(1),
    updateInvoice: vi.fn().mockResolvedValue(undefined),
    getTransactions: vi.fn().mockResolvedValue([]),
    createTransaction: vi.fn().mockResolvedValue(1),
    getNextVoucherNumber: vi.fn().mockResolvedValue("RCV-0001"),
    getQualityInspections: vi.fn().mockResolvedValue([]),
    createQualityInspection: vi.fn().mockResolvedValue(1),
    getAllUsers: vi.fn().mockResolvedValue([
      { id: 1, name: "أحمد", email: "ahmed@test.com", role: "admin", lastSignedIn: new Date() },
    ]),
    createInvitedUser: vi.fn().mockResolvedValue(2),
    updateUserRole: vi.fn().mockResolvedValue(undefined),
    setUserActive: vi.fn().mockResolvedValue(undefined),
    getEmployeeTasks: vi.fn().mockResolvedValue([]),
    createEmployeeTask: vi.fn().mockResolvedValue(1),
    updateEmployeeTask: vi.fn().mockResolvedValue(undefined),
    getPerformanceEvaluations: vi.fn().mockResolvedValue([]),
    createPerformanceEvaluation: vi.fn().mockResolvedValue(1),
    getSuppliers: vi.fn().mockResolvedValue([
      { id: 1, name: "مطبعة النور", type: "printer", phone: "0509876543", isActive: true, createdAt: new Date() },
    ]),
    getSupplierById: vi.fn().mockResolvedValue({ id: 1, name: "مطبعة النور" }),
    createSupplier: vi.fn().mockResolvedValue(1),
    updateSupplier: vi.fn().mockResolvedValue(undefined),
    deleteSupplier: vi.fn().mockResolvedValue(undefined),
    getCampaigns: vi.fn().mockResolvedValue([]),
    createCampaign: vi.fn().mockResolvedValue(1),
    updateCampaign: vi.fn().mockResolvedValue(undefined),
    getPricingTemplates: vi.fn().mockResolvedValue([]),
    savePricingTemplate: vi.fn().mockResolvedValue(1),
    logActivity: vi.fn().mockResolvedValue(undefined),
    getSavedQuotes: vi.fn().mockResolvedValue([
      { id: 1, quoteNumber: "QT-0001", customerName: "مصطفى", productType: "magazine", totalCost: "110500", totalPrice: "143650", quantity: 500, status: "draft", createdAt: new Date() },
    ]),
    getSavedQuoteById: vi.fn().mockResolvedValue({ id: 1, quoteNumber: "QT-0001", status: "draft" }),
    getNextQuoteNumber: vi.fn().mockResolvedValue("QT-0002"),
    createSavedQuote: vi.fn().mockResolvedValue(1),
    updateSavedQuote: vi.fn().mockResolvedValue(undefined),
    deleteSavedQuote: vi.fn().mockResolvedValue(undefined),
    getPaperPrices: vi.fn().mockResolvedValue([
      { id: 1, paperType: "كوشيه", grammage: "150", pricePerSheet: "25", currency: "YER" },
    ]),
    upsertPaperPrice: vi.fn().mockResolvedValue(1),
    getExchangeRates: vi.fn().mockResolvedValue([
      { id: 1, fromCurrency: "YER", toCurrency: "USD", rate: "530", updatedAt: new Date() },
    ]),
    upsertExchangeRate: vi.fn().mockResolvedValue(1),
  };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "admin@almesbahi.com",
    name: "مدير النظام",
    loginMethod: "manus",
    role: "admin",
    phone: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("Dashboard", () => {
  it("returns dashboard stats for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const stats = await caller.dashboard.stats();
    expect(stats).toBeDefined();
    expect(stats.totalOrders).toBe(15);
    expect(stats.totalCustomers).toBe(12);
    expect(stats.totalRevenue).toBe(150000);
  });

  it("returns recent activity", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const activity = await caller.dashboard.recentActivity();
    expect(Array.isArray(activity)).toBe(true);
    expect(activity.length).toBeGreaterThan(0);
  });

  it("rejects unauthenticated access to dashboard", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.dashboard.stats()).rejects.toThrow();
  });
});

describe("Customers", () => {
  it("lists customers", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const customers = await caller.customers.list();
    expect(Array.isArray(customers)).toBe(true);
    expect(customers[0]?.name).toBe("شركة الاتحاد");
  });

  it("creates a customer", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.customers.create({
      name: "شركة الأمل",
      phone: "0501112233",
      source: "referral",
    });
    expect(result.id).toBe(1);
  });

  it("updates a customer", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.customers.update({ id: 1, name: "شركة الاتحاد المحدثة" });
    expect(result.success).toBe(true);
  });

  it("deletes a customer", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.customers.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

describe("Orders", () => {
  it("lists orders", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const orders = await caller.orders.list();
    expect(Array.isArray(orders)).toBe(true);
    expect(orders[0]?.orderNumber).toBe("ORD-0001");
  });

  it("gets next order number", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const num = await caller.orders.getNextNumber();
    expect(num).toBe("ORD-0002");
  });

  it("creates an order", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.orders.create({
      orderNumber: "ORD-0002",
      customerId: 1,
      productType: "magazine",
      title: "مجلة تعريفية",
      quantity: 1000,
      priority: "high",
    });
    expect(result.id).toBe(2);
  });

  it("updates order status", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.orders.updateStatus({
      id: 1,
      status: "quality_check",
      notes: "انتهاء الطباعة",
    });
    expect(result.success).toBe(true);
  });

  it("deletes an order", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.orders.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

describe("Inventory", () => {
  it("lists inventory items", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const items = await caller.inventory.list();
    expect(Array.isArray(items)).toBe(true);
    expect(items[0]?.name).toBe("كرتون 30x20x15");
  });

  it("creates an inventory item", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.inventory.create({
      name: "ورق كوشيه 150 جم",
      sku: "PPR-001",
      category: "paper",
      currentStock: 200,
      minStock: 50,
      unitCost: "12.50",
    });
    expect(result.id).toBe(1);
  });

  it("adds inventory movement", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.inventory.addMovement({
      itemId: 1,
      type: "inbound",
      quantity: 100,
      reason: "شراء جديد",
    });
    expect(result.success).toBe(true);
  });

  it("gets low stock items", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const items = await caller.inventory.lowStock();
    expect(Array.isArray(items)).toBe(true);
  });
});

describe("Invoices", () => {
  it("lists invoices", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const invoices = await caller.invoices.list();
    expect(Array.isArray(invoices)).toBe(true);
    expect(invoices[0]?.invoiceNumber).toBe("INV-0001");
  });

  it("creates an invoice", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.invoices.create({
      invoiceNumber: "INV-0002",
      customerId: 1,
      subtotal: "10000",
      taxAmount: "1500",
      total: "11500",
    });
    expect(result.id).toBe(1);
  });

  it("updates invoice status", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.invoices.update({ id: 1, status: "sent" });
    expect(result.success).toBe(true);
  });
});

describe("Transactions", () => {
  it("lists transactions", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const txs = await caller.transactions.list();
    expect(Array.isArray(txs)).toBe(true);
  });

  it("creates a receipt transaction", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.transactions.create({
      type: "receipt",
      voucherNumber: "RCV-0001",
      amount: "5000",
      paymentMethod: "cash",
      description: "دفعة أولى",
    });
    expect(result.id).toBe(1);
  });

  it("creates a payment transaction linked to invoice", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.transactions.create({
      type: "receipt",
      voucherNumber: "RCV-0002",
      amount: "11500",
      invoiceId: 1,
      paymentMethod: "bank_transfer",
    });
    expect(result.id).toBe(1);
  });
});

describe("Quality Inspections", () => {
  it("lists inspections", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const inspections = await caller.quality.list();
    expect(Array.isArray(inspections)).toBe(true);
  });

  it("creates a quality inspection", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.quality.create({
      orderId: 1,
      result: "pass",
      supplierRating: 4,
      printerRating: 5,
      checklistResults: [{ item: "مطابقة الألوان", passed: true }],
    });
    expect(result.id).toBe(1);
  });
});

describe("Employees", () => {
  it("lists employees", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const employees = await caller.employees.list();
    expect(Array.isArray(employees)).toBe(true);
    expect(employees[0]?.name).toBe("أحمد");
  });

  it("invites a new employee user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.employees.createUser({
      name: "موظف جديد",
      email: "new.employee@test.com",
      role: "sales",
    });
    expect(result.id).toBe(2);
  });

  it("updates employee role", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.employees.updateRole({ userId: 1, role: "production" });
    expect(result.success).toBe(true);
  });

  it("updates employee active status", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.employees.updateStatus({ userId: 2, isActive: false });
    expect(result.success).toBe(true);
  });

  it("creates an employee task", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.employees.createTask({
      employeeId: 1,
      taskType: "تجليد",
      description: "تجليد 500 نسخة",
      quantity: 500,
      ratePerUnit: "0.50",
    });
    expect(result.id).toBe(1);
  });

  it("creates a performance evaluation", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.employees.createEvaluation({
      employeeId: 1,
      period: "مارس 2026",
      qualityScore: 8,
      speedScore: 7,
      attendanceScore: 9,
      teamworkScore: 8,
    });
    expect(result.id).toBe(1);
  });
});

describe("Suppliers", () => {
  it("lists suppliers", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const suppliers = await caller.suppliers.list();
    expect(Array.isArray(suppliers)).toBe(true);
    expect(suppliers[0]?.name).toBe("مطبعة النور");
  });

  it("creates a supplier", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.suppliers.create({
      name: "مطبعة الفجر",
      type: "printer",
      phone: "0507654321",
    });
    expect(result.id).toBe(1);
  });

  it("updates a supplier", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.suppliers.update({ id: 1, rating: 5 });
    expect(result.success).toBe(true);
  });

  it("deletes a supplier", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.suppliers.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

describe("Campaigns", () => {
  it("lists campaigns", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const campaigns = await caller.campaigns.list();
    expect(Array.isArray(campaigns)).toBe(true);
  });

  it("creates a campaign", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.campaigns.create({
      name: "حملة رمضان",
      channel: "instagram",
      budget: "5000",
    });
    expect(result.id).toBe(1);
  });

  it("updates a campaign", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.campaigns.update({ id: 1, status: "active", leads: 50 });
    expect(result.success).toBe(true);
  });
});

describe("Pricing", () => {
  it("lists pricing templates", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const templates = await caller.pricing.templates();
    expect(Array.isArray(templates)).toBe(true);
  });

  it("saves a pricing template", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.pricing.saveTemplate({
      productType: "magazine",
      name: "قالب مجلة A4",
      defaultMargin: "30.00",
    });
    expect(result.id).toBe(1);
  });
});

describe("Saved Quotes", () => {
  it("lists saved quotes", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const quotes = await caller.quotes.list();
    expect(Array.isArray(quotes)).toBe(true);
  });

  it("gets next quote number", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const num = await caller.quotes.getNextNumber();
    expect(typeof num).toBe("string");
  });

  it("creates a saved quote", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.quotes.create({
      quoteNumber: "QT-0001",
      customerName: "مصطفى المصباحي",
      productType: "magazine",
      totalCost: "110500",
      totalPrice: "143650",
      unitPrice: "287.30",
      profitMargin: "30",
      quantity: 500,
      pricingData: { paperType: "كوشيه 150 جم", size: "A5" },
    });
    expect(result.id).toBeDefined();
  });

  it("updates a saved quote status", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.quotes.update({ id: 1, status: "sent" });
    expect(result.success).toBe(true);
  });

  it("deletes a saved quote", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.quotes.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated access to quotes", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.quotes.list()).rejects.toThrow();
  });
});

describe("Paper Prices", () => {
  it("lists paper prices", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const prices = await caller.paperPrices.list();
    expect(Array.isArray(prices)).toBe(true);
  });

  it("upserts a paper price", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.paperPrices.upsert({
      paperType: "كوشيه",
      grammage: "150",
      pricePerSheet: "25",
      currency: "YER",
    });
    expect(result.id).toBeDefined();
  });

  it("rejects unauthenticated access to paper prices", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.paperPrices.list()).rejects.toThrow();
  });
});


describe("Exchange Rates", () => {
  it("lists exchange rates", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const rates = await caller.exchangeRates.list();
    expect(Array.isArray(rates)).toBe(true);
    expect(rates.length).toBeGreaterThan(0);
    expect(rates[0].fromCurrency).toBe("YER");
    expect(rates[0].toCurrency).toBe("USD");
  });

  it("upserts an exchange rate", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.exchangeRates.upsert({
      fromCurrency: "YER",
      toCurrency: "SAR",
      rate: "145",
    });
    expect(result.id).toBeDefined();
  });

  it("rejects unauthenticated access to exchange rates", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.exchangeRates.list()).rejects.toThrow();
  });
});
