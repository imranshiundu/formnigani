/* FormNiGani service worker — app-shell caching with offline fallback. */
const CACHE = 'fng-v2';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './data/forms.json',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
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

  // App shell + icons: cache-first so the app opens offline.
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

  // Third-party images: network-first, no caching (fallback to cache on failure).
  if (request.destination === 'image') {
    e.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // Page navigations while offline: fall back to the cached shell.
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('./index.html')));
  }
});
