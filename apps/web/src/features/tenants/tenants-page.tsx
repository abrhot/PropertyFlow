'use client';

import { useQuery } from '@tanstack/react-query';
import { Home, Search, UserCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RequireAbility } from '@/features/auth/require-ability';
import { RequireAuth } from '@/features/auth/require-auth';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { formatCents } from '@/features/properties/format';
import { api } from '@/lib/api';

function TenantsContent() {
  const [search, setSearch] = useState('');
  const tenants = useQuery({
    queryKey: ['tenants', search],
    queryFn: () => api.listTenants({ search: search || undefined }),
  });
  const summary = tenants.data?.summary;
  return (
    <DashboardShell title="Tenants">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Tenant directory</h2>
          <p className="mt-1 text-muted-foreground">Residents and their current lease placement.</p>
        </div>
        <section className="grid gap-4 sm:grid-cols-3">
          <Metric label="Residents" value={summary?.tenantCount} icon={Users} />
          <Metric label="Active leases" value={summary?.activeLeases} icon={UserCheck} />
          <Metric label="Without active lease" value={summary?.withoutActiveLease} icon={Home} />
        </section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tenants..." className="pl-9" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Resident</TableHead><TableHead>Home</TableHead><TableHead>Rent</TableHead><TableHead>Lease ends</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {tenants.data?.tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell><p className="font-medium">{tenant.fullName}</p><p className="text-xs text-muted-foreground">{tenant.email}</p></TableCell>
                    <TableCell>{tenant.activeLease ? `${tenant.activeLease.unit.propertyName} · ${tenant.activeLease.unit.label}` : 'Unassigned'}</TableCell>
                    <TableCell>{tenant.activeLease ? formatCents(tenant.activeLease.rentCents) : '—'}</TableCell>
                    <TableCell>{tenant.activeLease ? new Date(tenant.activeLease.endDate).toLocaleDateString() : '—'}</TableCell>
                    <TableCell><Badge variant={tenant.activeLease ? 'success' : 'secondary'}>{tenant.activeLease ? 'Current' : 'No active lease'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value?: number; icon: typeof Users }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardDescription>{label}</CardDescription><Icon className="h-4 w-4 text-primary" /></CardHeader><CardContent><CardTitle>{value ?? '—'}</CardTitle></CardContent></Card>;
}

export function TenantsPage() {
  return <RequireAuth><RequireAbility action="access" subject="tenants"><TenantsContent /></RequireAbility></RequireAuth>;
}
