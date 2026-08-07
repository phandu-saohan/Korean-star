// PWA Service Worker Registration & Installation Helper

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered successfully:', reg.scope);
          // Check for updates periodically
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] Phiên bản mới đã sẵn sàng! Đã cập nhật cache.');
                }
              };
            }
          };
        })
        .catch((err) => {
          console.error('[PWA] Lỗi đăng ký Service Worker:', err);
        });
    });
  }
}

export interface PWAInstallConfig {
  appName: string;
  shortName: string;
  themeColor: string;
  appDescription: string;
  enableInstallPrompt: boolean;
  pwaLogoUrl?: string;
}

export const DEFAULT_PWA_CONFIG: PWAInstallConfig = {
  appName: "KOREAN STAR - Hệ Thống CTV & Bệnh Viện Thẩm Mỹ",
  shortName: "KOREAN STAR",
  themeColor: "#F59E0B",
  appDescription: "Hệ thống quản lý Cộng tác viên & Đặt lịch dịch vụ thẩm mỹ KOREAN STAR 24/7",
  enableInstallPrompt: true,
  pwaLogoUrl: ""
};
