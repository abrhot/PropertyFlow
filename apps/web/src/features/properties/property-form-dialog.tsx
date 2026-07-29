'use client';

import { ApiError } from '@propertyflow/api-client';
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS } from '@propertyflow/constants';
import type { Property } from '@propertyflow/types';
import { createPropertySchema, type CreatePropertyInput } from '@propertyflow/validation';
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
import { propertyKeys } from './queries';

/** Radix Select forbids empty item values, so "no owner" needs a sentinel. */
const NO_OWNER = 'none';

const BLANK: CreatePropertyInput = {
  name: '',
  type: 'APARTMENT',
  addressLine1: '',
  addressLine2: undefined,
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  yearBuilt: undefined,
  notes: undefined,
  ownerId: undefined,
};

function toFormValues(property?: Property): CreatePropertyInput {
  if (!property) return BLANK;
  return {
    name: property.name,
    type: property.type,
    addressLine1: property.addressLine1,
    addressLine2: property.addressLine2 ?? undefined,
    city: property.city,
    state: property.state,
    postalCode: property.postalCode,
    country: property.country,
    yearBuilt: property.yearBuilt ?? undefined,
    notes: property.notes ?? undefined,
    ownerId: property.ownerId ?? undefined,
  };
}

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Provided when editing; omitted when creating. */
  property?: Property;
}

export function PropertyFormDialog({ open, onOpenChange, property }: PropertyFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(property);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreatePropertyInput>({
    resolver: zodResolver(createPropertySchema),
    defaultValues: toFormValues(property),
  });

  useEffect(() => {
    if (open) reset(toFormValues(property));
  }, [open, property, reset]);

  const owners = useQuery({
    queryKey: propertyKeys.owners(),
    queryFn: () => api.listPropertyOwners(),
    enabled: open,
  });

  const save = useMutation({
    mutationFn: (input: CreatePropertyInput) =>
      property ? api.updateProperty(property.id, input) : api.createProperty(input),
    onSuccess: async (saved) => {
      toast.success(isEditing ? `${saved.name} was updated` : `${saved.name} was added`);
      await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Unable to save the property');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit property' : 'Add a property'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the address, ownership, and details for this property.'
              : 'Create a building in your portfolio, then add its units.'}
          </DialogDescription>
        </DialogHeader>

        <form
          id="property-form"
          onSubmit={handleSubmit((input) => save.mutate(input))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="property-name">Property name</Label>
            <Input id="property-name" placeholder="Maple Court" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="property-type">Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="property-type">
                    <SelectValue placeholder="Choose a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {PROPERTY_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="property-owner">Owner</Label>
            <Controller
              name="ownerId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || NO_OWNER}
                  onValueChange={(value) => field.onChange(value === NO_OWNER ? '' : value)}
                >
                  <SelectTrigger id="property-owner">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_OWNER}>Unassigned</SelectItem>
                    {owners.data?.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Owners only ever see the properties assigned to them.
            </p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="property-address1">Street address</Label>
            <Input
              id="property-address1"
              placeholder="120 Maple Street"
              {...register('addressLine1')}
            />
            {errors.addressLine1 && (
              <p className="text-sm text-destructive">{errors.addressLine1.message}</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="property-address2">Suite, floor (optional)</Label>
            <Input id="property-address2" {...register('addressLine2')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="property-city">City</Label>
            <Input id="property-city" {...register('city')} />
            {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="property-state">State / region</Label>
            <Input id="property-state" {...register('state')} />
            {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="property-postal">Postal code</Label>
            <Input id="property-postal" {...register('postalCode')} />
            {errors.postalCode && (
              <p className="text-sm text-destructive">{errors.postalCode.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="property-country">Country code</Label>
            <Input id="property-country" maxLength={2} {...register('country')} />
            {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="property-year">Year built (optional)</Label>
            <Input id="property-year" inputMode="numeric" {...register('yearBuilt')} />
            {errors.yearBuilt && (
              <p className="text-sm text-destructive">{errors.yearBuilt.message}</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="property-notes">Notes (optional)</Label>
            <Textarea id="property-notes" rows={3} {...register('notes')} />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="property-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isEditing ? 'Save changes' : 'Add property'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
