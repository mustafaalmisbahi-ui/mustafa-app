import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Check if dismissed recently
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedAt = Number(dismissed);
      // Don't show for 3 days after dismissal
      if (Date.now() - dismissedAt < 3 * 24 * 60 * 60 * 1000) return;
    }

    // Detect iOS
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // Show iOS guide after a delay
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Chrome - listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
  };

  if (!showBanner) return null;

  // iOS Guide
  if (isIOS) {
    return (
      <>
        {/* Banner */}
        {!showIOSGuide && (
          <div className="fixed bottom-20 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card border border-border rounded-2xl shadow-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">ثبّت التطبيق على جوالك</p>
                  <p className="text-xs text-muted-foreground mt-0.5">للوصول السريع بدون متصفح</p>
                </div>
                <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="flex-1 gap-1.5" onClick={() => setShowIOSGuide(true)}>
                  <Download className="w-4 h-4" />
                  كيف أثبّته؟
                </Button>
                <Button size="sm" variant="outline" onClick={handleDismiss}>
                  لاحقاً
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* iOS Installation Guide Modal */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={handleDismiss}>
            <div className="bg-card w-full sm:w-96 sm:rounded-2xl rounded-t-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg font-heading">تثبيت التطبيق على iPhone</h3>
                <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">اضغط على زر المشاركة</p>
                    <p className="text-xs text-muted-foreground mt-0.5">الزر في أسفل الشاشة (مربع مع سهم للأعلى)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">اختر "إضافة إلى الشاشة الرئيسية"</p>
                    <p className="text-xs text-muted-foreground mt-0.5">مرر للأسفل في القائمة حتى تجدها</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">اضغط "إضافة"</p>
                    <p className="text-xs text-muted-foreground mt-0.5">سيظهر التطبيق على شاشتك الرئيسية</p>
                  </div>
                </div>
              </div>
              <Button className="w-full" onClick={handleDismiss}>فهمت</Button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Android / Chrome install prompt
  if (!deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 shrink-0">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">ثبّت التطبيق على جوالك</p>
            <p className="text-xs text-muted-foreground mt-0.5">للوصول السريع بدون متصفح</p>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="flex-1 gap-1.5" onClick={handleInstall}>
            <Download className="w-4 h-4" />
            تثبيت التطبيق
          </Button>
          <Button size="sm" variant="outline" onClick={handleDismiss}>
            لاحقاً
          </Button>
        </div>
      </div>
    </div>
  );
}
