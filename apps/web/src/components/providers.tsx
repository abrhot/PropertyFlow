'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AbilityProvider } from '@/features/auth/ability-context';
import { AuthProvider } from '@/features/auth/auth-context';
import { AssistantProvider } from '@/components/propertyflow-assistant';

const PropertyFlowAssistant = dynamic(
  () => import('@/components/propertyflow-assistant').then((mod) => mod.PropertyFlowAssistant),
  { ssr: false },
);

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
        <AbilityProvider>
          <AssistantProvider>
            {children}
            <PropertyFlowAssistant />
          </AssistantProvider>
        </AbilityProvider>
      </AuthProvider>
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
