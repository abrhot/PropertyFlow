'use client';

import { ApiError } from '@propertyflow/api-client';
import {
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_STATUS_LABELS,
  type MaintenancePriority,
} from '@propertyflow/constants';
import type { MaintenanceRequest } from '@propertyflow/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ClipboardList, Loader2, Plus, Search, Wrench } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { RequireAbility } from '@/features/auth/require-ability';
import { RequireAuth } from '@/features/auth/require-auth';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { api } from '@/lib/api';
import { maintenanceKeys, workOrderKeys } from './queries';

function MaintenanceContent({ tenantView }: { tenantView: boolean }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [assigning, setAssigning] = useState<MaintenanceRequest | null>(null);
  const requests = useQuery({
    queryKey: maintenanceKeys.list({ search: search || undefined }),
    queryFn: () => api.listMaintenanceRequests({ search: search || undefined }),
  });
  const options = useQuery({
    queryKey: maintenanceKeys.options(),
    queryFn: () => api.listMaintenanceOptions(),
    enabled: createOpen || Boolean(assigning),
  });
  const summary = requests.data?.summary;

  return (
    <DashboardShell title={tenantView ? 'My Requests' : 'Maintenance'}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {tenantView ? 'Maintenance requests' : 'Maintenance queue'}
            </h2>
            <p className="mt-1 text-muted-foreground">
              {tenantView
                ? 'Submit an issue and follow its progress.'
                : 'Triage resident issues and assign field work.'}
            </p>
          </div>
          {tenantView && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Submit request
            </Button>
          )}
        </div>
        <section className="grid gap-4 sm:grid-cols-3">
          <Metric label="Open" value={summary?.openCount} icon={ClipboardList} />
          <Metric label="In progress" value={summary?.inProgressCount} icon={Wrench} />
          <Metric label="Urgent" value={summary?.urgentCount} icon={AlertTriangle} />
        </section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search requests..."
            className="pl-9"
          />
        </div>
        <div className="grid gap-4">
          {requests.data?.requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{request.title}</p>
                    <Badge variant={request.priority === 'URGENT' ? 'warning' : 'secondary'}>
                      {MAINTENANCE_PRIORITY_LABELS[request.priority]}
                    </Badge>
                    <Badge variant={request.status === 'COMPLETED' ? 'success' : 'outline'}>
                      {MAINTENANCE_STATUS_LABELS[request.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {request.unit.propertyName} · {request.unit.label}
                    {!tenantView ? ` · ${request.tenant.fullName}` : ''}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm">{request.description}</p>
                </div>
                {!tenantView && request.status === 'SUBMITTED' && (
                  <Button variant="outline" onClick={() => setAssigning(request)}>
                    Assign work
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {!requests.isLoading && !requests.data?.requests.length && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No maintenance requests found.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <RequestDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        leases={options.data?.leases ?? []}
      />
      <AssignDialog
        request={assigning}
        onOpenChange={(open) => !open && setAssigning(null)}
        assignees={options.data?.assignees ?? []}
      />
    </DashboardShell>
  );
}

function RequestDialog({
  open,
  onOpenChange,
  leases,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leases: Awaited<ReturnType<typeof api.listMaintenanceOptions>>['leases'];
}) {
  const queryClient = useQueryClient();
  const [leaseId, setLeaseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('NORMAL');
  const create = useMutation({
    mutationFn: () =>
      api.createMaintenanceRequest({ leaseId, title, description, priority }),
    onSuccess: async () => {
      toast.success('Maintenance request submitted');
      await queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Unable to submit request'),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit maintenance request</DialogTitle>
          <DialogDescription>Describe the issue clearly so the team can respond quickly.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Unit</Label>
            <Select value={leaseId} onValueChange={setLeaseId}>
              <SelectTrigger><SelectValue placeholder="Select your unit" /></SelectTrigger>
              <SelectContent>
                {leases.map((lease) => (
                  <SelectItem key={lease.id} value={lease.id}>
                    {lease.propertyName} · {lease.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Issue</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as MaintenancePriority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MAINTENANCE_PRIORITIES.map((item) => <SelectItem key={item} value={item}>{MAINTENANCE_PRIORITY_LABELS[item]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !leaseId || title.length < 3 || description.length < 10}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({
  request,
  onOpenChange,
  assignees,
}: {
  request: MaintenanceRequest | null;
  onOpenChange: (open: boolean) => void;
  assignees: Awaited<ReturnType<typeof api.listMaintenanceOptions>>['assignees'];
}) {
  const queryClient = useQueryClient();
  const [assigneeId, setAssigneeId] = useState('');
  const assign = useMutation({
    mutationFn: () => api.assignWorkOrder({ maintenanceRequestId: request!.id, assigneeId }),
    onSuccess: async () => {
      toast.success('Work order assigned');
      await queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
      await queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
      onOpenChange(false);
    },
  });
  return (
    <Dialog open={Boolean(request)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign work order</DialogTitle><DialogDescription>{request?.title}</DialogDescription></DialogHeader>
        <Select value={assigneeId} onValueChange={setAssigneeId}>
          <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
          <SelectContent>{assignees.map((item) => <SelectItem key={item.id} value={item.id}>{item.fullName}</SelectItem>)}</SelectContent>
        </Select>
        <DialogFooter><Button onClick={() => assign.mutate()} disabled={!assigneeId || assign.isPending}>Assign</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value?: number; icon: typeof Wrench }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardDescription>{label}</CardDescription><Icon className="h-4 w-4 text-primary" /></CardHeader><CardContent><CardTitle>{value ?? '—'}</CardTitle></CardContent></Card>;
}

export function MaintenancePage({ tenantView = false }: { tenantView?: boolean }) {
  return <RequireAuth><RequireAbility action="access" subject={tenantView ? 'my_requests' : 'maintenance'}><MaintenanceContent tenantView={tenantView} /></RequireAbility></RequireAuth>;
}
