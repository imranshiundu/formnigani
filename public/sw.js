/* FormNiGani service worker — auto-update: network-first with instant activation. */
const CACHE = 'fng-v5';
const SHELL = [
  '/',
  '/home',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Helper: notify all clients that an update is available */
function notifyUpdate() {
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((c) => c.postMessage({ type: 'UPDATE_AVAILABLE' }));
  });
}

/* Periodic check: every 60 seconds, fetch a version hash from the server.
   If the hash changed, notify clients so they can prompt a refresh. */
let lastHash = '';
self.addEventListener('message', (e) => {
  if (e.data?.type === 'CHECK_UPDATE') {
    fetch('/api/health', { cache: 'no-store' })
      .then((r) => r.text())
      .then((t) => {
        const hash = t.slice(0, 16);
        if (lastHash && hash !== lastHash) notifyUpdate();
        lastHash = hash;
      })
      .catch(() => {});
  }
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // API + Supabase: always network, never cache.
  if (url.origin === location.origin && url.pathname.startsWith('/api/')) return;
  if (url.hostname.includes('supabase.co')) return;

  // Navigations: network-first, fall back to cached shell offline.
  // On successful fetch, compare response to trigger update notification.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          // Clone and compare ETag or content to detect updates
          const clone = res.clone();
          clone.text().then((html) => {
            const m = html.match(/"buildId"\s*:\s*"([^"]+)"/);
            if (m && lastHash && m[1] !== lastHash) notifyUpdate();
            lastHash = m[1] || '';
          }).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Same-origin assets: stale-while-revalidate (fast + fresh)
  if (url.origin === location.origin) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(request).then((hit) => {
          const fetchPromise = fetch(request)
            .then((res) => {
              const copy = res.clone();
              c.put(request, copy).catch(() => {});
              return res;
            })
            .catch(() => hit);
          return hit || fetchPromise;
        })
      )
    );
    return;
  }

  // Third-party images: network-first with cache fallback.
  if (request.destination === 'image') {
    e.respondWith(fetch(request).catch(() => caches.match(request)));
  }
});
