const CACHE_NAME = 'miplata-static-v109';
const APP_SHELL = [
  '/css/tailwind.generated.css?v=20261020-mutation-fast-v1',
  '/css/style.min.css?v=20261021-monthly-pdf-design-v3',
  '/css/quick-add.css?v=20261020-quick-add-mobile-v15',
  '/css/mobile-scroll.css?v=20261026-mobile-scroll-v3',
  '/js/demo-login-performance.js?v=20261021-demo-login-v4',
  '/js/network-guard.js?v=20261021-network-v1',
  '/js/auth-bootstrap-guard.js?v=20261022-auth-data-first-v3',
  '/js/app.bundle.delete-fix.js?v=20261027-smart-category-v1',
  '/js/goal-image-controls.js?v=20261027-goal-image-v1',
  '/assets/optimized/Logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/') || Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
