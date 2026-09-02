/* global self, caches */
// PropertyFlow service worker.
// Goals: make the app installable, provide an offline fallback for navigations,
// and cache static assets — without ever caching API traffic or authenticated
// HTML (navigations are always network-first).

const CACHE = 'propertyflow-v2';
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

  // Application code (Next.js build output, scripts, styles): network-first so a
  // fresh deploy never gets shadowed by a stale, hashed chunk from an older
  // build (the usual source of ChunkLoadError / client-side exceptions). We fall
  // back to cache only when offline.
  const isAppCode =
    url.pathname.startsWith('/_next/') ||
    request.destination === 'script' ||
    request.destination === 'style';

  if (isAppCode) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;
          throw new Error('offline and not cached');
        }
      }),
    );
    return;
  }

  // Images, fonts, and icons rarely change: stale-while-revalidate for speed.
  const cacheable =
    url.pathname.startsWith('/icons') || ['image', 'font'].includes(request.destination);

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
