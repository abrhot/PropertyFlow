'use client';

import {
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Home,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/features/auth/auth-context';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { RequireAuth } from '@/features/auth/require-auth';

const STATS: { label: string; value: string; hint: string; icon: LucideIcon }[] = [
  { label: 'Properties', value: '0', hint: 'Add your first property', icon: Building2 },
  { label: 'Units', value: '0', hint: 'Across all properties', icon: Home },
  { label: 'Occupancy', value: '—', hint: 'Occupied vs. vacant units', icon: TrendingUp },
  { label: 'Rent collected', value: '$0', hint: 'This month', icon: CircleDollarSign },
];

const CHECKLIST = [
  { label: 'Create your account', done: true },
  { label: 'Add your first property', done: false },
  { label: 'Add units and invite tenants', done: false },
  { label: 'Set up rent collection', done: false },
];

function DashboardContent() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';

  return (
    <DashboardShell title="Dashboard">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome back, {firstName} 👋</h2>
          <p className="text-muted-foreground">
            Here&apos;s an overview of your portfolio. Data modules arrive in the next phases.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Getting started */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Getting started</CardTitle>
              <CardDescription>Finish setting up your organization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {CHECKLIST.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <CheckCircle2
                    className={
                      item.done ? 'h-5 w-5 text-primary' : 'h-5 w-5 text-muted-foreground/40'
                    }
                  />
                  <span
                    className={
                      item.done ? 'text-sm text-muted-foreground line-through' : 'text-sm'
                    }
                  >
                    {item.label}
                  </span>
                  {!item.done && (
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      Soon
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Account */}
          <Card>
            <CardHeader>
              <CardTitle>Your account</CardTitle>
              <CardDescription>Authenticated session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Name" value={user?.fullName} />
              <Row label="Email" value={user?.email} />
              <Row
                label="Role"
                value={
                  <Badge variant="secondary">{user?.role?.replace(/_/g, ' ')}</Badge>
                }
              />
              <div className="flex items-center gap-2 pt-1 text-muted-foreground">
                <Wrench className="h-3.5 w-3.5" />
                <span className="text-xs">Org ID: {user?.organizationId ?? '—'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}

function Row({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
