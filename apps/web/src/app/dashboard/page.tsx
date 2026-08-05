'use client';

import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@propertyflow/constants';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccessibleSections } from '@/features/auth/ability-context';
import { useAuth } from '@/features/auth/auth-context';
import { RequireAuth } from '@/features/auth/require-auth';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { SECTION_META } from '@/features/dashboard/sections';
import { RangeToggle, rangeDays, TrendChart, type RangeKey } from '@/features/dashboard/trend-chart';
import { api } from '@/lib/api';
import type { DashboardMetric } from '@propertyflow/types';

const dayFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function DashboardContent() {
  const { user } = useAuth();
  const accessibleSections = useAccessibleSections();
  const [range, setRange] = useState<RangeKey>('3m');

  const summary = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.getDashboardSummary(),
  });

  const trendData = useMemo(() => {
    const points = summary.data?.trend.points ?? [];
    return points.slice(-rangeDays(range)).map((point) => ({
      x: point.date,
      primary: point.primary,
      secondary: point.secondary,
    }));
  }, [summary.data, range]);

  if (!user) return null;
  const firstName = user.fullName.split(' ')[0];
  const sections = accessibleSections.filter((section) => section !== 'dashboard');
  const metrics = summary.data?.metrics ?? [];

  return (
    <DashboardShell title="Dashboard">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-semibold tracking-tight">Welcome, {firstName}</h2>
            <Badge>{ROLE_LABELS[user.role]}</Badge>
          </div>
          <p className="max-w-2xl text-muted-foreground">{ROLE_DESCRIPTIONS[user.role]}</p>
        </div>

        <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.length
            ? metrics.map((metric) => <MetricCard key={metric.key} metric={metric} />)
            : Array.from({ length: 4 }).map((_, index) => <MetricSkeleton key={index} />)}
        </section>

        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-lg">{summary.data?.trend.title ?? 'Overview'}</CardTitle>
              <CardDescription>{summary.data?.trend.subtitle ?? 'Loading…'}</CardDescription>
            </div>
            <RangeToggle value={range} onChange={setRange} />
          </CardHeader>
          <CardContent>
            <TrendChart
              data={trendData}
              primaryLabel={summary.data?.trend.primaryLabel ?? 'Primary'}
              secondaryLabel={summary.data?.trend.secondaryLabel ?? 'Secondary'}
              xTickFormatter={(value) => dayFormatter.format(new Date(value))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick access</CardTitle>
            <CardDescription>Jump straight into the areas you use most.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((key) => {
                const item = SECTION_META[key];
                return (
                  <Link
                    key={key}
                    href={item.path}
                    className="group flex items-center gap-3 rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{item.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary" />
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
  const trendClass =
    metric.trend === 'up'
      ? 'text-success'
      : metric.trend === 'down'
        ? 'text-warning'
        : 'text-muted-foreground';
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{metric.label}</CardDescription>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${trendClass}`}>
            <TrendIcon className="h-3 w-3" aria-hidden="true" />
            {metric.delta}
          </span>
        </div>
        <CardTitle className="text-3xl">{metric.value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{metric.hint}</p>
      </CardContent>
    </Card>
  );
}

function MetricSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-8 w-32 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
