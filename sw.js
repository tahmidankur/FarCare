/* =========================================================
   FarCare Service Worker — Offline-first PWA
   ========================================================= */

const CACHE_NAME = 'farcare-v1';

const CORE_ASSETS = [
  './',
  './index.html',
  './contacts.html',
  './history.html',
  './settings.html',
  './style.css',
  './storage.js',
  './manifest.json',
  './icons/icon.svg',
];

// ── Install: pre-cache all core assets ──────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CORE_ASSETS);
      // Cache PNG icons if they exist (non-fatal if missing)
      const optional = [
        './icons/icon-192.png',
        './icons/icon-512.png',
        './icons/icon-maskable-192.png',
        './icons/icon-maskable-512.png',
      ];
      await Promise.allSettled(optional.map((url) =>
        fetch(url).then((r) => r.ok ? cache.put(url, r) : null).catch(() => null)
      ));
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: remove stale caches ───────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: offline-first strategy ───────────────────────
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Google Fonts — stale-while-revalidate so they work offline after first load
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(e.request).then((cached) => {
          const fresh = fetch(e.request).then((r) => {
            if (r.ok) cache.put(e.request, r.clone());
            return r;
          }).catch(() => cached);
          return cached || fresh;
        })
      )
    );
    return;
  }

  // Same-origin assets — cache-first, update in background
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const networkFetch = fetch(e.request).then((r) => {
          if (r.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, r.clone()));
          }
          return r;
        }).catch(() => cached || new Response('Offline', { status: 503 }));

        return cached || networkFetch;
      })
    );
  }
});

// ── Push notifications (for future server integration) ──
self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'FarCare Reminder', {
      body: data.body || "Don't forget to check in with your family today! 💙",
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: 'farcare-reminder',
      renotify: true,
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes('index.html') || c.url.endsWith('/'));
      return existing ? existing.focus() : clients.openWindow('./index.html');
    })
  );
});
