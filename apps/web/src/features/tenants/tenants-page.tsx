'use client';

import { ApiError } from '@propertyflow/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Home, Plus, Search, UserCheck, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAbility } from '@/features/auth/ability-context';
import { RequireAbility } from '@/features/auth/require-ability';
import { RequireAuth } from '@/features/auth/require-auth';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { formatCents } from '@/features/properties/format';
import { api } from '@/lib/api';
import { useDebounced } from '@/lib/use-debounced';

function TenantsContent() {
  const ability = useAbility();
  const canAdd = ability.can('create', 'User');
  const [search, setSearch] = useState('');
  const deferredSearch = useDebounced(search);
  const [addOpen, setAddOpen] = useState(false);
  const tenants = useQuery({
    queryKey: ['tenants', deferredSearch],
    queryFn: () => api.listTenants({ search: deferredSearch || undefined }),
    placeholderData: (previous) => previous,
  });
  const summary = tenants.data?.summary;
  return (
    <DashboardShell title="Tenants">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Tenant directory</h2>
            <p className="mt-1 text-muted-foreground">
              Residents and their current lease placement.
            </p>
          </div>
          {canAdd && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add tenant
            </Button>
          )}
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
      <AddTenantDialog open={addOpen} onOpenChange={setAddOpen} />
    </DashboardShell>
  );
}

function AddTenantDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [assign, setAssign] = useState(false);
  const [unitId, setUnitId] = useState('');
  const [rent, setRent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const options = useQuery({
    queryKey: ['lease-options'],
    queryFn: () => api.listLeaseFormOptions(),
    enabled: open && assign,
  });

  function reset() {
    setFullName('');
    setEmail('');
    setAssign(false);
    setUnitId('');
    setRent('');
    setStartDate('');
    setEndDate('');
    setCredentials(null);
  }

  const create = useMutation({
    mutationFn: () =>
      api.createTenant({
        fullName: fullName.trim(),
        email: email.trim(),
        ...(assign
          ? {
              unitId,
              rentCents: Math.round(Number(rent) * 100),
              startDate: new Date(startDate).toISOString(),
              endDate: new Date(endDate).toISOString(),
            }
          : {}),
      }),
    onSuccess: async (response) => {
      toast.success(`${response.tenant.fullName} was added`);
      await queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setCredentials({ email: response.tenant.email, password: response.temporaryPassword });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Unable to add tenant'),
  });

  const assignValid =
    !assign || (unitId && Number(rent) > 0 && startDate && endDate && endDate > startDate);
  const canSubmit = fullName.trim().length >= 2 && email.includes('@') && assignValid;

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function copyPassword() {
    if (!credentials) return;
    await navigator.clipboard.writeText(credentials.password);
    toast.success('Temporary password copied');
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {credentials ? (
          <>
            <DialogHeader>
              <DialogTitle>Tenant added</DialogTitle>
              <DialogDescription>
                Share these one-time sign-in details. The resident should change the password after
                their first login.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Email</p>
                <p className="font-medium">{credentials.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Temporary password</p>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-background px-2 py-1 font-mono text-sm">
                    {credentials.password}
                  </code>
                  <Button type="button" variant="outline" size="sm" onClick={copyPassword}>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>
                <Check className="h-4 w-4" /> Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add tenant</DialogTitle>
              <DialogDescription>
                Create a resident account and optionally place them in a unit.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenant-name">Full name</Label>
                <Input
                  id="tenant-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Jane Resident"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-email">Email</Label>
                <Input
                  id="tenant-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="jane@example.com"
                />
              </div>

              <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={assign}
                  onChange={(event) => setAssign(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="flex items-center gap-1.5 font-medium">
                  <Home className="h-4 w-4 text-primary" /> Place in a unit now (creates an active
                  lease)
                </span>
              </label>

              {assign && (
                <div className="space-y-4 rounded-lg border border-dashed p-4">
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={unitId} onValueChange={setUnitId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {(options.data?.units ?? []).map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.propertyName} · {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenant-rent">Monthly rent (USD)</Label>
                    <Input
                      id="tenant-rent"
                      type="number"
                      min="0"
                      step="1"
                      value={rent}
                      onChange={(event) => setRent(event.target.value)}
                      placeholder="1850"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tenant-start">Lease start</Label>
                      <Input
                        id="tenant-start"
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tenant-end">Lease end</Label>
                      <Input
                        id="tenant-end"
                        type="date"
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={() => create.mutate()} disabled={!canSubmit || create.isPending}>
                {create.isPending ? (
                  <UserPlus className="h-4 w-4 animate-pulse" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Add tenant
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value?: number; icon: typeof Users }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardDescription>{label}</CardDescription><Icon className="h-4 w-4 text-primary" /></CardHeader><CardContent><CardTitle>{value ?? '—'}</CardTitle></CardContent></Card>;
}

export function TenantsPage() {
  return <RequireAuth><RequireAbility action="access" subject="tenants"><TenantsContent /></RequireAbility></RequireAuth>;
}
