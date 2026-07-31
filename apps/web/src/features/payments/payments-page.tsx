'use client';

import { ApiError } from '@propertyflow/api-client';
import { resource } from '@propertyflow/auth';
import { PAYMENT_STATUSES, PAYMENT_STATUS_LABELS } from '@propertyflow/constants';
import type { Payment, PaymentStatus } from '@propertyflow/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleDollarSign, Loader2, Plus, ReceiptText, Search, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PaymentFormDialog } from './payment-form-dialog';
import { paymentKeys } from './queries';

const ALL_STATUSES = 'all';

function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function statusVariant(status: PaymentStatus): 'success' | 'warning' | 'secondary' | 'outline' {
  if (status === 'PAID') return 'success';
  if (status === 'LATE' || status === 'FAILED') return 'warning';
  if (status === 'PENDING') return 'secondary';
  return 'outline';
}

function PaymentsContent({ tenantView }: { tenantView: boolean }) {
  const ability = useAbility();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(ALL_STATUSES);
  const [formOpen, setFormOpen] = useState(false);
  const params = {
    search: useDebounced(search) || undefined,
    status: status === ALL_STATUSES ? undefined : (status as PaymentStatus),
  };
  const payments = useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => api.listPayments(params),
  });
  const pay = useMutation({
    mutationFn: (id: string) => api.payPayment(id),
    onSuccess: async () => {
      toast.success('Payment completed');
      await queryClient.invalidateQueries({ queryKey: paymentKeys.all });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Unable to complete payment'),
  });

  const canCreate = ability.can('create', 'Payment');
  const rows = payments.data?.payments ?? [];
  const summary = payments.data?.summary;
  const canPay = (payment: Payment) =>
    payment.status !== 'PAID' &&
    payment.status !== 'REFUNDED' &&
    ability.can(
      'pay',
      resource('Payment', {
        id: payment.id,
        organizationId: payment.organizationId,
        tenantId: payment.tenantId,
        ownerId: payment.ownerId ?? undefined,
      }),
    );

  return (
    <DashboardShell title={tenantView ? 'Pay Rent' : 'Payments'}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {tenantView ? 'Rent and payment history' : 'Payment ledger'}
            </h2>
            <p className="mt-1 text-muted-foreground">
              {tenantView
                ? 'Review charges, receipts, and upcoming rent.'
                : 'Track rent charges, collections, and outstanding balances.'}
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Record payment
            </Button>
          )}
        </div>

        <section className="grid gap-4 sm:grid-cols-3" aria-label="Payment summary">
          <SummaryCard
            label="Collected"
            value={summary ? formatCents(summary.collectedCents) : null}
            detail="Paid charges in this view"
            icon={CircleDollarSign}
          />
          <SummaryCard
            label="Outstanding"
            value={summary ? formatCents(summary.outstandingCents) : null}
            detail="Pending, late, or failed"
            icon={ReceiptText}
          />
          <SummaryCard
            label="Collection rate"
            value={summary ? `${summary.collectionRate}%` : null}
            detail={`${summary?.paymentCount ?? 0} ledger entries`}
            icon={TrendingUp}
          />
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tenant, property, reference..."
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
              {PAYMENT_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {PAYMENT_STATUS_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{tenantView ? 'Your payments' : 'Ledger'}</CardTitle>
            <CardDescription>All entries are scoped by your role and organization.</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : payments.isError ? (
              <div className="py-10 text-center">
                <p className="font-medium">Unable to load payments</p>
                <Button variant="outline" className="mt-3" onClick={() => payments.refetch()}>
                  Try again
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      {!tenantView && <TableHead>Tenant</TableHead>}
                      <TableHead>Property / Unit</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <p className="font-medium">{payment.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.reference ?? 'No reference'}
                          </p>
                        </TableCell>
                        {!tenantView && <TableCell>{payment.tenant.fullName}</TableCell>}
                        <TableCell>
                          {payment.unit.propertyName} · {payment.unit.label}
                        </TableCell>
                        <TableCell>{new Date(payment.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(payment.status)}>
                            {PAYMENT_STATUS_LABELS[payment.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCents(payment.amountCents)}
                        </TableCell>
                        <TableCell className="text-right">
                          {canPay(payment) ? (
                            <Button
                              size="sm"
                              onClick={() => pay.mutate(payment.id)}
                              disabled={pay.isPending}
                            >
                              {pay.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                              Pay now
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!rows.length && (
                      <TableRow>
                        <TableCell colSpan={tenantView ? 6 : 7} className="h-28 text-center">
                          No payments match this view.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <PaymentFormDialog open={formOpen} onOpenChange={setFormOpen} />
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
  icon: typeof CircleDollarSign;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        {value ? <p className="text-2xl font-semibold">{value}</p> : <Skeleton className="h-8 w-24" />}
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function PaymentsPage({ tenantView = false }: { tenantView?: boolean }) {
  return (
    <RequireAuth>
      <RequireAbility action="access" subject={tenantView ? 'my_payments' : 'payments'}>
        <PaymentsContent tenantView={tenantView} />
      </RequireAbility>
    </RequireAuth>
  );
}
