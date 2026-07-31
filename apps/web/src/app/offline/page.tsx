import { Building2, WifiOff } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offline',
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
        <Building2 className="h-7 w-7" aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-medium uppercase tracking-wide">You&apos;re offline</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">No connection</h1>
        <p className="mx-auto max-w-sm text-muted-foreground">
          PropertyFlow needs an internet connection to load this page. Check your network and try
          again.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
      >
        Try again
      </Link>
    </div>
  );
}
