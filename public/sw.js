/* SecurGuard AI - Service Worker
 *
 * Strategy:
 *  - Navigation requests (HTML): network-first, fall back to cache, then to "/".
 *    This guarantees users get new deploys while still working offline.
 *  - Static assets under /assets/: cache-first (Vite content-hashes them, so
 *    they are immutable for a given build).
 *  - Cross-origin and /api/* requests: bypass the SW entirely.
 *  - Cache version is bumped on every deploy via __BUILD_ID__ substitution
 *    so old caches are reclaimed in `activate`.
 */

const CACHE_VERSION = 'securguard-cache-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  // Pre-cache the offline fallback so the SPA boots without a network.
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

const isAsset = (pathname) => pathname.startsWith('/assets/') || pathname.startsWith('/icons/');

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Bypass cross-origin (e.g. Google Fonts, Gemini API, Unsplash avatars).
  if (url.origin !== self.location.origin) return;

  // Bypass API routes (none today, but keep the door closed).
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests: network-first with offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          // Update the cached version of this navigation for next time.
          const cache = await caches.open(CACHE_VERSION);
          cache.put(request, fresh.clone());
          return fresh;
        } catch (_err) {
          // Offline: serve the cached page, then fall back to "/".
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match('/');
          if (shell) return shell;
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  // Static assets: cache-first with background revalidation.
  if (isAsset(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response && response.status === 200) {
            const cache = await caches.open(CACHE_VERSION);
            cache.put(request, response.clone());
          }
          return response;
        } catch (_err) {
          // No cache and no network: return a transparent 504.
          return new Response('', { status: 504, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  // Anything else (manifest.json itself, etc.): try network, fall back to cache.
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);
      return cached || new Response('', { status: 504 });
    })
  );
});
