// PropertyFlow service worker.
// Goals: make the app installable, provide an offline fallback for navigations,
// and cache static assets — without ever caching API traffic or authenticated
// HTML (navigations are always network-first).

const CACHE = 'propertyflow-v1';
const OFFLINE_URL = '/offline';
const PRECACHE = [OFFLINE_URL];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never intercept cross-origin (e.g. the API) requests.
  if (url.origin !== self.location.origin) return;
  // Never cache API routes served from the same origin.
  if (url.pathname.startsWith('/api')) return;

  // Navigations: always try the network, fall back to the offline page.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Static assets: stale-while-revalidate.
  const cacheable =
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons') ||
    ['style', 'script', 'image', 'font'].includes(request.destination);

  if (cacheable) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
