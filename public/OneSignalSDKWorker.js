// KOREAN STAR - OneSignal Service Worker with App Badging API Support
self.addEventListener('message', () => {});

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Listen to push events for App Badging API integration
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    
    // Extract unreadCount from OneSignal payload structure:
    // 1. OneSignal custom payload: custom.a.unreadCount
    // 2. additionalData payload: additionalData.unreadCount
    // 3. custom data payload: data.unreadCount
    const unreadCount = 
      payload.custom?.a?.unreadCount || 
      payload.additionalData?.unreadCount || 
      payload.data?.unreadCount || 
      payload.unreadCount;

    if (unreadCount !== undefined && unreadCount !== null && 'setAppBadge' in navigator) {
      const count = parseInt(unreadCount, 10);
      if (!isNaN(count)) {
        if (count > 0) {
          navigator.setAppBadge(count).catch((err) => {
            console.warn('[OneSignal Worker] Failed to setAppBadge:', err);
          });
        } else {
          navigator.clearAppBadge().catch((err) => {
            console.warn('[OneSignal Worker] Failed to clearAppBadge:', err);
          });
        }
      }
    }
  } catch (err) {
    // Non-JSON push payload
  }
});
