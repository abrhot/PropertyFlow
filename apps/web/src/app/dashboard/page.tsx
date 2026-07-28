'use client';

import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@propertyflow/constants';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccessibleSections } from '@/features/auth/ability-context';
import { useAuth } from '@/features/auth/auth-context';
import { RequireAuth } from '@/features/auth/require-auth';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { SECTION_META } from '@/features/dashboard/sections';

function DashboardContent() {
  const { user } = useAuth();
  const accessibleSections = useAccessibleSections();
  if (!user) return null;

  const firstName = user.fullName.split(' ')[0];
  const sections = accessibleSections.filter((section) => section !== 'dashboard');

  return (
    <DashboardShell title="Dashboard">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">Welcome, {firstName}</h2>
            <Badge>{ROLE_LABELS[user.role]}</Badge>
          </div>
          <p className="max-w-2xl text-muted-foreground">{ROLE_DESCRIPTIONS[user.role]}</p>
        </div>

        {/* Role-specific workspace: the areas this role can access */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your workspace
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((key) => {
              const item = SECTION_META[key];
              return (
                <Link key={key} href={item.path} className="group rounded-xl focus:outline-none">
                  <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <item.icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <Badge variant="outline">Open</Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="font-semibold">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Account / session */}
        <Card>
          <CardHeader>
            <CardTitle>Your session</CardTitle>
            <CardDescription>What you&apos;re signed in as right now.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Row label="Name" value={user.fullName} />
            <Row label="Email" value={user.email} />
            <Row label="Role" value={<Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>} />
            <Row label="Organization ID" value={user.organizationId ?? 'Platform (no org)'} />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function Row({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b py-2 last:border-0 sm:last:border-b">
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
