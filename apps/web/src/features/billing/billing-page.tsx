'use client';

import { SUBSCRIPTION_TIER_LABELS } from '@propertyflow/constants';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { CircleDollarSign, TrendingUp, Users, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
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
import { formatCents } from '@/features/properties/format';
import { api } from '@/lib/api';

const revenueConfig = {
  revenue: { label: 'Monthly revenue', color: 'hsl(var(--primary))' },
} satisfies ChartConfig;

function BillingContent() {
  const billing = useQuery({
    queryKey: ['billing', 'overview'],
    queryFn: () => api.getBillingOverview(),
  });
  const summary = billing.data?.summary;
  const chartData =
    billing.data?.byTier.map((tier) => ({
      tier: SUBSCRIPTION_TIER_LABELS[tier.tier],
      revenue: Math.round(tier.monthlyRevenueCents / 100),
    })) ?? [];

  return (
    <DashboardShell title="Billing">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Platform billing</h2>
          <p className="mt-1 text-muted-foreground">
            Subscription revenue across every organization on the platform.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Monthly recurring revenue"
            value={summary ? formatCents(summary.mrrCents) : undefined}
            icon={CircleDollarSign}
          />
          <Metric label="Active subscriptions" value={summary?.activeSubscriptions} icon={Wallet} />
          <Metric label="Paying customers" value={summary?.payingCount} icon={TrendingUp} />
          <Metric label="On trial" value={summary?.trialCount} icon={Users} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue by plan</CardTitle>
            <CardDescription>Estimated monthly recurring revenue per tier.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueConfig} className="h-[260px] w-full">
              <BarChart data={chartData} margin={{ left: -12, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="tier" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted) / 0.45)' }}
                  content={
                    <ChartTooltipContent
                      valueFormatter={(value) => `$${Number(value).toLocaleString()}`}
                    />
                  }
                />
                <Bar dataKey="revenue" fill={revenueConfig.revenue.color} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscriptions</CardTitle>
            <CardDescription>Per-organization plan, seats, and monthly price.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billing.data?.subscriptions.map((subscription) => (
                  <TableRow key={subscription.organizationId}>
                    <TableCell className="font-medium">{subscription.organizationName}</TableCell>
                    <TableCell>{SUBSCRIPTION_TIER_LABELS[subscription.subscriptionTier]}</TableCell>
                    <TableCell>{subscription.userCount}</TableCell>
                    <TableCell>{formatCents(subscription.monthlyPriceCents)}</TableCell>
                    <TableCell>{new Date(subscription.since).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={subscription.isActive ? 'success' : 'secondary'}>
                        {subscription.isActive ? 'Active' : 'Suspended'}
                      </Badge>
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

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: number | string;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription>{label}</CardDescription>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <CardTitle className="text-2xl">{value ?? '—'}</CardTitle>
      </CardContent>
    </Card>
  );
}

export function BillingPage() {
  return (
    <RequireAuth>
      <RequireAbility action="access" subject="billing">
        <BillingContent />
      </RequireAbility>
    </RequireAuth>
  );
}
