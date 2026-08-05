'use client';

import { ApiError } from '@propertyflow/api-client';
import {
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_PRIORITY_LABELS,
  WORK_ORDER_STATUS_LABELS,
  type MaintenancePriority,
} from '@propertyflow/constants';
import type { WorkOrder } from '@propertyflow/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, ImagePlus, Loader2, PlayCircle, Plus, Search } from 'lucide-react';
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

function WorkOrdersContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [completing, setCompleting] = useState<WorkOrder | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const orders = useQuery({
    queryKey: workOrderKeys.list({ search: search || undefined }),
    queryFn: () => api.listWorkOrders({ search: search || undefined }),
  });
  const start = useMutation({
    mutationFn: (id: string) => api.updateWorkOrder(id, { status: 'IN_PROGRESS' }),
    onSuccess: async () => {
      toast.success('Job started');
      await queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Unable to update work order'),
  });

  return (
    <DashboardShell title="Work Orders">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Assigned work</h2>
            <p className="mt-1 text-muted-foreground">
              Jobs assigned to you. Start a job, then mark it complete with photo proof.
            </p>
          </div>
          <Button onClick={() => setReportOpen(true)}>
            <Plus className="h-4 w-4" /> Report an issue
          </Button>
        </div>
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            ['Assigned', orders.data?.summary.assignedCount],
            ['In progress', orders.data?.summary.inProgressCount],
            ['Completed', orders.data?.summary.completedCount],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{label}</CardDescription>
                <ClipboardCheck className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <CardTitle>{value ?? '—'}</CardTitle>
              </CardContent>
            </Card>
          ))}
        </section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search work orders..."
            className="pl-9"
          />
        </div>
        <div className="grid gap-4">
          {orders.data?.workOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {order.referenceCode} · {order.request.title}
                      </p>
                      <Badge variant={order.status === 'COMPLETED' ? 'success' : 'secondary'}>
                        {WORK_ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {order.request.unit.propertyName} · {order.request.unit.label} ·{' '}
                      {order.request.tenant.fullName}
                    </p>
                    {order.completionNotes && (
                      <p className="mt-2 text-sm">
                        <span className="font-medium">Notes: </span>
                        {order.completionNotes}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {order.status === 'ASSIGNED' && (
                      <Button
                        size="sm"
                        disabled={start.isPending}
                        onClick={() => start.mutate(order.id)}
                      >
                        <PlayCircle className="h-4 w-4" /> Start job
                      </Button>
                    )}
                    {order.status === 'IN_PROGRESS' && (
                      <Button size="sm" onClick={() => setCompleting(order)}>
                        <ImagePlus className="h-4 w-4" /> Mark complete
                      </Button>
                    )}
                    {order.status === 'COMPLETED' && (
                      <span className="text-xs text-muted-foreground">Awaiting verification</span>
                    )}
                  </div>
                </div>
                {order.imageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {order.imageUrls.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        <img
                          src={url}
                          alt="Completion proof"
                          className="h-20 w-20 rounded-lg border object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {!orders.isLoading && !orders.data?.workOrders.length && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No assigned work orders.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <CompleteDialog order={completing} onOpenChange={(open) => !open && setCompleting(null)} />
      <ReportIssueDialog open={reportOpen} onOpenChange={setReportOpen} />
    </DashboardShell>
  );
}

/**
 * Lets a technician log a new issue they discovered on site. The request is
 * created as "awaiting approval" — a manager or admin still approves it before
 * it can be assigned.
 */
function ReportIssueDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [leaseId, setLeaseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('NORMAL');

  const options = useQuery({
    queryKey: maintenanceKeys.options(),
    queryFn: () => api.listMaintenanceOptions(),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () => api.createMaintenanceRequest({ leaseId, title, description, priority }),
    onSuccess: async () => {
      toast.success('Issue reported — sent to a manager for approval');
      await queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
      setLeaseId('');
      setTitle('');
      setDescription('');
      setPriority('NORMAL');
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Unable to report issue'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report an issue</DialogTitle>
          <DialogDescription>
            Log something you found on site. A manager approves it before it becomes a job.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Unit</Label>
            <Select value={leaseId} onValueChange={setLeaseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select the affected unit" />
              </SelectTrigger>
              <SelectContent>
                {(options.data?.leases ?? []).map((lease) => (
                  <SelectItem key={lease.id} value={lease.id}>
                    {lease.propertyName} · {lease.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Issue</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as MaintenancePriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_PRIORITIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {MAINTENANCE_PRIORITY_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending || !leaseId || title.length < 3 || description.length < 10}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompleteDialog({
  order,
  onOpenChange,
}: {
  order: WorkOrder | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [imagesText, setImagesText] = useState('');

  const complete = useMutation({
    mutationFn: () => {
      const imageUrls = imagesText
        .split(/\s+/)
        .map((value) => value.trim())
        .filter(Boolean);
      return api.updateWorkOrder(order!.id, {
        status: 'COMPLETED',
        completionNotes: notes.trim() || undefined,
        imageUrls,
      });
    },
    onSuccess: async () => {
      toast.success('Marked complete — sent for verification');
      await queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
      setNotes('');
      setImagesText('');
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Unable to complete work order'),
  });

  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete work order</DialogTitle>
          <DialogDescription>
            {order?.referenceCode} · {order?.request.title}. Add a note and photo links as proof;
            a manager verifies before it closes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="completion-notes">Completion notes</Label>
            <Textarea
              id="completion-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What did you fix?"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="completion-images">Photo links</Label>
            <Textarea
              id="completion-images"
              rows={3}
              value={imagesText}
              onChange={(event) => setImagesText(event.target.value)}
              placeholder="Paste image URLs, one per line"
            />
            <p className="text-xs text-muted-foreground">
              Up to 8 image URLs, separated by spaces or new lines.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => complete.mutate()} disabled={complete.isPending}>
            {complete.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Mark complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WorkOrdersPage() {
  return (
    <RequireAuth>
      <RequireAbility action="access" subject="work_orders">
        <WorkOrdersContent />
      </RequireAbility>
    </RequireAuth>
  );
}
