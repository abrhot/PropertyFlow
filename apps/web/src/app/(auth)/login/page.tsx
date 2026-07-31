'use client';

import { ApiError } from '@propertyflow/api-client';
import { ROLE_LABELS, type UserRole } from '@propertyflow/constants';
import { loginSchema, type LoginInput } from '@propertyflow/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/auth-context';

const DEMO_PASSWORD = 'Password123';

/** Seeded accounts (see packages/database/prisma/seed.mjs) for quick role testing. */
const DEMO_ACCOUNTS: { role: UserRole; email: string }[] = [
  { role: 'SUPER_ADMIN', email: 'superadmin@demo.test' },
  { role: 'ORG_ADMIN', email: 'orgadmin@demo.test' },
  { role: 'PROPERTY_MANAGER', email: 'manager@demo.test' },
  { role: 'LEASING_AGENT', email: 'agent@demo.test' },
  { role: 'ACCOUNTANT', email: 'accountant@demo.test' },
  { role: 'MAINTENANCE', email: 'maintenance@demo.test' },
  { role: 'OWNER', email: 'owner@demo.test' },
  { role: 'TENANT', email: 'tenant@demo.test' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [demoPending, setDemoPending] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function signIn(values: LoginInput) {
    await login(values);
    toast.success('Welcome back!');
    router.push('/dashboard');
  }

  async function onSubmit(values: LoginInput) {
    try {
      await signIn(values);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to sign in');
    }
  }

  async function signInAs(email: string) {
    setValue('email', email);
    setValue('password', DEMO_PASSWORD);
    setDemoPending(email);
    try {
      await signIn({ email, password: DEMO_PASSWORD });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to sign in');
    } finally {
      setDemoPending(null);
    }
  }

  const busy = isSubmitting || demoPending !== null;

  return (
    <Card className="overflow-hidden border-border bg-card/95 shadow-soft">
      <CardHeader className="space-y-2 pb-5">
        <CardTitle className="text-3xl">Welcome back</CardTitle>
        <CardDescription>Sign in to continue to your PropertyFlow workspace.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" disabled={busy}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary underline-offset-4 hover:underline">
              Create one
            </Link>
          </p>
        </CardFooter>
      </form>

      {/* Demo accounts — one-click sign-in for every role. */}
      <div className="border-t bg-muted/35 p-6 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Explore a demo role</p>
            <p className="text-xs text-muted-foreground">Choose an account to sign in instantly.</p>
          </div>
          <span className="rounded-md border bg-card px-2 py-1 font-mono text-xs text-muted-foreground">
            {DEMO_PASSWORD}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.email}
              type="button"
              variant="outline"
              size="sm"
              className="justify-start bg-card"
              disabled={busy}
              onClick={() => signInAs(account.email)}
            >
              {demoPending === account.email ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              <span className="truncate">{ROLE_LABELS[account.role]}</span>
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}
