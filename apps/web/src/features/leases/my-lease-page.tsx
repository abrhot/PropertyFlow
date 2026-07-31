'use client';

import { LEASE_STATUS_LABELS } from '@propertyflow/constants';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, FileText, Home, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RequireAbility } from '@/features/auth/require-ability';
import { RequireAuth } from '@/features/auth/require-auth';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { formatCents } from '@/features/properties/format';
import { api } from '@/lib/api';
import { leaseKeys } from './queries';

function MyLeaseContent() {
  const leases = useQuery({
    queryKey: leaseKeys.list({}),
    queryFn: () => api.listLeases(),
  });
  const lease =
    leases.data?.leases.find((item) => item.status === 'ACTIVE') ?? leases.data?.leases[0];

  return (
    <DashboardShell title="My Lease">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Lease overview</h2>
          <p className="mt-1 text-muted-foreground">Your current home, agreement, and rent details.</p>
        </div>
        {leases.isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : lease ? (
          <>
            <Card>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardDescription>Your home</CardDescription>
                  <CardTitle className="mt-2">{lease.unit.propertyName} · {lease.unit.label}</CardTitle>
                </div>
                <Badge>{LEASE_STATUS_LABELS[lease.status]}</Badge>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <Detail icon={Wallet} label="Monthly rent" value={formatCents(lease.rentCents)} />
                <Detail icon={Home} label="Security deposit" value={formatCents(lease.depositCents)} />
                <Detail icon={CalendarDays} label="Lease starts" value={new Date(lease.startDate).toLocaleDateString()} />
                <Detail icon={CalendarDays} label="Lease ends" value={new Date(lease.endDate).toLocaleDateString()} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Agreement notes</CardTitle></CardHeader>
              <CardContent className="flex gap-3 text-sm text-muted-foreground">
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                {lease.notes ?? 'No additional notes are attached to this lease.'}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card><CardContent className="py-14 text-center text-muted-foreground">No lease is connected to your account.</CardContent></Card>
        )}
      </div>
    </DashboardShell>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Home; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-xl border bg-muted/25 p-4"><Icon className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div></div>;
}

export function MyLeasePage() {
  return <RequireAuth><RequireAbility action="access" subject="my_lease"><MyLeaseContent /></RequireAbility></RequireAuth>;
}
