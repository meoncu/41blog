/* 41Blog Service Worker
 * Version synced with app version. Bump CACHE_NAME on breaking changes.
 */
const CACHE_NAME = '41blog-v1.2.0';
const APP_SHELL = [
    '/',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
];

// Skip waiting on install so new SW takes over immediately
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

// Fetch strategy:
// - HTML pages: network-first, fall back to cache (offline support)
// - Static assets: cache-first, then network
// - External APIs (Firebase, R2, Analytics): never intercept
self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Don't intercept cross-origin API/analytics/storage requests
    if (
        url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('firebaseapp.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('cloudflareinsights.com') ||
        url.hostname.includes('r2.dev') ||
        url.hostname.includes('googleusercontent.com')
    ) {
        return;
    }

    // HTML pages: network-first with offline fallback
    const isHTML =
        request.mode === 'navigate' ||
        (request.headers.get('accept') || '').includes('text/html');

    if (isHTML) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() =>
                    caches.match(request).then((cached) => cached || caches.match('/'))
                )
        );
        return;
    }

    // Static assets: cache-first
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
