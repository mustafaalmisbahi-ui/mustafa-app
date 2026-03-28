import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calculator, RotateCcw, BookOpen, Layers, Printer, Scissors, Share2, FileText, Download, User, Save, Archive, RefreshCw } from "lucide-react";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { PRODUCT_TYPE_LABELS, CURRENCIES, CURRENCY_LABELS, formatCurrency, MAGAZINE_LIKE_TYPES } from "@shared/constants";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { trpc } from "@/lib/trpc";
import { useLocation, useSearch } from "wouter";
import { COMPANY_LOGO_BASE64 } from "@/lib/companyLogo";

// معلومات الشركة
const COMPANY = {
  name: "المصباحي للطباعة والتغليف",
  logo: COMPANY_LOGO_BASE64,
  address: "صنعاء - شارع الزبيري - خلف عيادات مختبرات العولقي",
  phone1: "+967-771416296",
  phone2: "784000789",
};

// أنواع ورق الداخلي (للمجلات والكتب)
const INNER_PAPER_TYPES = [
  { name: "طباعي 60 جم", grammage: "60", category: "inner" },
  { name: "طباعي 70 جم", grammage: "70", category: "inner" },
  { name: "طباعي 80 جم", grammage: "80", category: "inner" },
  { name: "كوشيه 90 جم", grammage: "90", category: "inner" },
  { name: "كوشيه 115 جم", grammage: "115", category: "inner" },
  { name: "كوشيه 130 جم", grammage: "130", category: "inner" },
  { name: "كوشيه 150 جم", grammage: "150", category: "inner" },
  { name: "كوشيه 170 جم", grammage: "170", category: "inner" },
  { name: "كوشيه 200 جم", grammage: "200", category: "inner" },
  { name: "كوشيه 250 جم", grammage: "250", category: "inner" },
];

// أنواع ورق الغلاف
const COVER_PAPER_TYPES = [
  { name: "كوشيه 170 جم", grammage: "170", category: "cover" },
  { name: "كوشيه 200 جم", grammage: "200", category: "cover" },
  { name: "كوشيه 250 جم", grammage: "250", category: "cover" },
  { name: "كوشيه 300 جم", grammage: "300", category: "cover" },
  { name: "مل كوشيه 350 جم", grammage: "350", category: "cover" },
];

// أنواع ورق عامة (للمنتجات غير المجلات)
const GENERAL_PAPER_TYPES = [
  { name: "كوشيه 130 جم", grammage: "130", category: "general" },
  { name: "كوشيه 150 جم", grammage: "150", category: "general" },
  { name: "كوشيه 170 جم", grammage: "170", category: "general" },
  { name: "كوشيه 200 جم", grammage: "200", category: "general" },
  { name: "كوشيه 250 جم", grammage: "250", category: "general" },
  { name: "كوشيه 300 جم", grammage: "300", category: "general" },
  { name: "مل كوشيه 350 جم", grammage: "350", category: "general" },
  { name: "كرتون مقوى 300 جم", grammage: "300c", category: "general" },
  { name: "كرتون مقوى 350 جم", grammage: "350c", category: "general" },
  { name: "كرافت 120 جم", grammage: "120k", category: "general" },
  { name: "كرافت 150 جم", grammage: "150k", category: "general" },
  { name: "ستيكر لامع", grammage: "sticker", category: "general" },
  { name: "ستيكر شفاف", grammage: "sticker_clear", category: "general" },
];

// خيارات التشطيب - بسعر الوحدة
const FINISHING_PER_UNIT = [
  { name: "سلوفان لامع", defaultCost: 50, icon: "✨" },
  { name: "سلوفان مطفي", defaultCost: 60, icon: "✨" },
  { name: "يو في (UV)", defaultCost: 150, icon: "☀️" },
  { name: "يو في موضعي", defaultCost: 200, icon: "☀️" },
  { name: "تبريز (إمبوسينغ)", defaultCost: 200, icon: "💫" },
  { name: "طباعة فويل (ذهبي/فضي)", defaultCost: 250, icon: "⭐" },
  { name: "تكسير", defaultCost: 30, icon: "✂️" },
  { name: "تقطيع بالقالب (داي كت)", defaultCost: 100, icon: "✂️" },
];

// خيارات التشطيب - بسعر إجمالي
const FINISHING_FIXED = [
  { name: "تغرية (لصق)", defaultCost: 5000, icon: "🪣" },
  { name: "تجليد دبوس", defaultCost: 3000, icon: "📌" },
  { name: "تجليد سلك", defaultCost: 5000, icon: "🔗" },
  { name: "تجليد حراري", defaultCost: 8000, icon: "🔥" },
  { name: "تجميع الملازم (جمع الورق الداخلي)", defaultCost: 5000, icon: "📚" },
  { name: "حبل/شريط", defaultCost: 3000, icon: "🎀" },
];

const ALL_FINISHING = [
  ...FINISHING_PER_UNIT.map(f => ({ ...f, type: 'perUnit' as const })),
  ...FINISHING_FIXED.map(f => ({ ...f, type: 'fixed' as const })),
];

// أنظمة الطباعة
const PRINT_SYSTEMS = [
  { name: "فرخ كامل", pagesPerSignature: 32 },
  { name: "نص فرخ", pagesPerSignature: 16 },
  { name: "ربع فرخ", pagesPerSignature: 8 },
  { name: "ثمن فرخ", pagesPerSignature: 4 },
];

// مقاسات المجلات
const MAGAZINE_SIZES = [
  { name: "A4", label: "A4 (21×29.7 سم)" },
  { name: "A5", label: "A5 (14.8×21 سم)" },
  { name: "B5", label: "B5 (17.6×25 سم)" },
  { name: "A3", label: "A3 (29.7×42 سم)" },
  { name: "custom", label: "مخصص" },
];

interface PricingState {
  productType: string;
  quantity: number;
  currency: string;
  customerName: string;
  paperType: string;
  sheetPrice: number;
  takhreeja: number;
  magazineSize: string;
  customWidth: string;
  customHeight: string;
  innerPages: number;
  printSystem: string;
  pagesPerSignature: number;
  hasCover: boolean;
  coverPages: number;
  coverPaperType: string;
  coverSheetPrice: number;
  coverTakhreeja: number;
  coverClicheCount: number;
  coverClichePrice: number;
  coverPrintingCost: number;
  printingCostPerSignature: number;
  numberOfColors: number;
  clichePricePerPlate: number;
  clichesPerSignature: number;
  dieCost: number;
  designCost: number;
  selectedFinishing: string[];
  finishingPrices: Record<string, number>;
  customCosts: number;
  marginPercent: number;
}

const defaultState: PricingState = {
  productType: "magazine",
  quantity: 500,
  currency: "YER",
  customerName: "",
  paperType: "",
  sheetPrice: 0,
  takhreeja: 8,
  magazineSize: "A5",
  customWidth: "",
  customHeight: "",
  innerPages: 60,
  printSystem: "ربع فرخ",
  pagesPerSignature: 8,
  hasCover: true,
  coverPages: 4,
  coverPaperType: "",
  coverSheetPrice: 0,
  coverTakhreeja: 4,
  coverClicheCount: 4,
  coverClichePrice: 2000,
  coverPrintingCost: 5000,
  printingCostPerSignature: 5000,
  numberOfColors: 4,
  clichePricePerPlate: 2000,
  clichesPerSignature: 4,
  dieCost: 0,
  designCost: 0,
  selectedFinishing: [],
  finishingPrices: {},
  customCosts: 0,
  marginPercent: 30,
};

export default function Pricing() {
  const [state, setState] = useState<PricingState>(defaultState);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [invoiceAdjustment, setInvoiceAdjustment] = useState(0);
  const [invoiceAdjustmentNote, setInvoiceAdjustmentNote] = useState("");
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [loadedQuoteId, setLoadedQuoteId] = useState<number | null>(null);
  // عملة المشاركة (قد تختلف عن عملة التسعير)
  const [shareCurrency, setShareCurrency] = useState("YER");
  const [shareExchangeRate, setShareExchangeRate] = useState(1);
  const quoteRef = useRef<HTMLDivElement>(null);
  const currencySymbol = CURRENCY_LABELS[state.currency] || state.currency;
  const isMagazine = (MAGAZINE_LIKE_TYPES as readonly string[]).includes(state.productType);
  const paperTypes = isMagazine ? INNER_PAPER_TYPES : GENERAL_PAPER_TYPES;
  const [, navigate] = useLocation();
  const searchString = useSearch();

  // tRPC hooks
  const { data: customers } = trpc.customers.list.useQuery({});
  const { data: nextInvNum } = trpc.invoices.getNextNumber.useQuery();
  const { data: nextQuoteNum } = trpc.quotes.getNextNumber.useQuery();
  const { data: paperPricesData } = trpc.paperPrices.list.useQuery({ currency: state.currency });
  const { data: exchangeRatesData } = trpc.exchangeRates.list.useQuery();
  const utils = trpc.useUtils();

  // تحميل تسعيرة محفوظة من URL parameter
  const quoteIdParam = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get("quoteId");
  }, [searchString]);

  const { data: loadedQuoteData } = trpc.quotes.getById.useQuery(
    { id: Number(quoteIdParam) },
    { enabled: !!quoteIdParam && Number(quoteIdParam) !== loadedQuoteId }
  );

  // تحميل بيانات التسعيرة المحفوظة في الحاسبة
  useEffect(() => {
    if (loadedQuoteData && loadedQuoteData.pricingData && Number(quoteIdParam) !== loadedQuoteId) {
      const pd = loadedQuoteData.pricingData as any;
      const newState: PricingState = {
        productType: pd.productType || defaultState.productType,
        quantity: pd.quantity || defaultState.quantity,
        currency: pd.currency || loadedQuoteData.currency || defaultState.currency,
        customerName: pd.customerName || loadedQuoteData.customerName || defaultState.customerName,
        paperType: pd.paperType || defaultState.paperType,
        sheetPrice: pd.sheetPrice ?? defaultState.sheetPrice,
        takhreeja: pd.takhreeja ?? defaultState.takhreeja,
        magazineSize: pd.magazineSize || defaultState.magazineSize,
        customWidth: pd.customWidth || defaultState.customWidth,
        customHeight: pd.customHeight || defaultState.customHeight,
        innerPages: pd.innerPages ?? defaultState.innerPages,
        printSystem: pd.printSystem || defaultState.printSystem,
        pagesPerSignature: pd.pagesPerSignature ?? defaultState.pagesPerSignature,
        hasCover: pd.hasCover ?? defaultState.hasCover,
        coverPages: pd.coverPages ?? defaultState.coverPages,
        coverPaperType: pd.coverPaperType || defaultState.coverPaperType,
        coverSheetPrice: pd.coverSheetPrice ?? defaultState.coverSheetPrice,
        coverTakhreeja: pd.coverTakhreeja ?? defaultState.coverTakhreeja,
        coverClicheCount: pd.coverClicheCount ?? pd.numberOfColors ?? defaultState.coverClicheCount,
        coverClichePrice: pd.coverClichePrice ?? defaultState.coverClichePrice,
        coverPrintingCost: pd.coverPrintingCost ?? defaultState.coverPrintingCost,
        printingCostPerSignature: pd.printingCostPerSignature ?? defaultState.printingCostPerSignature,
        numberOfColors: pd.numberOfColors ?? defaultState.numberOfColors,
        clichePricePerPlate: pd.clichePricePerPlate ?? defaultState.clichePricePerPlate,
        clichesPerSignature: pd.clichesPerSignature ?? defaultState.clichesPerSignature,
        dieCost: pd.dieCost ?? defaultState.dieCost,
        designCost: pd.designCost ?? defaultState.designCost,
        selectedFinishing: pd.selectedFinishing || defaultState.selectedFinishing,
        finishingPrices: pd.finishingPrices || defaultState.finishingPrices,
        customCosts: pd.customCosts ?? defaultState.customCosts,
        marginPercent: pd.marginPercent ?? Number(loadedQuoteData.profitMargin) ?? defaultState.marginPercent,
      };
      setState(newState);
      setLoadedQuoteId(Number(quoteIdParam));
      toast.success(`تم تحميل التسعيرة ${loadedQuoteData.quoteNumber}`);
    }
  }, [loadedQuoteData, quoteIdParam, loadedQuoteId]);

  const createInvoice = trpc.invoices.create.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      setShowConvertDialog(false);
      setInvoiceAdjustment(0);
      setInvoiceAdjustmentNote("");
      toast.success("تم إنشاء الفاتورة بنجاح");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createQuote = trpc.quotes.create.useMutation({
    onSuccess: () => {
      utils.quotes.list.invalidate();
      utils.quotes.getNextNumber.invalidate();
      setIsSavingQuote(false);
      toast.success("تم حفظ التسعيرة بنجاح");
    },
    onError: (err: any) => {
      setIsSavingQuote(false);
      toast.error(err.message);
    },
  });

  const upsertPaperPrice = trpc.paperPrices.upsert.useMutation({
    onSuccess: () => {
      utils.paperPrices.list.invalidate();
    },
  });

  const upsertExchangeRate = trpc.exchangeRates.upsert.useMutation({
    onSuccess: () => {
      utils.exchangeRates.list.invalidate();
    },
  });

  // بناء خريطة أسعار الورق المحفوظة
  const savedPaperPricesMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (paperPricesData) {
      paperPricesData.forEach((p: any) => {
        const key = `${p.paperType}_${p.grammage}`;
        map[key] = Number(p.pricePerSheet);
      });
    }
    return map;
  }, [paperPricesData]);

  // بناء خريطة أسعار الصرف المحفوظة
  const savedExchangeRatesMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (exchangeRatesData) {
      exchangeRatesData.forEach((r: any) => {
        map[`${r.fromCurrency}_${r.toCurrency}`] = Number(r.rate);
      });
    }
    return map;
  }, [exchangeRatesData]);

  // حفظ سعر الورق تلقائياً عند تغييره
  const savePaperPriceDebounced = useCallback((paperType: string, grammage: string, price: number) => {
    if (price > 0 && paperType) {
      upsertPaperPrice.mutate({
        paperType,
        grammage,
        pricePerSheet: String(price),
        currency: state.currency,
      });
    }
  }, [state.currency, upsertPaperPrice]);

  // استرجاع سعر الورق المحفوظ عند اختيار نوع الورق
  const getStoredPrice = useCallback((paperName: string, grammage: string): number => {
    const key = `${paperName}_${grammage}`;
    return savedPaperPricesMap[key] || 0;
  }, [savedPaperPricesMap]);

  const calculation = useMemo(() => {
    let totalSheets = 0;
    let totalPages = 0;
    let coverSheets = 0;
    let signaturesCount = 0;
    let clicheCost = 0;
    let printingCost = 0;
    let coverClicheCost = 0;
    let coverPrintCost = 0;

    if (isMagazine) {
      totalPages = state.innerPages;
      signaturesCount = state.pagesPerSignature > 0 ? state.innerPages / state.pagesPerSignature : 0;
      const sheetsPerSignature = Math.ceil(state.quantity / Math.max(state.takhreeja, 1));
      totalSheets = Math.ceil(sheetsPerSignature * signaturesCount);
      clicheCost = state.clichePricePerPlate * state.clichesPerSignature * signaturesCount;
      printingCost = state.printingCostPerSignature * signaturesCount;
      if (state.hasCover) {
        coverSheets = Math.ceil(state.quantity / Math.max(state.coverTakhreeja, 1));
        coverClicheCost = state.coverClichePrice * state.coverClicheCount;
        coverPrintCost = state.coverPrintingCost;
      }
    } else {
      totalSheets = Math.ceil(state.quantity / Math.max(state.takhreeja, 1));
      clicheCost = state.clichePricePerPlate * state.numberOfColors;
      printingCost = state.printingCostPerSignature;
    }

    const paperCost = totalSheets * state.sheetPrice;
    const coverPaperCost = coverSheets * state.coverSheetPrice;
    const totalPaperCost = paperCost + coverPaperCost;
    const totalClicheCost = clicheCost + coverClicheCost;
    const totalPrintingCost = printingCost + coverPrintCost;
    const printingSheets = totalSheets + coverSheets;

    const finishingTotal = state.selectedFinishing.reduce((sum, name) => {
      const opt = ALL_FINISHING.find((o) => o.name === name);
      if (!opt) return sum;
      const price = state.finishingPrices[name] ?? opt.defaultCost;
      return opt.type === 'perUnit' ? sum + (price * state.quantity) : sum + price;
    }, 0);

    const fixedCosts = state.dieCost + state.designCost + state.customCosts;
    const totalCost = totalPaperCost + totalPrintingCost + totalClicheCost + fixedCosts + finishingTotal;
    const margin = totalCost * (state.marginPercent / 100);
    const total = totalCost + margin;
    const unitPrice = state.quantity > 0 ? total / state.quantity : 0;

    return {
      totalSheets, coverSheets, totalPages, signaturesCount, paperCost, coverPaperCost,
      totalPaperCost, clicheCost, coverClicheCost, totalClicheCost, printingCost,
      coverPrintCost, totalPrintingCost, printingSheets, finishingTotal, fixedCosts,
      totalCost, margin, total, unitPrice, profit: margin,
    };
  }, [state, isMagazine]);

  // حساب المبلغ بعملة المشاركة
  const shareTotal = useMemo(() => {
    if (shareCurrency === state.currency || shareExchangeRate <= 0) return calculation.total;
    return calculation.total / shareExchangeRate;
  }, [calculation.total, shareCurrency, shareExchangeRate, state.currency]);

  const shareUnitPrice = useMemo(() => {
    if (shareCurrency === state.currency || shareExchangeRate <= 0) return calculation.unitPrice;
    return calculation.unitPrice / shareExchangeRate;
  }, [calculation.unitPrice, shareCurrency, shareExchangeRate, state.currency]);

  const shareCurrencySymbol = CURRENCY_LABELS[shareCurrency] || shareCurrency;

  const toggleFinishing = (name: string) => {
    setState((p) => ({
      ...p,
      selectedFinishing: p.selectedFinishing.includes(name)
        ? p.selectedFinishing.filter((n) => n !== name)
        : [...p.selectedFinishing, name],
    }));
  };

  // تحويل العنصر إلى canvas بشكل موثوق
  const captureQuoteImage = async (): Promise<HTMLCanvasElement | null> => {
    if (!quoteRef.current) return null;
    try {
      const element = quoteRef.current;
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('[data-quote-ref]');
          if (clonedElement) {
            (clonedElement as HTMLElement).style.overflow = 'visible';
            (clonedElement as HTMLElement).style.height = 'auto';
          }
        },
      });
      return canvas;
    } catch (error) {
      console.error("html2canvas error:", error);
      return null;
    }
  };

  // حفظ كصورة
  const saveAsImage = async () => {
    toast.info("جاري تحضير الصورة...");
    const canvas = await captureQuoteImage();
    if (!canvas) {
      toast.error("حدث خطأ أثناء تحضير الصورة");
      return;
    }
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          const link = document.createElement("a");
          link.download = `تسعيرة-${state.customerName || "عميل"}-${new Date().toLocaleDateString("ar-SA")}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
          toast.success("تم حفظ الصورة بنجاح");
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `تسعيرة-${state.customerName || "عميل"}-${new Date().toLocaleDateString("ar-SA")}.png`;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success("تم حفظ الصورة بنجاح");
      }, "image/png");
    } catch {
      toast.error("حدث خطأ أثناء حفظ الصورة");
    }
  };

  // مشاركة عبر واتساب كصورة
  const shareWhatsApp = async () => {
    toast.info("جاري تحضير الصورة للمشاركة...");
    const canvas = await captureQuoteImage();
    if (!canvas) {
      shareWhatsAppText();
      return;
    }
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], `تسعيرة-${state.customerName || "عميل"}.png`, { type: "image/png" });
        const shareData = { files: [file] };
        if (navigator.canShare(shareData)) {
          await navigator.share({
            files: [file],
            title: `عرض سعر - ${COMPANY.name}`,
            text: `عرض سعر من ${COMPANY.name}`,
          });
          toast.success("تم المشاركة بنجاح");
          return;
        }
      }
      shareWhatsAppText();
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      shareWhatsAppText();
    }
  };

  // مشاركة واتساب كنص (fallback)
  const shareWhatsAppText = () => {
    const productLabel = PRODUCT_TYPE_LABELS[state.productType] || state.productType;
    const sizeInfo = isMagazine
      ? state.magazineSize === "custom"
        ? `${state.customWidth}×${state.customHeight} سم`
        : state.magazineSize
      : "";
    const displayCurrency = shareCurrency;
    const displayTotal = shareTotal;
    const displayUnit = shareUnitPrice;
    const displaySymbol = shareCurrencySymbol;

    let text = `*${COMPANY.name}*\n`;
    text += `${COMPANY.address}\n`;
    text += `هاتف: ${COMPANY.phone1} | ${COMPANY.phone2}\n`;
    text += `━━━━━━━━━━━━━━━\n`;
    text += `*عرض سعر*\n`;
    if (state.customerName) text += `العميل: ${state.customerName}\n`;
    text += `التاريخ: ${new Date().toLocaleDateString("ar-SA")}\n`;
    text += `━━━━━━━━━━━━━━━\n`;
    text += `المنتج: ${productLabel}\n`;
    text += `الكمية: ${state.quantity.toLocaleString("ar-SA")} نسخة\n`;
    if (sizeInfo) text += `المقاس: ${sizeInfo}\n`;
    if (state.paperType) text += `نوع الورق: ${state.paperType}\n`;
    if (isMagazine) {
      text += `الصفحات: ${state.innerPages + state.coverPages} (${state.innerPages} داخلي + ${state.coverPages} غلاف)\n`;
      text += `عدد الملازم: ${calculation.signaturesCount.toFixed(1)}\n`;
    }
    if (state.selectedFinishing.length > 0) {
      text += `التشطيب: ${state.selectedFinishing.join("، ")}\n`;
    }
    text += `━━━━━━━━━━━━━━━\n`;
    text += `*الإجمالي: ${formatCurrency(displayTotal, displayCurrency)}*\n`;
    text += `سعر النسخة: ${formatCurrency(displayUnit, displayCurrency)}\n`;
    text += `━━━━━━━━━━━━━━━\n`;
    text += `_${COMPANY.name}_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // حفظ التسعيرة في قاعدة البيانات
  const handleSaveQuote = () => {
    if (calculation.total <= 0) {
      toast.error("لا يمكن حفظ تسعيرة بقيمة صفر");
      return;
    }
    setIsSavingQuote(true);
    createQuote.mutate({
      quoteNumber: nextQuoteNum || "QT-0001",
      customerName: state.customerName || undefined,
      customerId: customers?.find((c: any) => c.name === state.customerName)?.id,
      productType: state.productType,
      currency: state.currency as "YER" | "SAR" | "USD",
      totalCost: String(Math.round(calculation.totalCost)),
      totalPrice: String(Math.round(calculation.total)),
      unitPrice: String(calculation.unitPrice.toFixed(2)),
      profitMargin: String(state.marginPercent),
      quantity: state.quantity,
      pricingData: {
        ...state,
        calculation: {
          totalSheets: calculation.totalSheets,
          coverSheets: calculation.coverSheets,
          signaturesCount: calculation.signaturesCount,
          paperCost: calculation.paperCost,
          coverPaperCost: calculation.coverPaperCost,
          totalPaperCost: calculation.totalPaperCost,
          totalClicheCost: calculation.totalClicheCost,
          totalPrintingCost: calculation.totalPrintingCost,
          finishingTotal: calculation.finishingTotal,
          fixedCosts: calculation.fixedCosts,
          totalCost: calculation.totalCost,
          margin: calculation.margin,
          total: calculation.total,
          unitPrice: calculation.unitPrice,
        },
      },
    });
  };

  // تحويل لفاتورة مع إمكانية التعديل
  const handleConvertToInvoice = () => {
    const customer = customers?.find((c: any) => c.name === state.customerName);
    if (!customer) {
      toast.error("يرجى اختيار عميل مسجل في النظام أو إضافته أولاً");
      return;
    }
    const adjustedTotal = Math.round(calculation.total) + invoiceAdjustment;
    if (adjustedTotal <= 0) {
      toast.error("لا يمكن إنشاء فاتورة بقيمة صفر أو أقل");
      return;
    }
    createInvoice.mutate({
      invoiceNumber: nextInvNum || "INV-0001",
      customerId: customer.id,
      currency: state.currency as "YER" | "SAR" | "USD",
      subtotal: String(Math.round(calculation.totalCost)),
      taxAmount: "0",
      total: String(adjustedTotal),
      notes: `تسعيرة محولة - ${PRODUCT_TYPE_LABELS[state.productType] || state.productType} - ${state.quantity} نسخة${invoiceAdjustmentNote ? ` | ${invoiceAdjustmentNote}` : ""}${invoiceAdjustment !== 0 ? ` | تعديل: ${invoiceAdjustment > 0 ? "+" : ""}${invoiceAdjustment}` : ""}`,
    });
  };

  // عند فتح نافذة المشاركة، تعيين عملة المشاركة وسعر الصرف
  const openShareDialog = () => {
    setShareCurrency(state.currency);
    setShareExchangeRate(1);
    setShowShareDialog(true);
  };

  // عند تغيير عملة المشاركة، جلب سعر الصرف المحفوظ
  const handleShareCurrencyChange = (newCurrency: string) => {
    setShareCurrency(newCurrency);
    if (newCurrency === state.currency) {
      setShareExchangeRate(1);
    } else {
      const key = `${state.currency}_${newCurrency}`;
      const savedRate = savedExchangeRatesMap[key];
      if (savedRate) {
        setShareExchangeRate(savedRate);
      } else {
        setShareExchangeRate(1);
      }
    }
  };

  // حفظ سعر الصرف تلقائياً
  const saveExchangeRate = () => {
    if (shareCurrency !== state.currency && shareExchangeRate > 0) {
      upsertExchangeRate.mutate({
        fromCurrency: state.currency,
        toCurrency: shareCurrency,
        rate: String(shareExchangeRate),
      });
      toast.success("تم حفظ سعر الصرف");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold font-heading">حاسبة التسعير</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            حساب تكلفة وسعر المنتجات بناءً على سعر الفرخ والتخريجة
            {loadedQuoteId && <Badge variant="outline" className="mr-2 text-xs">تسعيرة محملة</Badge>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate("/quotes")} className="gap-1.5">
            <Archive className="w-4 h-4" />
            <span className="hidden sm:inline">التسعيرات المحفوظة</span>
          </Button>
          <Button variant="outline" size="sm" onClick={openShareDialog} className="gap-1.5">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">مشاركة</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setState(defaultState); setLoadedQuoteId(null); navigate("/pricing"); }} className="gap-1.5">
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">إعادة تعيين</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Printer className="w-4 h-4 text-primary" />
                المعلومات الأساسية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="flex items-center gap-1"><User className="w-3 h-3" /> اسم العميل</Label>
                  <Input
                    className="mt-1"
                    placeholder="أدخل اسم العميل"
                    value={state.customerName}
                    onChange={(e) => setState((p) => ({ ...p, customerName: e.target.value }))}
                    list="customer-list"
                  />
                  <datalist id="customer-list">
                    {customers?.map((c: any) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label>نوع المنتج</Label>
                  <Select value={state.productType} onValueChange={(v) => setState((p) => ({ ...p, productType: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRODUCT_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label>الكمية (نسخة)</Label>
                  <Input type="number" className="mt-1" value={state.quantity} onChange={(e) => setState((p) => ({ ...p, quantity: Number(e.target.value) }))} min={1} />
                </div>
                <div>
                  <Label>عملة التسعير</Label>
                  <Select value={state.currency} onValueChange={(v) => setState((p) => ({ ...p, currency: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.flag} {c.label} ({c.symbol})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الملازم - للمجلات والكتب والكتيبات والبروفايل */}
          {isMagazine && (
            <Card className="border-blue-200 dark:border-blue-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  الملازم ({PRODUCT_TYPE_LABELS[state.productType] || "مجلة"})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3">
                  <div>
                    <Label>المقاس</Label>
                    <Select value={state.magazineSize} onValueChange={(v) => setState((p) => ({ ...p, magazineSize: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MAGAZINE_SIZES.map((s) => (
                          <SelectItem key={s.name} value={s.name}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {state.magazineSize === "custom" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>العرض (سم)</Label>
                        <Input className="mt-1" placeholder="مثال: 17" value={state.customWidth} onChange={(e) => setState((p) => ({ ...p, customWidth: e.target.value }))} />
                      </div>
                      <div>
                        <Label>الطول (سم)</Label>
                        <Input className="mt-1" placeholder="مثال: 24" value={state.customHeight} onChange={(e) => setState((p) => ({ ...p, customHeight: e.target.value }))} />
                      </div>
                    </div>
                  )}
                  <div>
                    <Label>عدد صفحات الداخلي</Label>
                    <Input type="number" className="mt-1" value={state.innerPages} onChange={(e) => setState((p) => ({ ...p, innerPages: Number(e.target.value) }))} min={1} />
                    <p className="text-[10px] text-muted-foreground mt-1">بدون الغلاف</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <Label>نظام الطباعة</Label>
                    <Select value={state.printSystem} onValueChange={(v) => {
                      const sys = PRINT_SYSTEMS.find((s) => s.name === v);
                      setState((p) => ({ ...p, printSystem: v, pagesPerSignature: sys?.pagesPerSignature || 8 }));
                    }}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRINT_SYSTEMS.map((s) => (
                          <SelectItem key={s.name} value={s.name}>{s.name} ({s.pagesPerSignature} صفحة/ملزمة)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>عدد صفحات الغلاف</Label>
                    <Input type="number" className="mt-1" value={state.coverPages} onChange={(e) => setState((p) => ({ ...p, coverPages: Number(e.target.value) }))} min={0} />
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    عدد الملازم: <span className="text-lg font-bold">{calculation.signaturesCount.toFixed(1)}</span> ملزمة
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {state.innerPages} صفحة ÷ {state.pagesPerSignature} صفحة/ملزمة ({state.printSystem}) = {calculation.signaturesCount.toFixed(1)} ملزمة
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    إجمالي الصفحات: {state.innerPages + state.coverPages} صفحة ({state.innerPages} داخلي + {state.coverPages} غلاف)
                  </p>
                </div>

                {/* ورق الغلاف */}
                <div className="border-t pt-3">
                  <div className="flex items-center gap-2 mb-3">
                    <input type="checkbox" checked={state.hasCover} onChange={(e) => setState((p) => ({ ...p, hasCover: e.target.checked }))} className="rounded border-border" id="hasCover" />
                    <Label htmlFor="hasCover" className="cursor-pointer">غلاف منفصل (ورق مختلف)</Label>
                  </div>
                  {state.hasCover && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <Label>نوع ورق الغلاف</Label>
                        <Select value={state.coverPaperType} onValueChange={(v) => {
                          const paper = COVER_PAPER_TYPES.find((p) => p.name === v);
                          const storedPrice = paper ? getStoredPrice(v, paper.grammage) : 0;
                          setState((p) => ({ ...p, coverPaperType: v, coverSheetPrice: storedPrice || p.coverSheetPrice }));
                        }}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="اختر نوع ورق الغلاف" /></SelectTrigger>
                          <SelectContent>
                            {COVER_PAPER_TYPES.map((p) => {
                              const stored = getStoredPrice(p.name, p.grammage);
                              return (
                                <SelectItem key={p.name} value={p.name}>
                                  {p.name} {stored > 0 && <span className="text-emerald-600 text-xs">({formatCurrency(stored, state.currency)})</span>}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>سعر فرخ الغلاف ({currencySymbol})</Label>
                        <Input type="number" className="mt-1" value={state.coverSheetPrice} onChange={(e) => {
                          const price = Number(e.target.value);
                          setState((p) => ({ ...p, coverSheetPrice: price }));
                        }}
                        onBlur={() => {
                          if (state.coverPaperType && state.coverSheetPrice > 0) {
                            const paper = COVER_PAPER_TYPES.find(p => p.name === state.coverPaperType);
                            if (paper) savePaperPriceDebounced(state.coverPaperType, paper.grammage, state.coverSheetPrice);
                          }
                        }} />
                        {state.coverPaperType && getStoredPrice(state.coverPaperType, COVER_PAPER_TYPES.find(p => p.name === state.coverPaperType)?.grammage || "") > 0 && (
                          <p className="text-[10px] text-emerald-600 mt-1">سعر محفوظ تلقائياً</p>
                        )}
                      </div>
                      <div>
                        <Label>تخريجة الغلاف (قطعة/فرخ)</Label>
                        <Input type="number" className="mt-1" value={state.coverTakhreeja} onChange={(e) => setState((p) => ({ ...p, coverTakhreeja: Number(e.target.value) }))} min={1} />
                        <p className="text-[10px] text-muted-foreground mt-1">أفرخ الغلاف: {calculation.coverSheets} فرخ</p>
                      </div>
                      <div>
                        <Label>عدد كليشات الغلاف</Label>
                        <Input type="number" className="mt-1" value={state.coverClicheCount} onChange={(e) => setState((p) => ({ ...p, coverClicheCount: Number(e.target.value) }))} min={1} />
                        <p className="text-[10px] text-muted-foreground mt-1">{state.coverClicheCount} كليشة × {formatCurrency(state.coverClichePrice, state.currency)} = {formatCurrency(calculation.coverClicheCost, state.currency)}</p>
                      </div>
                      <div>
                        <Label>سعر كليشة الغلاف ({currencySymbol})</Label>
                        <Input type="number" className="mt-1" value={state.coverClichePrice} onChange={(e) => setState((p) => ({ ...p, coverClichePrice: Number(e.target.value) }))} />
                      </div>
                      <div>
                        <Label>تكلفة طباعة الغلاف ({currencySymbol})</Label>
                        <Input type="number" className="mt-1" value={state.coverPrintingCost} onChange={(e) => setState((p) => ({ ...p, coverPrintingCost: Number(e.target.value) }))} />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* الفرخ والتخريجة */}
          <Card className="border-emerald-200 dark:border-emerald-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                {isMagazine ? "ورق الداخل (الملازم)" : "الورق والفرخ"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label>نوع الورق</Label>
                  <Select
                    value={state.paperType}
                    onValueChange={(v) => {
                      const paper = paperTypes.find((p) => p.name === v);
                      const storedPrice = paper ? getStoredPrice(v, paper.grammage) : 0;
                      setState((p) => ({ ...p, paperType: v, sheetPrice: storedPrice || p.sheetPrice }));
                    }}
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder="اختر نوع الورق" /></SelectTrigger>
                    <SelectContent>
                      {paperTypes.map((p) => {
                        const stored = getStoredPrice(p.name, p.grammage);
                        return (
                          <SelectItem key={p.name} value={p.name}>
                            {p.name} {stored > 0 && <span className="text-emerald-600 text-xs">({formatCurrency(stored, state.currency)})</span>}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>سعر الفرخ ({currencySymbol})</Label>
                  <Input type="number" className="mt-1" value={state.sheetPrice} onChange={(e) => {
                    const price = Number(e.target.value);
                    setState((p) => ({ ...p, sheetPrice: price }));
                  }}
                  onBlur={() => {
                    if (state.paperType && state.sheetPrice > 0) {
                      const paper = paperTypes.find(p => p.name === state.paperType);
                      if (paper) savePaperPriceDebounced(state.paperType, paper.grammage, state.sheetPrice);
                    }
                  }} />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    سعر الفرخ الواحد من الورق
                    {state.paperType && getStoredPrice(state.paperType, paperTypes.find(p => p.name === state.paperType)?.grammage || "") > 0 && (
                      <span className="text-emerald-600 mr-1"> (محفوظ تلقائياً)</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label>التخريجة (عدد القطع من الفرخ)</Label>
                  <Input type="number" className="mt-1" value={state.takhreeja} onChange={(e) => setState((p) => ({ ...p, takhreeja: Number(e.target.value) }))} min={1} />
                  <p className="text-[10px] text-muted-foreground mt-1">كم قطعة تطلع من الفرخ الواحد</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 flex flex-col justify-center">
                  <p className="text-xs text-muted-foreground">عدد الأفرخ المطلوبة</p>
                  <p className="text-2xl font-bold text-emerald-600">{calculation.totalSheets.toLocaleString("ar-SA")}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isMagazine
                      ? `${state.quantity} نسخة ÷ ${state.takhreeja} تخريجة × ${calculation.signaturesCount.toFixed(1)} ملزمة`
                      : `${state.quantity} نسخة ÷ ${state.takhreeja} تخريجة`
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الطباعة */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Printer className="w-4 h-4 text-violet-600" />
                تكلفة الطباعة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label>{isMagazine ? "تكلفة طباعة الملزمة الواحدة" : "تكلفة الطباعة"} ({currencySymbol})</Label>
                  <Input type="number" className="mt-1" value={state.printingCostPerSignature} onChange={(e) => setState((p) => ({ ...p, printingCostPerSignature: Number(e.target.value) }))} />
                  {isMagazine && <p className="text-[10px] text-muted-foreground mt-1">لكل ملزمة × {calculation.signaturesCount.toFixed(1)} ملزمة = {formatCurrency(calculation.printingCost, state.currency)}</p>}
                </div>
                <div>
                  <Label>عدد الألوان</Label>
                  <Select value={String(state.numberOfColors)} onValueChange={(v) => setState((p) => ({ ...p, numberOfColors: Number(v) }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">لون واحد</SelectItem>
                      <SelectItem value="2">لونين</SelectItem>
                      <SelectItem value="4">4 ألوان (فل كلر)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* التكاليف الثابتة */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">التكاليف الثابتة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <Label>سعر الكليشة ({currencySymbol})</Label>
                  <Input type="number" className="mt-1" value={state.clichePricePerPlate} onChange={(e) => setState((p) => ({ ...p, clichePricePerPlate: Number(e.target.value) }))} />
                  {isMagazine && <p className="text-[10px] text-muted-foreground mt-1">× {state.clichesPerSignature} كليشة/ملزمة × {calculation.signaturesCount.toFixed(1)} ملزمة = {formatCurrency(calculation.clicheCost, state.currency)}</p>}
                  {!isMagazine && <p className="text-[10px] text-muted-foreground mt-1">× {state.numberOfColors} ألوان = {formatCurrency(calculation.clicheCost, state.currency)}</p>}
                </div>
                {isMagazine && (
                  <div>
                    <Label>كليشات/ملزمة</Label>
                    <Input type="number" className="mt-1" value={state.clichesPerSignature} onChange={(e) => setState((p) => ({ ...p, clichesPerSignature: Number(e.target.value) }))} min={1} />
                  </div>
                )}
                <div>
                  <Label>القالب ({currencySymbol})</Label>
                  <Input type="number" className="mt-1" value={state.dieCost} onChange={(e) => setState((p) => ({ ...p, dieCost: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>التصميم ({currencySymbol})</Label>
                  <Input type="number" className="mt-1" value={state.designCost} onChange={(e) => setState((p) => ({ ...p, designCost: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>أخرى ({currencySymbol})</Label>
                  <Input type="number" className="mt-1" value={state.customCosts} onChange={(e) => setState((p) => ({ ...p, customCosts: Number(e.target.value) }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* التشطيب */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Scissors className="w-4 h-4 text-amber-600" />
                خيارات التشطيب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2 text-muted-foreground">تشطيب خارجي (سعر × الكمية)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FINISHING_PER_UNIT.map((opt) => {
                    const isSelected = state.selectedFinishing.includes(opt.name);
                    const price = state.finishingPrices[opt.name] ?? opt.defaultCost;
                    return (
                      <div key={opt.name} className={`border rounded-lg p-2 cursor-pointer transition-all ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:border-muted-foreground/30"}`} onClick={() => toggleFinishing(opt.name)}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{opt.icon}</span>
                          <span className="text-xs font-medium">{opt.name}</span>
                        </div>
                        {isSelected && (
                          <Input type="number" className="mt-1.5 h-7 text-xs" value={price} onClick={(e) => e.stopPropagation()} onChange={(e) => setState((p) => ({ ...p, finishingPrices: { ...p.finishingPrices, [opt.name]: Number(e.target.value) } }))} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2 text-muted-foreground">تشطيب داخلي (سعر إجمالي)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FINISHING_FIXED.map((opt) => {
                    const isSelected = state.selectedFinishing.includes(opt.name);
                    const price = state.finishingPrices[opt.name] ?? opt.defaultCost;
                    return (
                      <div key={opt.name} className={`border rounded-lg p-2 cursor-pointer transition-all ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:border-muted-foreground/30"}`} onClick={() => toggleFinishing(opt.name)}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{opt.icon}</span>
                          <span className="text-xs font-medium">{opt.name}</span>
                        </div>
                        {isSelected && (
                          <Input type="number" className="mt-1.5 h-7 text-xs" value={price} onClick={(e) => e.stopPropagation()} onChange={(e) => setState((p) => ({ ...p, finishingPrices: { ...p.finishingPrices, [opt.name]: Number(e.target.value) } }))} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* هامش الربح */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">هامش الربح</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Label className="shrink-0">نسبة الربح (%)</Label>
                  <Input type="number" className="w-24 sm:w-32" value={state.marginPercent} onChange={(e) => setState((p) => ({ ...p, marginPercent: Number(e.target.value) }))} min={0} max={100} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[15, 20, 25, 30, 40, 50].map((v) => (
                    <Button key={v} variant={state.marginPercent === v ? "default" : "outline"} size="sm" onClick={() => setState((p) => ({ ...p, marginPercent: v }))}>
                      {v}%
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Sidebar */}
        <div className="space-y-4">
          <Card className="sticky top-4 border-primary/20 lg:mt-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base font-heading">ملخص التسعير</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs">{CURRENCIES.find(c => c.code === state.currency)?.flag} {currencySymbol}</Badge>
              </div>
              {state.customerName && (
                <p className="text-sm text-muted-foreground mt-1">العميل: <span className="font-medium text-foreground">{state.customerName}</span></p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* تفاصيل الأفرخ */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground mb-2">تفاصيل الأفرخ</p>
                <div className="flex justify-between text-xs">
                  <span>أفرخ {isMagazine ? "الداخل" : "الورق"}</span>
                  <span className="font-medium">{calculation.totalSheets.toLocaleString("ar-SA")} فرخ</span>
                </div>
                {isMagazine && state.hasCover && (
                  <div className="flex justify-between text-xs">
                    <span>أفرخ الغلاف</span>
                    <span className="font-medium">{calculation.coverSheets.toLocaleString("ar-SA")} فرخ</span>
                  </div>
                )}
                <div className="flex justify-between text-xs border-t pt-1.5">
                  <span className="font-medium">إجمالي أفرخ الطباعة</span>
                  <span className="font-bold">{calculation.printingSheets.toLocaleString("ar-SA")} فرخ</span>
                </div>
              </div>

              {/* تفاصيل التكاليف */}
              <div className="space-y-2">
                <PriceRow label={isMagazine ? "ورق الداخل" : "تكلفة الورق"} value={calculation.paperCost} currency={state.currency} />
                {isMagazine && state.hasCover && <PriceRow label="ورق الغلاف" value={calculation.coverPaperCost} currency={state.currency} />}
                <PriceRow label={isMagazine ? `طباعة الداخل (${calculation.signaturesCount.toFixed(1)} ملزمة)` : "الطباعة"} value={calculation.printingCost} currency={state.currency} />
                {isMagazine && state.hasCover && <PriceRow label="طباعة الغلاف" value={calculation.coverPrintCost} currency={state.currency} />}
                <PriceRow label={isMagazine ? `كليشات الداخل (${calculation.signaturesCount.toFixed(1)} ملزمة)` : "الكليشات"} value={calculation.clicheCost} currency={state.currency} />
                {isMagazine && state.hasCover && <PriceRow label={`كليشات الغلاف (${state.coverClicheCount})`} value={calculation.coverClicheCost} currency={state.currency} />}
                {state.dieCost > 0 && <PriceRow label="القالب" value={state.dieCost} currency={state.currency} />}
                {state.designCost > 0 && <PriceRow label="التصميم" value={state.designCost} currency={state.currency} />}
                <PriceRow label="التشطيب" value={calculation.finishingTotal} currency={state.currency} />
                {state.customCosts > 0 && <PriceRow label="تكاليف أخرى" value={state.customCosts} currency={state.currency} />}
                <div className="border-t pt-2">
                  <PriceRow label="إجمالي التكلفة" value={calculation.totalCost} bold currency={state.currency} />
                </div>
                <PriceRow label={`هامش الربح (${state.marginPercent}%)`} value={calculation.margin} color="text-emerald-600" currency={state.currency} />
                <div className="border-t pt-2 bg-primary/5 -mx-4 px-4 py-3 rounded-lg">
                  <PriceRow label="الإجمالي" value={calculation.total} bold large currency={state.currency} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">سعر النسخة</p>
                    <p className="text-lg font-bold text-primary">{calculation.unitPrice.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{currencySymbol}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">صافي الربح</p>
                    <p className="text-lg font-bold text-emerald-600">{calculation.profit.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{currencySymbol}</p>
                  </CardContent>
                </Card>
              </div>

              {/* أزرار الإجراءات */}
              <div className="space-y-2 pt-2 border-t">
                <Button className="w-full gap-2" variant="default" onClick={handleSaveQuote} disabled={isSavingQuote || calculation.total <= 0}>
                  <Save className="w-4 h-4" />
                  {isSavingQuote ? "جاري الحفظ..." : "حفظ التسعيرة"}
                </Button>
                <Button className="w-full gap-2" variant="outline" onClick={openShareDialog}>
                  <Share2 className="w-4 h-4" /> مشاركة / حفظ صورة
                </Button>
                <Button variant="outline" className="w-full gap-2" onClick={() => { setInvoiceAdjustment(0); setInvoiceAdjustmentNote(""); setShowConvertDialog(true); }}>
                  <FileText className="w-4 h-4" /> تحويل إلى فاتورة
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===== نافذة المشاركة / حفظ صورة ===== */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>مشاركة التسعيرة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* اختيار عملة المشاركة وسعر الصرف */}
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 space-y-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">عملة الإرسال</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">العملة</Label>
                  <Select value={shareCurrency} onValueChange={handleShareCurrencyChange}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.flag} {c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {shareCurrency !== state.currency && (
                  <div>
                    <Label className="text-xs">سعر الصرف (1 {shareCurrencySymbol} = ؟ {currencySymbol})</Label>
                    <div className="flex gap-1 mt-1">
                      <Input type="number" className="h-9" value={shareExchangeRate} onChange={(e) => setShareExchangeRate(Number(e.target.value))} min={0.01} step="0.01" />
                      <Button size="sm" variant="outline" className="h-9 px-2" onClick={saveExchangeRate} title="حفظ سعر الصرف">
                        <Save className="w-3 h-3" />
                      </Button>
                    </div>
                    {savedExchangeRatesMap[`${state.currency}_${shareCurrency}`] && (
                      <p className="text-[10px] text-emerald-600 mt-1">سعر محفوظ: {savedExchangeRatesMap[`${state.currency}_${shareCurrency}`]}</p>
                    )}
                  </div>
                )}
              </div>
              {shareCurrency !== state.currency && shareExchangeRate > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded p-2 text-center">
                  <p className="text-xs text-muted-foreground">الإجمالي بالعملة المختارة</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(shareTotal, shareCurrency)}</p>
                  <p className="text-xs text-muted-foreground">سعر النسخة: {formatCurrency(shareUnitPrice, shareCurrency)}</p>
                </div>
              )}
            </div>

            {/* معاينة التسعيرة */}
            <div ref={quoteRef} data-quote-ref className="bg-white text-black p-6 rounded-lg border" dir="rtl" style={{ fontFamily: "Tajawal, sans-serif" }}>
              {/* الراسية */}
              <div className="flex items-center justify-between border-b-2 border-teal-600 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <img src={COMPANY.logo} alt={COMPANY.name} className="w-16 h-16 rounded-lg object-cover" crossOrigin="anonymous" />
                  <div>
                    <h2 className="text-lg font-bold text-teal-800">{COMPANY.name}</h2>
                    <p className="text-xs text-gray-600">{COMPANY.address}</p>
                    <p className="text-xs text-gray-600">هاتف: {COMPANY.phone1} | {COMPANY.phone2}</p>
                  </div>
                </div>
              </div>

              {/* عنوان التسعيرة */}
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-teal-700">عرض سعر</h3>
                <p className="text-sm text-gray-500">التاريخ: {new Date().toLocaleDateString("ar-SA")}</p>
              </div>

              {/* معلومات العميل والمنتج */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                {state.customerName && (
                  <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">العميل:</span> <span className="font-medium">{state.customerName}</span></div>
                )}
                <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">المنتج:</span> <span className="font-medium">{PRODUCT_TYPE_LABELS[state.productType] || state.productType}</span></div>
                <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">الكمية:</span> <span className="font-medium">{state.quantity.toLocaleString("ar-SA")} نسخة</span></div>
                {isMagazine && (
                  <>
                    <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">المقاس:</span> <span className="font-medium">{state.magazineSize === "custom" ? `${state.customWidth}×${state.customHeight} سم` : state.magazineSize}</span></div>
                    <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">الصفحات:</span> <span className="font-medium">{state.innerPages + state.coverPages}</span></div>
                  </>
                )}
                {state.paperType && (
                  <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500">نوع الورق:</span> <span className="font-medium">{state.paperType}</span></div>
                )}
              </div>

              {/* التشطيب */}
              {state.selectedFinishing.length > 0 && (
                <div className="mb-4 text-sm">
                  <span className="text-gray-500">التشطيب:</span> <span className="font-medium">{state.selectedFinishing.join("، ")}</span>
                </div>
              )}

              {/* الأسعار */}
              <div className="border-t border-b py-3 mb-4 space-y-1">
                <div className="flex justify-between text-sm"><span>إجمالي التكلفة</span><span className="font-medium">{formatCurrency(shareTotal, shareCurrency)}</span></div>
                <div className="flex justify-between text-sm"><span>سعر النسخة الواحدة</span><span className="font-medium">{formatCurrency(shareUnitPrice, shareCurrency)}</span></div>
              </div>

              {/* التذييل */}
              <div className="text-center text-xs text-gray-400">
                <p>{COMPANY.name} - {COMPANY.address}</p>
                <p>هاتف: {COMPANY.phone1} | {COMPANY.phone2}</p>
              </div>
            </div>

            {/* أزرار المشاركة */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button onClick={saveAsImage} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Download className="w-4 h-4" /> حفظ صورة
              </Button>
              <Button onClick={shareWhatsApp} className="gap-2 bg-green-600 hover:bg-green-700">
                <Share2 className="w-4 h-4" /> واتساب
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => {
                const productLabel = PRODUCT_TYPE_LABELS[state.productType] || state.productType;
                const text = `عرض سعر - ${COMPANY.name}\nالعميل: ${state.customerName || "-"}\nالمنتج: ${productLabel}\nالكمية: ${state.quantity}\nالإجمالي: ${formatCurrency(shareTotal, shareCurrency)}\nسعر النسخة: ${formatCurrency(shareUnitPrice, shareCurrency)}`;
                navigator.clipboard.writeText(text);
                toast.success("تم نسخ التسعيرة");
              }}>
                <FileText className="w-4 h-4" /> نسخ النص
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== نافذة تحويل إلى فاتورة ===== */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تحويل التسعيرة إلى فاتورة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">رقم الفاتورة</span>
                <span className="font-medium">{nextInvNum || "INV-0001"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">العميل</span>
                <span className="font-medium">{state.customerName || "غير محدد"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">المنتج</span>
                <span className="font-medium">{PRODUCT_TYPE_LABELS[state.productType] || state.productType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">الكمية</span>
                <span className="font-medium">{state.quantity.toLocaleString("ar-SA")} نسخة</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">إجمالي التسعيرة</span>
                <span className="font-medium">{formatCurrency(calculation.total, state.currency)}</span>
              </div>
            </div>

            {/* حقل التعديل على المبلغ */}
            <div className="space-y-3 border rounded-lg p-4">
              <Label className="text-sm font-medium">تعديل على المبلغ (خصم أو زيادة)</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="مثال: -5000 للخصم أو 3000 للزيادة"
                    value={invoiceAdjustment || ""}
                    onChange={(e) => setInvoiceAdjustment(Number(e.target.value))}
                  />
                </div>
                <span className="flex items-center text-sm text-muted-foreground">{currencySymbol}</span>
              </div>
              <Input
                placeholder="سبب التعديل (اختياري)"
                value={invoiceAdjustmentNote}
                onChange={(e) => setInvoiceAdjustmentNote(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {[-10000, -5000, -2000, 2000, 5000, 10000].map((v) => (
                  <Button key={v} variant="outline" size="sm" className="text-xs" onClick={() => setInvoiceAdjustment(v)}>
                    {v > 0 ? "+" : ""}{v.toLocaleString("ar-SA")}
                  </Button>
                ))}
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setInvoiceAdjustment(0)}>
                  بدون تعديل
                </Button>
              </div>
            </div>

            {/* المبلغ النهائي */}
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="flex justify-between text-sm font-bold text-lg">
                <span>المبلغ النهائي للفاتورة</span>
                <span className="text-primary">{formatCurrency(Math.round(calculation.total) + invoiceAdjustment, state.currency)}</span>
              </div>
              {invoiceAdjustment !== 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(calculation.total, state.currency)} {invoiceAdjustment > 0 ? "+" : ""} {formatCurrency(invoiceAdjustment, state.currency)}
                  {invoiceAdjustmentNote && ` (${invoiceAdjustmentNote})`}
                </p>
              )}
            </div>

            {!state.customerName && (
              <p className="text-sm text-destructive">يرجى إدخال اسم العميل في التسعيرة أولاً (يجب أن يكون عميل مسجل في النظام)</p>
            )}
            <div className="flex gap-2">
              <Button className="flex-1 gap-2" onClick={handleConvertToInvoice} disabled={!state.customerName || createInvoice.isPending}>
                <FileText className="w-4 h-4" />
                {createInvoice.isPending ? "جاري الإنشاء..." : "إنشاء الفاتورة"}
              </Button>
              <Button variant="outline" onClick={() => setShowConvertDialog(false)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PriceRow({ label, value, bold, large, color, currency }: { label: string; value: number; bold?: boolean; large?: boolean; color?: string; currency: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? "font-semibold" : "text-muted-foreground"} ${large ? "text-base" : ""}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-bold" : ""} ${large ? "text-lg" : ""} ${color || ""}`}>
        {formatCurrency(value, currency)}
      </span>
    </div>
  );
}
