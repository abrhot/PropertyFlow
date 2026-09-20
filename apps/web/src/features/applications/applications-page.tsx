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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RequireAbility } from '@/features/auth/require-ability';
import { RequireAuth } from '@/features/auth/require-auth';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { api } from '@/lib/api';
import { useDebounced } from '@/lib/use-debounced';

function interestFromNotes(notes: string | null) {
  const match = notes?.match(/Interest:\s*(Rent|Buy)/i);
  return match ? match[1] : '—';
}

function extraNotes(notes: string | null) {
  if (!notes) return null;
  const leftover = notes.replace(/Interest:\s*(Rent|Buy)\s*/i, '').trim();
  return leftover || null;
}

function ApplicationsContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const deferredSearch = useDebounced(search);
  const applications = useQuery({
    queryKey: ['applications', deferredSearch],
    queryFn: () => api.listApplications({ search: deferredSearch || undefined }),
    placeholderData: (previous) => previous,
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      api.updateApplication(id, { status }),
    onSuccess: async () => {
      toast.success('Application status updated');
      await queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
  const summary = applications.data?.summary;
  const rows = applications.data?.applications ?? [];

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
        <Card>
          <CardContent className="pt-6">
            {applications.isLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading inquiries…</p>
            ) : rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No inquiries yet. Prospects appear here after they submit from Available Homes.
              </p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Interest</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="w-[180px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((application) => {
                      const note = extraNotes(application.notes);
                      return (
                        <TableRow key={application.id}>
                          <TableCell>
                            <p className="font-medium">{application.applicantName}</p>
                            {note ? (
                              <p className="mt-0.5 max-w-[220px] truncate text-xs text-muted-foreground">
                                {note}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {application.applicantEmail}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {application.applicantPhone ?? '—'}
                          </TableCell>
                          <TableCell>{application.unit.propertyName}</TableCell>
                          <TableCell>{application.unit.label}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{interestFromNotes(application.notes)}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(application.submittedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={application.status}
                              onValueChange={(status) =>
                                update.mutate({
                                  id: application.id,
                                  status: status as ApplicationStatus,
                                })
                              }
                            >
                              <SelectTrigger className="h-9 w-[160px]">
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
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | number;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription>{label}</CardDescription>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <CardTitle>{value ?? '—'}</CardTitle>
      </CardContent>
    </Card>
  );
}

export function ApplicationsPage() {
  return (
    <RequireAuth>
      <RequireAbility action="access" subject="applications">
        <ApplicationsContent />
      </RequireAbility>
    </RequireAuth>
  );
}
