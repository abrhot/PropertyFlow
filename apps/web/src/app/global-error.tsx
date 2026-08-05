'use client';

import { useEffect } from 'react';

/**
 * Top-level fallback for errors thrown in the root layout. It must render its
 * own <html>/<body>. Like the route boundary, "Reload" clears caches and any
 * service worker to recover from a stale-build crash.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  async function hardReset() {
    try {
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } finally {
      window.location.reload();
    }
  }

  return (
    <html lang="en">
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#f4f2ec',
          padding: '1.5rem',
          margin: 0,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: '100%',
            textAlign: 'center',
            background: '#fff',
            border: '1px solid #e5e1d8',
            borderRadius: 16,
            padding: '2rem',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: '#6b675e', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            The app hit an unexpected error. Reload to clear any stale cached data.
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              onClick={() => reset()}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: 'none',
                background: '#2b5f48',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <button
              onClick={hardReset}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: '1px solid #d9d4c8',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              Reload &amp; clear cache
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
