/* sw.js — DATA SOLUTION Service Worker
 *
 * Caching strategy:
 *   - Cache-first  for static assets (HTML, CSS, JS, images)
 *   - Network-first for navigation requests, falling back to cache
 *   - NEVER cache /api/ or /functions/ endpoints
 *   - NEVER cache payment-related or order-related responses
 *
 * Security: No payment data, order data, or API responses are ever stored
 * in the cache. Only static shell assets are cached for offline support.
 */

const CACHE_VERSION = 'data-solution-v1';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;

// Assets to pre-cache on install (the app shell)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

/* ----------------------------------------------------------
 * Install: pre-cache the app shell
 * ---------------------------------------------------------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Use individual addAll with fail-safe so one missing asset
      // doesn't break the entire install.
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Failed to pre-cache ${url}:`, err.message);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

/* ----------------------------------------------------------
 * Activate: clean up old cache versions
 * ---------------------------------------------------------- */
self.addEventListener('activate', (event) => {
  const allowedCaches = [STATIC_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => !allowedCaches.includes(name))
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      )
    )
  );
  self.clients.claim();
});

/* ----------------------------------------------------------
 * Helper: should this request be cached?
 * ---------------------------------------------------------- */
function shouldNeverCache(url) {
  // Never cache API, edge functions, payment, or order endpoints
  const pathname = url.pathname.toLowerCase();
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/functions/') ||
    pathname.includes('payment') ||
    pathname.includes('order') ||
    pathname.includes('mpesa') ||
    pathname.includes('checkout') ||
    pathname.includes('admin')
  );
}

function isStaticAsset(url, request) {
  const pathname = url.pathname.toLowerCase();
  return (
    request.method === 'GET' &&
    (
      pathname.endsWith('.html') ||
      pathname.endsWith('.css') ||
      pathname.endsWith('.js') ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.jpg') ||
      pathname.endsWith('.jpeg') ||
      pathname.endsWith('.svg') ||
      pathname.endsWith('.gif') ||
      pathname.endsWith('.webp') ||
      pathname.endsWith('.ico') ||
      pathname.endsWith('.woff') ||
      pathname.endsWith('.woff2') ||
      pathname.endsWith('.ttf') ||
      pathname.endsWith('.json') ||
      pathname === '/' ||
      pathname === '/index.html'
    )
  );
}

/* ----------------------------------------------------------
 * Fetch: route by strategy
 * ---------------------------------------------------------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return; // malformed URL, let browser handle
  }

  // ---- Rule 1: NEVER cache API, functions, payment, or order endpoints ----
  if (shouldNeverCache(url)) {
    // Network-only — bypass cache entirely
    return;
  }

  // ---- Rule 2: Cross-origin requests (e.g., Supabase) — network only ----
  if (url.origin !== self.location.origin) {
    return;
  }

  // ---- Rule 3: Static assets → cache-first ----
  if (isStaticAsset(url, request)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.ok) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        })
      )
    );
    return;
  }

  // ---- Rule 4: Navigation requests → network-first, fallback to cache ----
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const cache = caches.open(STATIC_CACHE);
          if (networkResponse && networkResponse.ok) {
            cache.then((c) => c.put(request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(request).then((cached) =>
            cached || caches.match('/index.html')
          )
        )
    );
    return;
  }
});
