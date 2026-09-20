'use client';

import type { ReactNode } from 'react';
import { RequireAuth } from '@/features/auth/require-auth';
import { DashboardFrame } from '@/features/dashboard/dashboard-shell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <DashboardFrame>{children}</DashboardFrame>
    </RequireAuth>
  );
}
