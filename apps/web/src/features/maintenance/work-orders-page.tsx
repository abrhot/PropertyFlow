'use client';

import { WORK_ORDER_STATUSES, WORK_ORDER_STATUS_LABELS, type WorkOrderStatus } from '@propertyflow/constants';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequireAbility } from '@/features/auth/require-ability';
import { RequireAuth } from '@/features/auth/require-auth';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { api } from '@/lib/api';
import { workOrderKeys } from './queries';

function WorkOrdersContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const orders = useQuery({
    queryKey: workOrderKeys.list({ search: search || undefined }),
    queryFn: () => api.listWorkOrders({ search: search || undefined }),
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkOrderStatus }) =>
      api.updateWorkOrder(id, { status }),
    onSuccess: async () => {
      toast.success('Work order updated');
      await queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
    },
  });
  return (
    <DashboardShell title="Work Orders">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Assigned work</h2>
          <p className="mt-1 text-muted-foreground">Jobs assigned to you, scoped securely by CASL.</p>
        </div>
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            ['Assigned', orders.data?.summary.assignedCount],
            ['In progress', orders.data?.summary.inProgressCount],
            ['Completed', orders.data?.summary.completedCount],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{label}</CardDescription><ClipboardCheck className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent><CardTitle>{value ?? '—'}</CardTitle></CardContent>
            </Card>
          ))}
        </section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search work orders..." className="pl-9" />
        </div>
        <div className="grid gap-4">
          {orders.data?.workOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{order.referenceCode} · {order.request.title}</p>
                    <Badge variant={order.status === 'COMPLETED' ? 'success' : 'secondary'}>{WORK_ORDER_STATUS_LABELS[order.status]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{order.request.unit.propertyName} · {order.request.unit.label} · {order.request.tenant.fullName}</p>
                </div>
                <Select value={order.status} onValueChange={(status) => update.mutate({ id: order.id, status: status as WorkOrderStatus })}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{WORK_ORDER_STATUSES.map((status) => <SelectItem key={status} value={status}>{WORK_ORDER_STATUS_LABELS[status]}</SelectItem>)}</SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
          {!orders.isLoading && !orders.data?.workOrders.length && <Card><CardContent className="py-12 text-center text-muted-foreground">No assigned work orders.</CardContent></Card>}
        </div>
      </div>
    </DashboardShell>
  );
}

export function WorkOrdersPage() {
  return <RequireAuth><RequireAbility action="access" subject="work_orders"><WorkOrdersContent /></RequireAbility></RequireAuth>;
}
