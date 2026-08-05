'use client';

import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, type ApplicationStatus } from '@propertyflow/constants';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Search, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequireAbility } from '@/features/auth/require-ability';
import { RequireAuth } from '@/features/auth/require-auth';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { api } from '@/lib/api';

function ApplicationsContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const applications = useQuery({
    queryKey: ['applications', search],
    queryFn: () => api.listApplications({ search: search || undefined }),
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) => api.updateApplication(id, { status }),
    onSuccess: async () => {
      toast.success('Application status updated');
      await queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
  const summary = applications.data?.summary;
  return (
    <DashboardShell title="Inquiries">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Rent &amp; buy inquiries</h2>
          <p className="mt-1 text-muted-foreground">
            Prospects from the public Available Homes page. Screen, approve, or deny each request.
          </p>
        </div>
        <section className="grid gap-4 sm:grid-cols-3">
          <Metric label="Inquiries" value={summary?.applicationCount} icon={ClipboardList} />
          <Metric label="In screening" value={summary?.screeningCount} icon={Users} />
          <Metric
            label="Approval rate"
            value={summary ? `${summary.approvalRate}%` : undefined}
            icon={ShieldCheck}
          />
        </section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or property..."
            className="pl-9"
          />
        </div>
        <div className="grid gap-4">
          {applications.data?.applications.map((application) => (
            <Card key={application.id}>
              <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{application.applicantName}</p>
                    <Badge variant="secondary">{APPLICATION_STATUS_LABELS[application.status]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {application.applicantEmail}
                    {application.applicantPhone ? ` · ${application.applicantPhone}` : ''}
                    {' · '}
                    {application.unit.propertyName} · {application.unit.label}
                  </p>
                  {application.notes && (
                    <p className="mt-2 whitespace-pre-wrap text-sm">{application.notes}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Submitted {new Date(application.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                <Select
                  value={application.status}
                  onValueChange={(status) =>
                    update.mutate({ id: application.id, status: status as ApplicationStatus })
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {APPLICATION_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
          {!applications.isLoading && !applications.data?.applications.length && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No inquiries yet. Prospects appear here after they submit from Available Homes.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value?: string | number; icon: typeof Users }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardDescription>{label}</CardDescription><Icon className="h-4 w-4 text-primary" /></CardHeader><CardContent><CardTitle>{value ?? '—'}</CardTitle></CardContent></Card>;
}
export function ApplicationsPage() {
  return <RequireAuth><RequireAbility action="access" subject="applications"><ApplicationsContent /></RequireAbility></RequireAuth>;
}
