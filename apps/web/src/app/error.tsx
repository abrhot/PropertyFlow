'use client';

import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Route-level error boundary. Instead of the raw browser "Application error"
 * overlay, it shows a recovery card. A hard reset also tears down any service
 * worker and its caches, which recovers users from a stale-chunk crash (an old
 * cached build shadowing the current one).
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface details in the console for debugging.
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
    <div className="bg-app flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-elevated">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <RefreshCw className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page hit an unexpected error. Try again, or reload to clear any stale cached data.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="outline" onClick={hardReset}>
            Reload &amp; clear cache
          </Button>
        </div>
      </div>
    </div>
  );
}
