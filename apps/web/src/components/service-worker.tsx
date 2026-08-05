'use client';

import { useEffect } from 'react';

/**
 * Manages the PWA service worker.
 *
 * In production it registers `/sw.js`. In development it does the opposite: it
 * tears down any service worker (and its caches) left over from a previous
 * production build, because a lingering SW keeps serving stale, hashed
 * `/_next/static` chunks that no longer match the dev server — the classic
 * cause of the "a client-side exception has occurred" overlay.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((registration) => registration.unregister()))
        .catch(() => {});
      if (typeof caches !== 'undefined') {
        void caches.keys().then((keys) => keys.forEach((key) => caches.delete(key))).catch(() => {});
      }
      return;
    }

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failures are non-fatal; the app still works online.
      });
    };

    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
