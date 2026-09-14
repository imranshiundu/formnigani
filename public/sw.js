/* FormNiGani service worker — Next.js app shell with offline fallback. */
const CACHE = 'fng-v3';
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/data/forms.json',
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

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // API + live stream: always network, never cache.
  if (url.origin === location.origin && url.pathname.startsWith('/api/')) return;

  // Navigations: network-first, fall back to cached shell offline.
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
            return res;
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
