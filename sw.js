// TWC CareCRM Service Worker (Production PWA for GitHub Pages & Custom Domains)
const CACHE_NAME = 'twc-carecrm-v3';

// Dynamically compute GitHub Pages subpath (e.g. /my-repo/ or /)
const basePath = self.location.pathname.replace(/\/sw\.js$/, '') || '';

const PRECACHE_ASSETS = [
  basePath + '/',
  basePath + '/index.html',
  basePath + '/manifest.json',
  basePath + '/icon.svg',
  basePath + '/pwa-192x192.png',
  basePath + '/pwa-512x512.png',
  basePath + '/apple-touch-icon.png'
];

// Install: Cache critical shell assets resiliently
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map((asset) =>
          fetch(asset, { cache: 'no-cache' })
            .then((res) => {
              if (res.ok) return cache.put(asset, res);
            })
            .catch(() => {
              // Silently continue if an asset isn't ready during initial build
            })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up previous cache versions and claim immediate client control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for dynamic content with robust cache fallback for offline usage
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // Ignore cross-origin API calls (like Google Apps Script, Google Drive, fonts) for caching to avoid CORS issues
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is an HTML page navigation, return cached entry point
          if (event.request.mode === 'navigate') {
            return (
              caches.match(basePath + '/') ||
              caches.match(basePath + '/index.html') ||
              caches.match('/index.html')
            );
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Listen for skip waiting messages from PWA update prompts
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
