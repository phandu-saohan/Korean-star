// KOREAN STAR - Progressive Web App (PWA) Service Worker
const CACHE_NAME = 'korean-star-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event: Cache essential shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA SW] Pre-caching core app shell assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[PWA SW] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-first with Cache Fallback for dynamic app loading
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and API/Supabase calls from SW cache
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('/api/') ||
    event.request.url.includes('supabase') ||
    event.request.url.includes('onesignal')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Clone & update cache with fresh response
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline fallback from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Push notification listener
self.addEventListener('push', (event) => {
  let payload = { title: 'KOREAN STAR', body: 'Bạn có thông báo mới từ hệ thống!' };
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (_) {
      payload.body = event.data.text();
    }
  }

  // App Badging API Extraction
  const unreadCount = 
    payload.custom?.a?.unreadCount || 
    payload.additionalData?.unreadCount || 
    payload.data?.unreadCount || 
    payload.unreadCount;

  if (unreadCount !== undefined && unreadCount !== null && 'setAppBadge' in navigator) {
    const count = parseInt(unreadCount, 10);
    if (!isNaN(count)) {
      if (count > 0) {
        navigator.setAppBadge(count).catch((err) => console.warn('[PWA SW] Failed setAppBadge:', err));
      } else {
        navigator.clearAppBadge().catch((err) => console.warn('[PWA SW] Failed clearAppBadge:', err));
      }
    }
  }

  const options = {
    body: payload.body || payload.message,
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%230B192C"/><text y=".75em" x="50%" text-anchor="middle" font-size="60">✨</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%230B192C"/><text y=".75em" x="50%" text-anchor="middle" font-size="60">✨</text></svg>',
    vibrate: [100, 50, 100],
    data: payload.url || '/'
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data || '/');
      }
    })
  );
});
