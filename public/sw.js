/* 41Blog Service Worker - v1.2.0-purge
 *
 * This is a one-shot purge version:
 * - On activate: delete ALL existing caches (clean slate from previous SW)
 * - On fetch: do NOT intercept anything (no-op, prevents upload/cache conflicts)
 * - PWA install still works via /manifest.json (doesn't require SW)
 *
 * Future versions can re-introduce offline cache once the app is stable.
 */
const CACHE_NAME = '41blog-purge-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

// No fetch interception – let all requests go straight to the network.
self.addEventListener('fetch', () => {
    /* no-op */
});
