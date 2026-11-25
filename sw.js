/* =========================================================
   FarCare Service Worker — Offline-first PWA
   ========================================================= */

// Bump this whenever CORE_ASSETS or their contents change
const CACHE_NAME = 'farcare-v3';

// How long to wait for the network before using the cached page
const NETWORK_TIMEOUT_MS = 3000;

const CORE_ASSETS = [
  './',
  './index.html',
  './contacts.html',
  './history.html',
  './settings.html',
  './style.css',
  './core.js',
  './storage.js',
  './fonts/nunito-latin-wght-normal.woff2',
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

// ── Fetch: network-first with a deadline ───────────────────────
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Same-origin files: try the network first so updates show up right away,
  // and fall back to the cached copy when offline. If the network is slow
  // (weak Wi-Fi) and we have a cached copy, use it after 3 seconds.
  if (url.origin === self.location.origin) {
    e.respondWith(networkFirst(e.request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const network = fetch(request).then((r) => {
    if (r.ok) cache.put(request, r.clone());
    return r;
  });

  const cached = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
  if (!cached) {
    return network.catch(() => new Response('Offline', { status: 503 }));
  }
  const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS));
  // Whichever comes first: a fresh response, or the cached one after the deadline
  return Promise.race([network.catch(() => cached), timeout]);
}

// ── Push notifications (for future server integration) ──
self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'FarCare Reminder', {
      body: data.body || "Don't forget to check in with your family today!",
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
