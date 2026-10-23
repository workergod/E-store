const CACHE_NAME = 'cryodeal-offline-v1';
const OFFLINE_URL = '/offline.html';

const ASSETS_TO_CACHE = [
  '/offline.html',
  '/icon.svg',
  '/icon-c.svg',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.jpg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle navigation requests for HTML pages when offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(OFFLINE_URL);
        return cachedResponse || new Response('Offline', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  // For cached static icons/offline assets, try network first, then cache
  if (
    event.request.url.includes('/icon') ||
    event.request.url.includes('/favicon') ||
    event.request.url.includes('/logo.jpg') ||
    event.request.url.includes('/offline.html')
  ) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return cache.match(event.request);
      })
    );
  }
});
