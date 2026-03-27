// Arabic labels for order statuses
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pricing: "التسعير",
  design: "التصميم",
  paper_purchase: "شراء الورق",
  printing: "الطباعة",
  external_finishing: "تشطيب خارجي",
  internal_finishing: "تشطيب داخلي",
  quality_check: "فحص الجودة",
  ready_delivery: "جاهز للتسليم",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pricing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  design: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  paper_purchase: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  printing: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  external_finishing: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  internal_finishing: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  quality_check: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  ready_delivery: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  magazine: "مجلة",
  book: "كتاب",
  booklet: "كتيب",
  profile: "بروفايل",
  bag: "أكياس ورقية",
  box: "علب هدايا",
  invitation: "دعوات",
  folder: "فولدرات",
  sticker: "ستيكرات",
  brochure: "بروشورات",
  other: "أخرى",
};

// أنواع المنتجات التي تستخدم نفس إعدادات المجلة (ملازم، غلاف منفصل، أفرخ)
export const MAGAZINE_LIKE_TYPES = ["magazine", "book", "booklet", "profile"] as const;

export const PRIORITY_LABELS: Record<string, string> = {
  low: "منخفض",
  medium: "متوسط",
  high: "عالي",
  urgent: "عاجل",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  sent: "مرسلة",
  partial: "مدفوعة جزئياً",
  paid: "مدفوعة",
  overdue: "متأخرة",
  cancelled: "ملغاة",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "نقدي",
  bank_transfer: "تحويل بنكي",
  check: "شيك",
  other: "أخرى",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "مدير عام",
  sales: "منسق مبيعات",
  production: "منسق إنتاج",
  designer: "مصمم",
  technician: "فني",
  user: "مستخدم",
};

export const SUPPLIER_TYPE_LABELS: Record<string, string> = {
  paper_supplier: "مورد ورق",
  printer: "مطبعة",
  finishing_shop: "ورشة تشطيب",
  die_maker: "صانع قوالب",
  other: "أخرى",
};

export const CUSTOMER_SOURCE_LABELS: Record<string, string> = {
  direct: "مباشر",
  referral: "إحالة",
  social_media: "وسائل التواصل",
  website: "الموقع الإلكتروني",
  exhibition: "معرض",
  other: "أخرى",
};

export const INVENTORY_CATEGORY_LABELS: Record<string, string> = {
  carton: "كراتين شحن",
  paper: "ورق",
  ink: "أحبار",
  finishing_material: "مواد تشطيب",
  other: "أخرى",
};

export const CAMPAIGN_CHANNEL_LABELS: Record<string, string> = {
  instagram: "إنستغرام",
  tiktok: "تيك توك",
  linkedin: "لينكد إن",
  whatsapp: "واتساب",
  email: "بريد إلكتروني",
  direct: "مباشر",
  other: "أخرى",
};

// Kanban stage order for production tracking
export const KANBAN_STAGES = [
  "pricing",
  "design",
  "paper_purchase",
  "printing",
  "external_finishing",
  "internal_finishing",
  "quality_check",
  "ready_delivery",
] as const;

// Tax rate for Saudi Arabia
export const TAX_RATE = 15;

// Supported currencies
export const CURRENCIES = [
  { code: "YER", label: "ريال يمني", symbol: "ر.ي", flag: "🇾🇪" },
  { code: "SAR", label: "ريال سعودي", symbol: "ر.س", flag: "🇸🇦" },
  { code: "USD", label: "دولار أمريكي", symbol: "$", flag: "🇺🇸" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const CURRENCY_LABELS: Record<string, string> = {
  YER: "ر.ي",
  SAR: "ر.س",
  USD: "$",
};

export const CURRENCY_NAMES: Record<string, string> = {
  YER: "ريال يمني",
  SAR: "ريال سعودي",
  USD: "دولار أمريكي",
};

// Default exchange rates (approximate, can be updated in settings)
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  YER: 1,        // Base currency
  SAR: 66.5,     // 1 SAR = ~66.5 YER
  USD: 250,      // 1 USD = ~250 YER
};

// Format currency amount
export function formatCurrency(amount: number, currency: string = "YER"): string {
  const symbol = CURRENCY_LABELS[currency] || currency;
  const formatted = new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: currency === "YER" ? 0 : 2,
    maximumFractionDigits: currency === "YER" ? 0 : 2,
  }).format(amount);
  return `${formatted} ${symbol}`;
}

// Carton sizes for Al-Mesbahi
export const CARTON_SIZES = [
  "10x10x10",
  "15x15x15",
  "20x15x10",
  "20x20x15",
  "25x20x15",
  "25x25x20",
  "30x20x15",
  "30x25x20",
  "30x30x25",
  "35x25x20",
  "35x30x25",
  "40x30x20",
  "40x30x25",
  "50x35x25",
  "60x40x30",
];

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

export const QUALITY_RESULT_LABELS: Record<string, string> = {
  pass: "ناجح",
  fail: "فاشل",
  rework: "يحتاج إعادة",
};

export const QUALITY_RESULT_COLORS: Record<string, string> = {
  pass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  fail: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  rework: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  planned: "مخطط",
  active: "نشط",
  completed: "مكتمل",
  cancelled: "ملغي",
};
