const CACHE_NAME = 'theraway-v1.4-app-firebase'; // Increment version
const APP_SHELL_FILES = [
  '/', 
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/logo.png',
  '/flower-texture.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Key CSS/JS bundles managed by Vite will be cached on first load/network-first strategy.
  // Leaflet and FontAwesome are now local deps and will be part of the main bundles.
];

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching App Shell');
      return cache.addAll(APP_SHELL_FILES).catch(error => {
        console.warn('[ServiceWorker] Some files failed to pre-cache:', APP_SHELL_FILES, error);
      });
    }).catch(err => {
      console.error('[ServiceWorker] Cache open failed during install:', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Let Firebase SDK handle its own network requests
  // These usually have "firebase" or "googleapi" in the hostname.
  // Also, don't intercept Vite HMR requests during development.
  if (url.protocol === 'chrome-extension:' || 
      url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis.com') ||
      url.pathname.includes('vite') || // For Vite HMR
      request.url.includes('@vite') || // For Vite HMR
      request.url.includes('localhost') && (request.url.includes('node_modules') || request.url.includes('@fs')) // Vite dev server specific paths
    ) {
    return; // Do not intercept, let the browser handle it
  }

  // For navigation requests (HTML pages) - Network first, then cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cachedResponse => {
            return cachedResponse || caches.match('/offline.html').then(offlinePage => {
              if (offlinePage) return offlinePage;
              // Fallback if offline.html is somehow not cached
              return new Response("<h1>You are offline</h1><p>Please check your internet connection.</p>", { headers: { 'Content-Type': 'text/html' }});
            });
          });
        })
    );
    return;
  }

  // For other static assets (CSS, JS from your domain): Cache-first, then network.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          if (url.hostname === self.location.hostname) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
        }
        return networkResponse;
      }).catch((error) => {
        console.warn(`[ServiceWorker] Fetch failed for ${request.url}; returning offline page if navigation, or nothing. Error:`, error);
      });
    })
  );
});