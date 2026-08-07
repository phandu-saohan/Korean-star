import React, { useState, useEffect } from "react";
import { Download, Smartphone, CheckCircle2, X, Share, Sparkles, MonitorCheck } from "lucide-react";
import { PWAInstallConfig, DEFAULT_PWA_CONFIG } from "../lib/pwa";

interface PWAInstallPromptProps {
  config?: Partial<PWAInstallConfig>;
  onToast?: (msg: string) => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ config, onToast }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const activeConfig: PWAInstallConfig = {
    ...DEFAULT_PWA_CONFIG,
    ...config
  };

  useEffect(() => {
    // 1. Check if running in standalone mode (already installed PWA) or already recorded in localStorage
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      localStorage.getItem("pwa_app_installed_success") === "true";

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Check iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Catch beforeinstallprompt event for Android / Chrome / Edge / Windows / Mac
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check dismissed state in session
      const dismissed = sessionStorage.getItem("pwa_install_dismissed");
      if (!dismissed && activeConfig.enableInstallPrompt) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // App installed event listener
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      localStorage.setItem("pwa_app_installed_success", "true");
      if (onToast) onToast("✨ Chúc mừng! Đã cài đặt ứng dụng KOREAN STAR thành công trên thiết bị!");
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [activeConfig.enableInstallPrompt]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) {
      if (onToast) onToast("Vui lòng mở Trình duyệt Chrome/Edge và nhấn 'Thêm vào Màn hình chính'");
      return;
    }

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === "accepted") {
      if (onToast) onToast("Đang tiến hành cài đặt ứng dụng PWA...");
      setIsInstalled(true);
      localStorage.setItem("pwa_app_installed_success", "true");
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    sessionStorage.setItem("pwa_install_dismissed", "true");
  };

  // Ẩn hoàn toàn nút cài đặt khi ứng dụng đã được cài đặt trên thiết bị này
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Installation Badge Button for Header / Topbar */}
      <button
        onClick={handleInstallClick}
        className="bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-black text-xs px-3 py-1.5 rounded-full transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 cursor-pointer animate-pulse"
        title="Tải & Cài đặt Ứng dụng KOREAN STAR lên Màn hình chính"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Cài Đặt App</span>
      </button>

      {/* Floating Bottom Banner Prompt */}
      {showBanner && activeConfig.enableInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md bg-[#0B192C] text-white border-2 border-amber-400/60 rounded-3xl p-4 shadow-2xl z-50 animate-in slide-in-from-bottom duration-300">
          <button
            onClick={handleDismissBanner}
            className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/80 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-2xl shadow-inner overflow-hidden">
              {activeConfig.pwaLogoUrl ? (
                <img src={activeConfig.pwaLogoUrl} alt="PWA App Logo" className="w-full h-full object-contain p-1 rounded-xl" />
              ) : (
                "✨"
              )}
            </div>
            <div className="space-y-1 pr-4">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-white">{activeConfig.shortName} PWA App</span>
                <span className="bg-amber-400 text-[#0B192C] font-black text-[10px] px-1.5 py-0.5 rounded-md">V1.0</span>
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Cài đặt ứng dụng lên màn hình chính để truy cập nhanh, nhận thông báo 24/7 và dùng offline khi mất mạng!
              </p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={handleInstallClick}
                  className="bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-black text-xs px-4 py-2 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Cài Đặt Ngay</span>
                </button>
                <button
                  onClick={handleDismissBanner}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                >
                  Để Sau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iOS Installation Instruction Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B192C] text-white border border-amber-400/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto text-3xl">
                📱
              </div>
              <h3 className="font-extrabold text-base text-amber-400">Hướng Dẫn Cài Đặt Trên iPhone/iPad</h3>
              <p className="text-xs text-slate-300 font-medium">
                Để thêm {activeConfig.shortName} vào Màn hình chính Safari:
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 text-xs text-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-[#0B192C] font-black flex items-center justify-center text-xs shrink-0">1</span>
                <span>Nhấn vào biểu tượng <Share className="w-4 h-4 text-sky-400 inline mx-0.5" /> <strong>Chia sẻ (Share)</strong> ở thanh dưới trình duyệt Safari.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-[#0B192C] font-black flex items-center justify-center text-xs shrink-0">2</span>
                <span>Cuộn xuống và chọn <strong className="text-amber-400 font-bold">"Thêm vào MH chính" (Add to Home Screen)</strong>.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-[#0B192C] font-black flex items-center justify-center text-xs shrink-0">3</span>
                <span>Nhấn <strong className="text-emerald-400">"Thêm" (Add)</strong> ở góc trên bên phải để hoàn tất!</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-black text-xs py-2.5 rounded-xl transition text-center cursor-pointer shadow-md"
            >
              Đã Hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
};
