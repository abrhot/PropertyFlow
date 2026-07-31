'use client';

import { ApiError } from '@propertyflow/api-client';
import { resource } from '@propertyflow/auth';
import { LEASE_STATUSES, LEASE_STATUS_LABELS } from '@propertyflow/constants';
import type { Lease, LeaseStatus } from '@propertyflow/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, Pencil, Plus, Search, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
import { LeaseFormDialog } from './lease-form-dialog';
import { leaseKeys } from './queries';

const ALL_STATUSES = 'all';

function statusVariant(status: LeaseStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'ACTIVE') return 'default';
  if (status === 'DRAFT' || status === 'PENDING_SIGNATURE') return 'secondary';
  return 'outline';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

/** Keeps the list query from firing on every keystroke. */
function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function LeasesContent() {
  const ability = useAbility();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>(ALL_STATUSES);
  const [editing, setEditing] = useState<Lease | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Lease | null>(null);

  const params = {
    search: useDebounced(search) || undefined,
    status: status === ALL_STATUSES ? undefined : (status as LeaseStatus),
  };

  const leases = useQuery({
    queryKey: leaseKeys.list(params),
    queryFn: () => api.listLeases(params),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteLease(id),
    onSuccess: async (response) => {
      toast.success(response.message);
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: leaseKeys.all });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Unable to delete the lease');
    },
  });

  const canCreate = ability.can('create', 'Lease');
  const summary = leases.data?.summary;

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(lease: Lease) {
    setEditing(lease);
    setFormOpen(true);
  }

  function canEdit(lease: Lease): boolean {
    return ability.can(
      'update',
      resource('Lease', {
        id: lease.id,
        organizationId: lease.organizationId,
        tenantId: lease.tenantId,
        ownerId: lease.ownerId ?? undefined,
      }),
    );
  }

  function canDelete(lease: Lease): boolean {
    return ability.can(
      'delete',
      resource('Lease', {
        id: lease.id,
        organizationId: lease.organizationId,
        tenantId: lease.tenantId,
        ownerId: lease.ownerId ?? undefined,
      }),
    );
  }

  const rows = leases.data?.leases ?? [];
  const showActions = rows.some((lease) => canEdit(lease) || canDelete(lease));

  return (
    <DashboardShell title="Leases">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Leases</h2>
            <p className="max-w-2xl text-muted-foreground">
              Agreements across your portfolio, with tenant, term, and rent.
            </p>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create lease
            </Button>
          )}
        </div>

        <section aria-label="Lease summary" className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Leases"
            value={summary ? String(summary.leaseCount) : null}
            detail="Agreements you can access"
            icon={FileText}
          />
          <SummaryCard
            label="Active"
            value={summary ? String(summary.activeLeases) : null}
            detail="Currently in effect"
            icon={TrendingUp}
          />
          <SummaryCard
            label="Active rent / month"
            value={summary ? formatCents(summary.monthlyRentCents) : null}
            detail="Combined rent of active leases"
            icon={Wallet}
          />
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by tenant, unit, or property"
              aria-label="Search leases"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-56" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
              {LEASE_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {LEASE_STATUS_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="pt-6">
            {leases.isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((key) => (
                  <Skeleton key={key} className="h-12 w-full" />
                ))}
              </div>
            ) : leases.isError ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <p className="font-medium">We could not load your leases</p>
                <Button variant="outline" onClick={() => leases.refetch()}>
                  Try again
                </Button>
              </div>
            ) : rows.length ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Rent</TableHead>
                      <TableHead>Status</TableHead>
                      {showActions && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((lease) => (
                      <TableRow key={lease.id}>
                        <TableCell>
                          <div className="font-medium">{lease.tenant.fullName}</div>
                          <div className="text-xs text-muted-foreground">{lease.tenant.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{lease.unit.propertyName}</div>
                          <div className="text-xs text-muted-foreground">
                            Unit {lease.unit.label}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
                        </TableCell>
                        <TableCell>{formatCents(lease.rentCents)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(lease.status)}>
                            {LEASE_STATUS_LABELS[lease.status]}
                          </Badge>
                        </TableCell>
                        {showActions && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {canEdit(lease) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Edit lease for ${lease.tenant.fullName}`}
                                  onClick={() => openEdit(lease)}
                                >
                                  <Pencil className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              )}
                              {canDelete(lease) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Delete lease for ${lease.tenant.fullName}`}
                                  onClick={() => setPendingDelete(lease)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <FileText className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">
                    {search || status !== ALL_STATUSES ? 'No matching leases' : 'No leases yet'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {search || status !== ALL_STATUSES
                      ? 'Try a different search or filter.'
                      : 'Create a lease to assign a tenant to a unit.'}
                  </p>
                </div>
                {canCreate && !search && status === ALL_STATUSES && (
                  <Button onClick={openCreate}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Create lease
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <LeaseFormDialog open={formOpen} onOpenChange={setFormOpen} lease={editing} />

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this lease?</DialogTitle>
            <DialogDescription>
              The lease for {pendingDelete?.tenant.fullName} on unit {pendingDelete?.unit.label} will
              be removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => pendingDelete && remove.mutate(pendingDelete.id)}
            >
              {remove.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Delete lease
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  detail: string;
  icon: typeof FileText;
}) {
  return (
    <Card className="transition-shadow hover:shadow-elevated">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <CardTitle className="text-3xl">
          {value ?? <Skeleton className="h-8 w-20" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function LeasesPage() {
  return (
    <RequireAuth>
      <RequireAbility action="access" subject="leases">
        <LeasesContent />
      </RequireAbility>
    </RequireAuth>
  );
}
