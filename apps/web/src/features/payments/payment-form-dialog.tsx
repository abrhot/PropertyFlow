'use client';

import { ApiError } from '@propertyflow/api-client';
import { PAYMENT_STATUSES, PAYMENT_STATUS_LABELS } from '@propertyflow/constants';
import {
  paymentFormSchema,
  paymentFormToCreateRequest,
  type PaymentFormInput,
} from '@propertyflow/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
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
import { paymentKeys } from './queries';

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentFormDialog({ open, onOpenChange }: PaymentFormDialogProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormInput>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      leaseId: '',
      amount: 0,
      dueDate: new Date().toISOString().slice(0, 10),
      description: 'Monthly rent',
      status: 'PENDING',
      method: '',
      reference: '',
    },
  });
  const options = useQuery({
    queryKey: paymentKeys.options(),
    queryFn: () => api.listPaymentFormOptions(),
    enabled: open,
  });
  const save = useMutation({
    mutationFn: (input: PaymentFormInput) => api.createPayment(paymentFormToCreateRequest(input)),
    onSuccess: async () => {
      toast.success('Payment added to the ledger');
      await queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Unable to create payment'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            Add a rent charge or an offline payment against an active lease.
          </DialogDescription>
        </DialogHeader>
        <form
          id="payment-form"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={handleSubmit((input) => save.mutate(input))}
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="payment-lease">Lease</Label>
            <Controller
              name="leaseId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    const lease = options.data?.leases.find((item) => item.id === value);
                    if (lease) {
                      setValue('amount', lease.rentCents / 100);
                      setValue('description', `Rent · ${lease.propertyName} ${lease.label}`);
                    }
                  }}
                >
                  <SelectTrigger id="payment-lease">
                    <SelectValue placeholder="Select an active lease" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.data?.leases.map((lease) => (
                      <SelectItem key={lease.id} value={lease.id}>
                        {lease.tenant.fullName} — {lease.propertyName} {lease.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.leaseId && <p className="text-sm text-destructive">{errors.leaseId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Amount (USD)</Label>
            <Input id="payment-amount" inputMode="decimal" {...register('amount')} />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-due">Due date</Label>
            <Input id="payment-due" type="date" {...register('dueDate')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="payment-description">Description</Label>
            <Input id="payment-description" {...register('description')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-status">Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="payment-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {PAYMENT_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-method">Method (for paid entries)</Label>
            <Input id="payment-method" placeholder="ACH, card, cash..." {...register('method')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="payment-reference">Reference (optional)</Label>
            <Input id="payment-reference" {...register('reference')} />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="payment-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
