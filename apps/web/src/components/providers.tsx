'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AbilityProvider } from '@/features/auth/ability-context';
import { AuthProvider } from '@/features/auth/auth-context';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            // Reuse cached data across navigations so pages render instantly and
            // only refetch in the background after a minute.
            staleTime: 60_000,
            gcTime: 5 * 60_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AbilityProvider>{children}</AbilityProvider>
      </AuthProvider>
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
