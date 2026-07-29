'use client';

import { ApiError } from '@propertyflow/api-client';
import { UNIT_STATUSES, UNIT_STATUS_LABELS } from '@propertyflow/constants';
import type { Unit } from '@propertyflow/types';
import { unitFormSchema, unitFormToRequest, type UnitFormInput } from '@propertyflow/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { api } from '@/lib/api';
import { propertyKeys } from './queries';

const BLANK: UnitFormInput = {
  label: '',
  bedrooms: 1,
  bathrooms: 1,
  squareFeet: undefined,
  marketRent: 0,
  status: 'VACANT',
};

function toFormValues(unit?: Unit): UnitFormInput {
  if (!unit) return BLANK;
  return {
    label: unit.label,
    bedrooms: unit.bedrooms,
    bathrooms: unit.bathrooms,
    squareFeet: unit.squareFeet ?? undefined,
    marketRent: unit.marketRentCents / 100,
    status: unit.status,
  };
}

interface UnitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  /** Provided when editing; omitted when adding. */
  unit?: Unit;
}

export function UnitFormDialog({ open, onOpenChange, propertyId, unit }: UnitFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(unit);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<UnitFormInput>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: toFormValues(unit),
  });

  useEffect(() => {
    if (open) reset(toFormValues(unit));
  }, [open, unit, reset]);

  const save = useMutation({
    mutationFn: (input: UnitFormInput) => {
      const request = unitFormToRequest(input);
      return unit
        ? api.updateUnit(propertyId, unit.id, request)
        : api.createUnit(propertyId, request);
    },
    onSuccess: async (saved) => {
      toast.success(isEditing ? `Unit ${saved.label} was updated` : `Unit ${saved.label} was added`);
      await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Unable to save the unit');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit unit ${unit?.label}` : 'Add a unit'}</DialogTitle>
          <DialogDescription>
            Units carry the rent and occupancy figures shown across the portfolio.
          </DialogDescription>
        </DialogHeader>

        <form
          id="unit-form"
          onSubmit={handleSubmit((input) => save.mutate(input))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="unit-label">Unit label</Label>
            <Input id="unit-label" placeholder="2B" {...register('label')} />
            {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit-bedrooms">Bedrooms</Label>
            <Input id="unit-bedrooms" inputMode="numeric" {...register('bedrooms')} />
            {errors.bedrooms && (
              <p className="text-sm text-destructive">{errors.bedrooms.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit-bathrooms">Bathrooms</Label>
            <Input id="unit-bathrooms" inputMode="decimal" step="0.5" {...register('bathrooms')} />
            {errors.bathrooms && (
              <p className="text-sm text-destructive">{errors.bathrooms.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit-size">Square feet (optional)</Label>
            <Input id="unit-size" inputMode="numeric" {...register('squareFeet')} />
            {errors.squareFeet && (
              <p className="text-sm text-destructive">{errors.squareFeet.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit-rent">Market rent (USD / month)</Label>
            <Input id="unit-rent" inputMode="decimal" {...register('marketRent')} />
            {errors.marketRent && (
              <p className="text-sm text-destructive">{errors.marketRent.message}</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="unit-status">Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="unit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {UNIT_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="unit-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isEditing ? 'Save changes' : 'Add unit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
