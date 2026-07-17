'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/auth-context';
import { RequireAuth } from '@/features/auth/require-auth';

function DashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {user?.fullName}.</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Sign out
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <CardDescription>Authenticated session details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Name" value={user?.fullName} />
          <Row label="Email" value={user?.email} />
          <Row label="Role" value={user?.role} />
          <Row label="Organization ID" value={user?.organizationId ?? '—'} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
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
