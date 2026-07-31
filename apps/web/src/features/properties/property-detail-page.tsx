'use client';

import { ApiError } from '@propertyflow/api-client';
import { resource } from '@propertyflow/auth';
import { PROPERTY_TYPE_LABELS, UNIT_STATUS_LABELS } from '@propertyflow/constants';
import type { PropertyDetail, Unit, UnitStatus } from '@propertyflow/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
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
import { api } from '@/lib/api';
import { formatAddress, formatCents } from './format';
import { PropertyFormDialog } from './property-form-dialog';
import { propertyKeys } from './queries';
import { UnitFormDialog } from './unit-form-dialog';

function statusVariant(status: UnitStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'OCCUPIED') return 'default';
  if (status === 'VACANT') return 'secondary';
  return 'outline';
}

function PropertyDetailContent({ propertyId }: { propertyId: string }) {
  const ability = useAbility();
  const queryClient = useQueryClient();

  const [editingProperty, setEditingProperty] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | undefined>();
  const [pendingDelete, setPendingDelete] = useState<Unit | null>(null);

  const property = useQuery({
    queryKey: propertyKeys.detail(propertyId),
    queryFn: () => api.getProperty(propertyId),
  });

  const removeUnit = useMutation({
    mutationFn: (unitId: string) => api.deleteUnit(propertyId, unitId),
    onSuccess: async (response) => {
      toast.success(response.message);
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Unable to delete the unit');
    },
  });

  if (property.isLoading) {
    return (
      <DashboardShell title="Property">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </DashboardShell>
    );
  }

  if (property.isError || !property.data) {
    const notFound = property.error instanceof ApiError && property.error.status === 404;
    return (
      <DashboardShell title="Property">
        <Card className="mx-auto max-w-xl">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="font-medium">
              {notFound ? 'This property is not available to you' : 'We could not load this property'}
            </p>
            <p className="text-sm text-muted-foreground">
              {notFound
                ? 'It may have been deleted, or it belongs to a portfolio you cannot access.'
                : 'Check your connection and try again.'}
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard/properties">Back to properties</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardShell>
    );
  }

  const detail: PropertyDetail = property.data;
  const subject = resource('Property', {
    id: detail.id,
    organizationId: detail.organizationId,
    ownerId: detail.ownerId ?? undefined,
  });
  const canEdit = ability.can('update', subject);

  function openAddUnit() {
    setEditingUnit(undefined);
    setUnitDialogOpen(true);
  }

  function openEditUnit(unit: Unit) {
    setEditingUnit(unit);
    setUnitDialogOpen(true);
  }

  return (
    <DashboardShell title={detail.name}>
      <div className="mx-auto max-w-7xl space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/properties">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All properties
          </Link>
        </Button>

        <Card className="overflow-hidden">
          {detail.imageUrl && (
            <div className="relative aspect-[21/9] w-full overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={detail.imageUrl}
                alt={detail.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <CardHeader>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="space-y-2">
                <CardTitle className="text-2xl">{detail.name}</CardTitle>
                <CardDescription className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {formatAddress(detail)}
                </CardDescription>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{PROPERTY_TYPE_LABELS[detail.type]}</Badge>
                  {detail.yearBuilt && <Badge variant="outline">Built {detail.yearBuilt}</Badge>}
                  {!detail.isActive && <Badge variant="outline">Inactive</Badge>}
                  {detail.owner && (
                    <Badge variant="outline">Owner: {detail.owner.fullName}</Badge>
                  )}
                </div>
              </div>
              {canEdit && (
                <Button variant="outline" onClick={() => setEditingProperty(true)}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edit property
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Figure label="Units" value={String(detail.stats.unitCount)} />
              <Figure
                label="Occupied"
                value={`${detail.stats.occupiedUnits} of ${detail.stats.unitCount}`}
              />
              <Figure label="Occupancy" value={`${detail.stats.occupancyRate}%`} />
              <Figure label="Monthly rent" value={formatCents(detail.stats.monthlyRentCents)} />
            </dl>
            {detail.notes && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Notes</p>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                  {detail.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-lg">Units</CardTitle>
              <CardDescription>Rentable spaces in this property.</CardDescription>
            </div>
            {canEdit && (
              <Button onClick={openAddUnit}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add unit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {detail.units.length ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit</TableHead>
                      <TableHead>Layout</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Market rent</TableHead>
                      <TableHead>Status</TableHead>
                      {canEdit && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.units.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-medium">{unit.label}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {unit.bedrooms} bd · {unit.bathrooms} ba
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {unit.squareFeet ? `${unit.squareFeet.toLocaleString()} sq ft` : '—'}
                        </TableCell>
                        <TableCell>{formatCents(unit.marketRentCents)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(unit.status)}>
                            {UNIT_STATUS_LABELS[unit.status]}
                          </Badge>
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Edit unit ${unit.label}`}
                                onClick={() => openEditUnit(unit)}
                              >
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete unit ${unit.label}`}
                                onClick={() => setPendingDelete(unit)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-12 text-center">
                <p className="font-medium">No units yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {canEdit
                    ? 'Add the first unit to start tracking rent and occupancy.'
                    : 'Units will appear here once they are added.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PropertyFormDialog
        open={editingProperty}
        onOpenChange={setEditingProperty}
        property={detail}
      />
      <UnitFormDialog
        open={unitDialogOpen}
        onOpenChange={setUnitDialogOpen}
        propertyId={detail.id}
        unit={editingUnit}
      />

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete unit {pendingDelete?.label}?</DialogTitle>
            <DialogDescription>
              The unit and its rent figures are removed from this property. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removeUnit.isPending}
              onClick={() => pendingDelete && removeUnit.mutate(pendingDelete.id)}
            >
              {removeUnit.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Delete unit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">{value}</dd>
    </div>
  );
}

export function PropertyDetailPage({ propertyId }: { propertyId: string }) {
  return (
    <RequireAuth>
      <RequireAbility action="access" subject="properties">
        <PropertyDetailContent propertyId={propertyId} />
      </RequireAbility>
    </RequireAuth>
  );
}
