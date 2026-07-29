'use client';

import { ApiError } from '@propertyflow/api-client';
import { LEASE_STATUSES, LEASE_STATUS_LABELS } from '@propertyflow/constants';
import type { Lease } from '@propertyflow/types';
import {
  leaseFormSchema,
  leaseFormToCreateRequest,
  leaseFormToUpdateRequest,
  type LeaseFormInput,
} from '@propertyflow/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { leaseKeys } from './queries';

/** ISO timestamp -> yyyy-mm-dd for a native date input. */
function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

function toFormValues(lease?: Lease): LeaseFormInput {
  if (!lease) {
    return {
      unitId: '',
      tenantId: '',
      status: 'DRAFT',
      startDate: '',
      endDate: '',
      rent: 0,
      deposit: 0,
      notes: undefined,
    };
  }
  return {
    unitId: lease.unitId,
    tenantId: lease.tenantId,
    status: lease.status,
    startDate: toDateInput(lease.startDate),
    endDate: toDateInput(lease.endDate),
    rent: lease.rentCents / 100,
    deposit: lease.depositCents / 100,
    notes: lease.notes ?? undefined,
  };
}

interface LeaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Provided when editing; omitted when creating. */
  lease?: Lease;
}

export function LeaseFormDialog({ open, onOpenChange, lease }: LeaseFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(lease);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<LeaseFormInput>({
    resolver: zodResolver(leaseFormSchema),
    defaultValues: toFormValues(lease),
  });

  useEffect(() => {
    if (open) reset(toFormValues(lease));
  }, [open, lease, reset]);

  const options = useQuery({
    queryKey: leaseKeys.options(),
    queryFn: () => api.listLeaseFormOptions(),
    enabled: open,
  });

  const save = useMutation({
    mutationFn: (input: LeaseFormInput) =>
      lease
        ? api.updateLease(lease.id, leaseFormToUpdateRequest(input))
        : api.createLease(leaseFormToCreateRequest(input)),
    onSuccess: async () => {
      toast.success(isEditing ? 'Lease updated' : 'Lease created');
      await queryClient.invalidateQueries({ queryKey: leaseKeys.all });
      // A lease can flip a unit's occupancy, so refresh properties too.
      await queryClient.invalidateQueries({ queryKey: ['properties'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Unable to save the lease');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit lease' : 'Create a lease'}</DialogTitle>
          <DialogDescription>
            Assign a tenant to a unit and set the term, rent, and status. A unit can hold only one
            active lease at a time.
          </DialogDescription>
        </DialogHeader>

        <form
          id="lease-form"
          onSubmit={handleSubmit((input) => save.mutate(input))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor="lease-unit">Unit</Label>
            <Controller
              name="unitId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isEditing}>
                  <SelectTrigger id="lease-unit">
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.data?.units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.propertyName} — {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {isEditing && (
              <p className="text-xs text-muted-foreground">The unit cannot be changed.</p>
            )}
            {errors.unitId && <p className="text-sm text-destructive">{errors.unitId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lease-tenant">Tenant</Label>
            <Controller
              name="tenantId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="lease-tenant">
                    <SelectValue placeholder="Select a tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.data?.tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tenantId && (
              <p className="text-sm text-destructive">{errors.tenantId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lease-start">Start date</Label>
            <Input id="lease-start" type="date" {...register('startDate')} />
            {errors.startDate && (
              <p className="text-sm text-destructive">{errors.startDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lease-end">End date</Label>
            <Input id="lease-end" type="date" {...register('endDate')} />
            {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lease-rent">Monthly rent (USD)</Label>
            <Input id="lease-rent" inputMode="decimal" {...register('rent')} />
            {errors.rent && <p className="text-sm text-destructive">{errors.rent.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lease-deposit">Security deposit (USD)</Label>
            <Input id="lease-deposit" inputMode="decimal" {...register('deposit')} />
            {errors.deposit && <p className="text-sm text-destructive">{errors.deposit.message}</p>}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="lease-status">Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="lease-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEASE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {LEASE_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Marking a lease active sets its unit to occupied.
            </p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="lease-notes">Notes (optional)</Label>
            <Textarea id="lease-notes" rows={3} {...register('notes')} />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="lease-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isEditing ? 'Save changes' : 'Create lease'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
