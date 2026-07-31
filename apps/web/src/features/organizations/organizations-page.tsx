'use client';

import { ApiError } from '@propertyflow/api-client';
import {
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_TIER_LABELS,
  type SubscriptionTier,
} from '@propertyflow/constants';
import type { UpdateOrganizationRequest } from '@propertyflow/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, Building2, Search, Users } from 'lucide-react';
import { useState } from 'react';
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

const organizationKeys = {
  all: ['organizations'] as const,
  list: (search: string) => [...organizationKeys.all, 'list', search] as const,
};

function OrganizationsContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const organizations = useQuery({
    queryKey: organizationKeys.list(search),
    queryFn: () => api.listOrganizations({ search: search || undefined }),
  });
  const summary = organizations.data?.summary;

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateOrganizationRequest }) =>
      api.updateOrganization(id, input),
    onSuccess: async () => {
      toast.success('Organization updated');
      await queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Unable to update organization'),
  });

  return (
    <DashboardShell title="Organizations">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Organizations</h2>
          <p className="mt-1 text-muted-foreground">
            Every management company on the platform, with plan and portfolio at a glance.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Organizations" value={summary?.organizationCount} icon={Boxes} />
          <Metric label="Active" value={summary?.activeCount} icon={Building2} />
          <Metric label="Users" value={summary?.userCount} icon={Users} />
          <Metric label="Properties" value={summary?.propertyCount} icon={Building2} />
        </section>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search organizations..."
            className="pl-9"
          />
        </div>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Properties</TableHead>
                  <TableHead>Active leases</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.data?.organizations.map((organization) => (
                  <TableRow key={organization.id}>
                    <TableCell>
                      <p className="font-medium">{organization.name}</p>
                      <p className="text-xs text-muted-foreground">{organization.slug}</p>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={organization.subscriptionTier}
                        onValueChange={(value) =>
                          update.mutate({
                            id: organization.id,
                            input: { subscriptionTier: value as SubscriptionTier },
                          })
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBSCRIPTION_TIERS.map((tier) => (
                            <SelectItem key={tier} value={tier}>
                              {SUBSCRIPTION_TIER_LABELS[tier]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{organization.counts.users}</TableCell>
                    <TableCell>{organization.counts.properties}</TableCell>
                    <TableCell>{organization.counts.activeLeases}</TableCell>
                    <TableCell>
                      <Badge variant={organization.isActive ? 'success' : 'secondary'}>
                        {organization.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({
                            id: organization.id,
                            input: { isActive: !organization.isActive },
                          })
                        }
                      >
                        {organization.isActive ? 'Suspend' : 'Reactivate'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value?: number; icon: typeof Users }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription>{label}</CardDescription>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <CardTitle className="text-3xl">{value ?? '—'}</CardTitle>
      </CardContent>
    </Card>
  );
}

export function OrganizationsPage() {
  return (
    <RequireAuth>
      <RequireAbility action="access" subject="organizations">
        <OrganizationsContent />
      </RequireAbility>
    </RequireAuth>
  );
}
