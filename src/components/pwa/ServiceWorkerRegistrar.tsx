'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        // One-time cleanup: unregister all existing service workers and clear
        // their caches. A previous broken state (404 on /sw.js) may have left
        // bad registrations/caches behind, causing JS exceptions on upload.
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((reg) => reg.unregister());
        });
        if ('caches' in window) {
            caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
        }

        // Register the current SW (purge version – it re-cleans on activate)
        navigator.serviceWorker
            .register('/sw.js')
            .then((reg) => {
                console.log('[SW] Registered:', reg.scope);
            })
            .catch((err) => {
                console.warn('[SW] Registration failed:', err);
            });
    }, []);

    return null;
}
