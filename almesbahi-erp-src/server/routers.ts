import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==================== DASHBOARD ====================
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      return db.getDashboardStats();
    }),
    recentActivity: protectedProcedure.query(async () => {
      return db.getRecentActivity(20);
    }),
  }),

  // ==================== CUSTOMERS ====================
  customers: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getCustomers(input?.search);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getCustomerById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().optional(),
      company: z.string().optional(),
      address: z.string().optional(),
      source: z.enum(["direct", "referral", "social_media", "website", "exhibition", "other"]).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createCustomer(input);
      await db.logActivity({ userId: ctx.user.id, action: "create_customer", entity: "customer", entityId: id, details: `إنشاء عميل: ${input.name}` });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      company: z.string().optional(),
      address: z.string().optional(),
      source: z.enum(["direct", "referral", "social_media", "website", "exhibition", "other"]).optional(),
      notes: z.string().optional(),
      rating: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await db.updateCustomer(id, data);
      await db.logActivity({ userId: ctx.user.id, action: "update_customer", entity: "customer", entityId: id });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await db.deleteCustomer(input.id);
      await db.logActivity({ userId: ctx.user.id, action: "delete_customer", entity: "customer", entityId: input.id });
      return { success: true };
    }),
  }),

  // ==================== ORDERS ====================
  orders: router({
    list: protectedProcedure.input(z.object({
      status: z.string().optional(),
      customerId: z.number().optional(),
      search: z.string().optional(),
    }).optional()).query(async ({ input }) => {
      return db.getOrders(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getOrderById(input.id);
    }),
    getNextNumber: protectedProcedure.query(async () => {
      return db.getNextOrderNumber();
    }),
    create: protectedProcedure.input(z.object({
      orderNumber: z.string(),
      customerId: z.number(),
      productType: z.enum(["magazine", "bag", "box", "invitation", "folder", "sticker", "brochure", "other"]),
      title: z.string().min(1),
      description: z.string().optional(),
      quantity: z.number().min(1),
      currency: z.enum(["YER", "SAR", "USD"]).optional(),
      unitPrice: z.string().optional(),
      totalCost: z.string().optional(),
      totalPrice: z.string().optional(),
      profit: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      dueDate: z.date().optional(),
      specs: z.any().optional(),
      pricingDetails: z.any().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createOrder({ ...input, createdBy: ctx.user.id, status: "pricing" });
      await db.addOrderStatusHistory({ orderId: id!, toStatus: "pricing", changedBy: ctx.user.id, notes: "إنشاء الطلب" });
      await db.logActivity({ userId: ctx.user.id, action: "create_order", entity: "order", entityId: id, details: `إنشاء طلب: ${input.title}` });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      quantity: z.number().optional(),
      currency: z.enum(["YER", "SAR", "USD"]).optional(),
      unitPrice: z.string().optional(),
      totalCost: z.string().optional(),
      totalPrice: z.string().optional(),
      profit: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      assignedTo: z.number().nullable().optional(),
      designerId: z.number().nullable().optional(),
      designApproved: z.boolean().optional(),
      dueDate: z.date().nullable().optional(),
      specs: z.any().optional(),
      pricingDetails: z.any().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await db.updateOrder(id, data);
      await db.logActivity({ userId: ctx.user.id, action: "update_order", entity: "order", entityId: id });
      return { success: true };
    }),
    updateStatus: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["pricing", "design", "paper_purchase", "printing", "external_finishing", "internal_finishing", "quality_check", "ready_delivery", "delivered", "cancelled"]),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const order = await db.getOrderById(input.id);
      if (!order) throw new Error("الطلب غير موجود");
      await db.updateOrder(input.id, {
        status: input.status,
        ...(input.status === "delivered" ? { deliveredAt: new Date() } : {}),
      });
      await db.addOrderStatusHistory({
        orderId: input.id,
        fromStatus: order.status,
        toStatus: input.status,
        changedBy: ctx.user.id,
        notes: input.notes,
      });
      await db.logActivity({ userId: ctx.user.id, action: "update_order_status", entity: "order", entityId: input.id, details: `${order.status} → ${input.status}` });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await db.deleteOrder(input.id);
      await db.logActivity({ userId: ctx.user.id, action: "delete_order", entity: "order", entityId: input.id });
      return { success: true };
    }),
    statusHistory: protectedProcedure.input(z.object({ orderId: z.number() })).query(async ({ input }) => {
      return db.getOrderStatusHistory(input.orderId);
    }),
  }),

  // ==================== INVENTORY ====================
  inventory: router({
    list: protectedProcedure.input(z.object({ category: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getInventoryItems(input?.category);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getInventoryItemById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      sku: z.string().optional(),
      category: z.enum(["carton", "paper", "ink", "finishing_material", "other"]).optional(),
      size: z.string().optional(),
      unit: z.string().optional(),
      currentStock: z.number().optional(),
      minStock: z.number().optional(),
      unitCost: z.string().optional(),
      location: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const totalValue = String((input.currentStock || 0) * Number(input.unitCost || 0));
      const id = await db.createInventoryItem({ ...input, totalValue });
      await db.logActivity({ userId: ctx.user.id, action: "create_inventory", entity: "inventory", entityId: id, details: `إضافة صنف: ${input.name}` });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      sku: z.string().optional(),
      category: z.enum(["carton", "paper", "ink", "finishing_material", "other"]).optional(),
      size: z.string().optional(),
      unit: z.string().optional(),
      minStock: z.number().optional(),
      unitCost: z.string().optional(),
      location: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await db.updateInventoryItem(id, data);
      await db.logActivity({ userId: ctx.user.id, action: "update_inventory", entity: "inventory", entityId: id });
      return { success: true };
    }),
    addMovement: protectedProcedure.input(z.object({
      itemId: z.number(),
      type: z.enum(["inbound", "outbound"]),
      quantity: z.number().min(1),
      reason: z.string().optional(),
      orderId: z.number().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await db.addInventoryMovement({ ...input, performedBy: ctx.user.id });
      await db.logActivity({ userId: ctx.user.id, action: `inventory_${input.type}`, entity: "inventory", entityId: input.itemId, details: `${input.type === "inbound" ? "إضافة" : "صرف"} ${input.quantity}` });
      return { success: true };
    }),
    movements: protectedProcedure.input(z.object({ itemId: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getInventoryMovements(input?.itemId);
    }),
    lowStock: protectedProcedure.query(async () => {
      return db.getLowStockItems();
    }),
  }),

  // ==================== INVOICES ====================
  invoices: router({
    list: protectedProcedure.input(z.object({ status: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getInvoices(input?.status);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getInvoiceById(input.id);
    }),
    getNextNumber: protectedProcedure.query(async () => {
      return db.getNextInvoiceNumber();
    }),
    create: protectedProcedure.input(z.object({
      invoiceNumber: z.string(),
      orderId: z.number().optional(),
      customerId: z.number(),
      currency: z.enum(["YER", "SAR", "USD"]).optional(),
      subtotal: z.string(),
      taxRate: z.string().optional(),
      taxAmount: z.string(),
      total: z.string(),
      dueDate: z.date().optional(),
      notes: z.string().optional(),
      items: z.any().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createInvoice({ ...input, createdBy: ctx.user.id });
      await db.logActivity({ userId: ctx.user.id, action: "create_invoice", entity: "invoice", entityId: id, details: `فاتورة: ${input.invoiceNumber}` });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["draft", "sent", "partial", "paid", "overdue", "cancelled"]).optional(),
      paidAmount: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await db.updateInvoice(id, data);
      await db.logActivity({ userId: ctx.user.id, action: "update_invoice", entity: "invoice", entityId: id });
      return { success: true };
    }),
  }),

  // ==================== TRANSACTIONS ====================
  transactions: router({
    list: protectedProcedure.input(z.object({ type: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getTransactions(input?.type);
    }),
    create: protectedProcedure.input(z.object({
      type: z.enum(["receipt", "payment"]),
      voucherNumber: z.string(),
      currency: z.enum(["YER", "SAR", "USD"]).optional(),
      amount: z.string(),
      invoiceId: z.number().optional(),
      orderId: z.number().optional(),
      customerId: z.number().optional(),
      paymentMethod: z.enum(["cash", "bank_transfer", "check", "other"]).optional(),
      category: z.string().optional(),
      description: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createTransaction({ ...input, createdBy: ctx.user.id });
      // Update invoice paid amount if linked
      if (input.invoiceId && input.type === "receipt") {
        const invoice = await db.getInvoiceById(input.invoiceId);
        if (invoice) {
          const newPaid = Number(invoice.paidAmount || 0) + Number(input.amount);
          const total = Number(invoice.total);
          const status = newPaid >= total ? "paid" : newPaid > 0 ? "partial" : invoice.status;
          await db.updateInvoice(input.invoiceId, { paidAmount: String(newPaid), status: status as any });
        }
      }
      await db.logActivity({ userId: ctx.user.id, action: `create_${input.type}`, entity: "transaction", entityId: id, details: `${input.type === "receipt" ? "سند قبض" : "سند صرف"}: ${input.amount} ${input.currency || "YER"}` });
      return { id };
    }),
    getNextVoucherNumber: protectedProcedure.input(z.object({ type: z.enum(["receipt", "payment"]) })).query(async ({ input }) => {
      return db.getNextVoucherNumber(input.type);
    }),
  }),

  // ==================== QUALITY ====================
  quality: router({
    list: protectedProcedure.input(z.object({ orderId: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getQualityInspections(input?.orderId);
    }),
    create: protectedProcedure.input(z.object({
      orderId: z.number(),
      result: z.enum(["pass", "fail", "rework"]).optional(),
      checklistResults: z.any().optional(),
      defects: z.string().optional(),
      defectPhotos: z.any().optional(),
      supplierRating: z.number().optional(),
      printerRating: z.number().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createQualityInspection({ ...input, inspectorId: ctx.user.id });
      await db.logActivity({ userId: ctx.user.id, action: "create_inspection", entity: "quality", entityId: id, details: `فحص جودة للطلب #${input.orderId}` });
      return { id };
    }),
  }),

  // ==================== EMPLOYEES ====================
  employees: router({
    list: protectedProcedure.query(async () => {
      return db.getAllUsers();
    }),
    createUser: adminProcedure.input(z.object({
      email: z.string().email("البريد الإلكتروني غير صالح"),
      name: z.string().trim().min(2, "الاسم مطلوب").optional(),
      role: z.enum(["admin", "sales", "production", "designer", "technician", "user"]).default("user"),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createInvitedUser({
        email: input.email,
        name: input.name,
        role: input.role,
      });
      await db.logActivity({
        userId: ctx.user.id,
        action: "invite_user",
        entity: "user",
        entityId: id,
        details: `دعوة مستخدم جديد: ${input.email}`,
      });
      return { id };
    }),
    updateRole: protectedProcedure.input(z.object({
      userId: z.number(),
      role: z.enum(["admin", "sales", "production", "designer", "technician", "user"]),
    })).mutation(async ({ input, ctx }) => {
      await db.updateUserRole(input.userId, input.role);
      await db.logActivity({ userId: ctx.user.id, action: "update_role", entity: "user", entityId: input.userId });
      return { success: true };
    }),
    tasks: protectedProcedure.input(z.object({ employeeId: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getEmployeeTasks(input?.employeeId);
    }),
    createTask: protectedProcedure.input(z.object({
      employeeId: z.number(),
      orderId: z.number().optional(),
      taskType: z.string(),
      description: z.string().optional(),
      quantity: z.number().optional(),
      ratePerUnit: z.string().optional(),
      totalDue: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const totalDue = input.totalDue || String((input.quantity || 0) * Number(input.ratePerUnit || 0));
      const id = await db.createEmployeeTask({ ...input, totalDue });
      await db.logActivity({ userId: ctx.user.id, action: "create_task", entity: "task", entityId: id });
      return { id };
    }),
    updateTask: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
      quantity: z.number().optional(),
      completedAt: z.date().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateEmployeeTask(id, data);
      return { success: true };
    }),
    evaluations: protectedProcedure.input(z.object({ employeeId: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getPerformanceEvaluations(input?.employeeId);
    }),
    createEvaluation: protectedProcedure.input(z.object({
      employeeId: z.number(),
      period: z.string(),
      qualityScore: z.number().optional(),
      speedScore: z.number().optional(),
      attendanceScore: z.number().optional(),
      teamworkScore: z.number().optional(),
      overallScore: z.number().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const overallScore = input.overallScore || Math.round(((input.qualityScore || 0) + (input.speedScore || 0) + (input.attendanceScore || 0) + (input.teamworkScore || 0)) / 4);
      const id = await db.createPerformanceEvaluation({ ...input, overallScore, evaluatorId: ctx.user.id });
      return { id };
    }),
  }),

  // ==================== SUPPLIERS ====================
  suppliers: router({
    list: protectedProcedure.input(z.object({ type: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getSuppliers(input?.type);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getSupplierById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      type: z.enum(["paper_supplier", "printer", "finishing_shop", "die_maker", "other"]).optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createSupplier(input);
      await db.logActivity({ userId: ctx.user.id, action: "create_supplier", entity: "supplier", entityId: id, details: `إضافة مورد: ${input.name}` });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      type: z.enum(["paper_supplier", "printer", "finishing_shop", "die_maker", "other"]).optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      rating: z.number().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await db.updateSupplier(id, data);
      await db.logActivity({ userId: ctx.user.id, action: "update_supplier", entity: "supplier", entityId: id });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await db.deleteSupplier(input.id);
      await db.logActivity({ userId: ctx.user.id, action: "delete_supplier", entity: "supplier", entityId: input.id });
      return { success: true };
    }),
  }),

  // ==================== CAMPAIGNS ====================
  campaigns: router({
    list: protectedProcedure.query(async () => {
      return db.getCampaigns();
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      channel: z.enum(["instagram", "tiktok", "linkedin", "whatsapp", "email", "direct", "other"]).optional(),
      budget: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createCampaign({ ...input, createdBy: ctx.user.id });
      await db.logActivity({ userId: ctx.user.id, action: "create_campaign", entity: "campaign", entityId: id });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      status: z.enum(["planned", "active", "completed", "cancelled"]).optional(),
      leads: z.number().optional(),
      conversions: z.number().optional(),
      revenue: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateCampaign(id, data);
      return { success: true };
    }),
  }),

  // ==================== PRICING ====================
  pricing: router({
    templates: protectedProcedure.input(z.object({ productType: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getPricingTemplates(input?.productType);
    }),
    saveTemplate: protectedProcedure.input(z.object({
      productType: z.string(),
      name: z.string(),
      paperTypes: z.any().optional(),
      finishingOptions: z.any().optional(),
      quantityBreaks: z.any().optional(),
      defaultMargin: z.string().optional(),
    })).mutation(async ({ input }) => {
      const id = await db.savePricingTemplate(input);
      return { id };
    }),
  }),

  // ==================== SAVED QUOTES ====================
  quotes: router({
    list: protectedProcedure.input(z.object({ status: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getSavedQuotes(input?.status);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getSavedQuoteById(input.id);
    }),
    getNextNumber: protectedProcedure.query(async () => {
      return db.getNextQuoteNumber();
    }),
    create: protectedProcedure.input(z.object({
      quoteNumber: z.string(),
      customerName: z.string().optional(),
      customerId: z.number().optional(),
      productType: z.string(),
      currency: z.enum(["YER", "SAR", "USD"]).optional(),
      totalCost: z.string(),
      totalPrice: z.string(),
      unitPrice: z.string().optional(),
      profitMargin: z.string().optional(),
      quantity: z.number(),
      pricingData: z.any(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createSavedQuote({ ...input, createdBy: ctx.user.id });
      await db.logActivity({ userId: ctx.user.id, action: "create_quote", entity: "quote", entityId: id, details: `تسعيرة: ${input.quoteNumber}` });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["draft", "sent", "accepted", "rejected", "converted"]).optional(),
      customerName: z.string().optional(),
      totalPrice: z.string().optional(),
      notes: z.string().optional(),
      convertedInvoiceId: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await db.updateSavedQuote(id, data);
      await db.logActivity({ userId: ctx.user.id, action: "update_quote", entity: "quote", entityId: id });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await db.deleteSavedQuote(input.id);
      await db.logActivity({ userId: ctx.user.id, action: "delete_quote", entity: "quote", entityId: input.id });
      return { success: true };
    }),
  }),

  // ==================== PAPER PRICES ====================
  paperPrices: router({
    list: protectedProcedure.input(z.object({ currency: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getPaperPrices(input?.currency);
    }),
    upsert: protectedProcedure.input(z.object({
      paperType: z.string(),
      grammage: z.string(),
      pricePerSheet: z.string(),
      currency: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.upsertPaperPrice({ ...input, currency: input.currency || "YER", updatedBy: ctx.user.id });
      return { id };
    }),
  }),

  // ==================== EXCHANGE RATES ====================
  exchangeRates: router({
    list: protectedProcedure.query(async () => {
      return db.getExchangeRates();
    }),
    upsert: protectedProcedure.input(z.object({
      fromCurrency: z.string().default("YER"),
      toCurrency: z.string(),
      rate: z.string(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.upsertExchangeRate({ ...input, updatedBy: ctx.user.id });
      return { id };
    }),
  }),
});

export type AppRouter = typeof appRouter;
