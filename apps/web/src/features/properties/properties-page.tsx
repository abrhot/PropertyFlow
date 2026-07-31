'use client';

import { ApiError } from '@propertyflow/api-client';
import { resource } from '@propertyflow/auth';
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS } from '@propertyflow/constants';
import type { Property } from '@propertyflow/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  DoorOpen,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAbility } from '@/features/auth/ability-context';
import { RequireAbility } from '@/features/auth/require-ability';
import { RequireAuth } from '@/features/auth/require-auth';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { api } from '@/lib/api';
import { formatAddress, formatCents } from './format';
import { PropertyFormDialog } from './property-form-dialog';
import { propertyKeys } from './queries';

const ALL_TYPES = 'all';

/** Keeps the list query from firing on every keystroke. */
function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

function PropertiesContent() {
  const ability = useAbility();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>(ALL_TYPES);
  const [editing, setEditing] = useState<Property | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Property | null>(null);

  const params = {
    search: useDebounced(search) || undefined,
    type: type === ALL_TYPES ? undefined : (type as Property['type']),
  };

  const properties = useQuery({
    queryKey: propertyKeys.list(params),
    queryFn: () => api.listProperties(params),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteProperty(id),
    onSuccess: async (response) => {
      toast.success(response.message);
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Unable to delete the property');
    },
  });

  const canCreate = ability.can('create', 'Property');
  const summary = properties.data?.summary;

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(property: Property) {
    setEditing(property);
    setFormOpen(true);
  }

  return (
    <DashboardShell title="Properties">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Portfolio</h2>
            <p className="max-w-2xl text-muted-foreground">
              Every building you have access to, with live occupancy and rent roll.
            </p>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add property
            </Button>
          )}
        </div>

        <section aria-label="Portfolio summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Properties"
            value={summary ? String(summary.propertyCount) : null}
            detail="Buildings you can access"
            icon={Building2}
          />
          <SummaryCard
            label="Units"
            value={summary ? String(summary.unitCount) : null}
            detail={summary ? `${summary.occupiedUnits} occupied` : ''}
            icon={DoorOpen}
          />
          <SummaryCard
            label="Occupancy"
            value={summary ? `${summary.occupancyRate}%` : null}
            detail="Share of units leased"
            icon={TrendingUp}
          />
          <SummaryCard
            label="Monthly rent roll"
            value={summary ? formatCents(summary.monthlyRentCents) : null}
            detail="Combined market rent"
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
              placeholder="Search by name, city, or street"
              aria-label="Search properties"
              className="pl-9"
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="sm:w-56" aria-label="Filter by property type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TYPES}>All property types</SelectItem>
              {PROPERTY_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {PROPERTY_TYPE_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {properties.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-52 w-full rounded-xl" />
            ))}
          </div>
        ) : properties.isError ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="font-medium">We could not load your properties</p>
              <Button variant="outline" onClick={() => properties.refetch()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : properties.data?.properties.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {properties.data.properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onEdit={() => openEdit(property)}
                onDelete={() => setPendingDelete(property)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="font-medium">
                  {search || type !== ALL_TYPES ? 'No matching properties' : 'No properties yet'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {search || type !== ALL_TYPES
                    ? 'Try a different search or filter.'
                    : 'Add your first building to start tracking units and rent.'}
                </p>
              </div>
              {canCreate && !search && type === ALL_TYPES && (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add property
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <PropertyFormDialog open={formOpen} onOpenChange={setFormOpen} property={editing} />

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.name}?</DialogTitle>
            <DialogDescription>
              This removes the property and its {pendingDelete?.stats.unitCount ?? 0} unit(s). This
              cannot be undone.
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
              Delete property
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
  icon: typeof Building2;
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

function PropertyCard({
  property,
  onEdit,
  onDelete,
}: {
  property: Property;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ability = useAbility();
  const subject = resource('Property', {
    id: property.id,
    organizationId: property.organizationId,
    ownerId: property.ownerId ?? undefined,
  });
  const canEdit = ability.can('update', subject);
  const canDelete = ability.can('delete', subject);

  return (
    <Card className="flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-lg">
              <Link href={`/dashboard/properties/${property.id}`} className="hover:underline">
                {property.name}
              </Link>
            </CardTitle>
            <CardDescription className="truncate">{formatAddress(property)}</CardDescription>
          </div>
          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Actions for ${property.name}`}>
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onSelect={onEdit}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem onSelect={onDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant="secondary">{PROPERTY_TYPE_LABELS[property.type]}</Badge>
          {!property.isActive && <Badge variant="outline">Inactive</Badge>}
          {property.owner && <Badge variant="outline">Owner: {property.owner.fullName}</Badge>}
        </div>
      </CardHeader>

      <CardContent className="mt-auto space-y-4">
        <dl className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center">
          <Metric label="Units" value={String(property.stats.unitCount)} />
          <Metric label="Occupied" value={`${property.stats.occupancyRate}%`} />
          <Metric label="Rent" value={formatCents(property.stats.monthlyRentCents)} />
        </dl>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/dashboard/properties/${property.id}`}>View units</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-semibold">{value}</dd>
    </div>
  );
}

export function PropertiesPage() {
  return (
    <RequireAuth>
      <RequireAbility action="access" subject="properties">
        <PropertiesContent />
      </RequireAbility>
    </RequireAuth>
  );
}
