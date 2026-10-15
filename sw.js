// TWC CareCRM Service Worker (Production PWA for GitHub Pages & Custom Domains)
const CACHE_NAME = 'twc-carecrm-v3';

// Dynamically compute GitHub Pages subpath (e.g. /my-repo/ or /)
const basePath = self.location.pathname.replace(/\/sw\.js$/, '') || '';

const STATIC_ASSETS = [
  basePath + '/',
  basePath + '/index.html',
  basePath + '/manifest.json',
  basePath + '/icon.svg',
  basePath + '/apple-touch-icon.png',
  basePath + '/pwa-192x192.png',
  basePath + '/pwa-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('TWC CareCRM SW: Pre-caching partial assets:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Network-First for Google Apps Script Webhook API calls
  if (url.hostname.includes('script.google.com') || url.hostname.includes('google.com')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Stale-While-Revalidate for CSS, JS, fonts, and images
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback to cached index.html for SPA routes
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match(basePath + '/index.html') || caches.match('./index.html');
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});
