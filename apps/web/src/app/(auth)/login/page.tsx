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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/auth-context';

const DEMO_PASSWORD = 'Password123';

/** Seeded accounts (see packages/database/prisma/seed.mjs) for quick role testing. */
const DEMO_ACCOUNTS: { role: UserRole; email: string }[] = [
  { role: 'ORG_ADMIN', email: 'orgadmin@demo.test' },
  { role: 'PROPERTY_MANAGER', email: 'manager@demo.test' },
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
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">
          Sign in to continue to your PropertyFlow workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="h-11 bg-white"
            {...register('email')}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
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
            placeholder="••••••••"
            className="h-11 bg-white"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="h-11 w-full" disabled={busy}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Create one
        </Link>
        {' · '}
        <Link href="/homes" className="font-medium text-primary underline-offset-4 hover:underline">
          Browse homes
        </Link>
      </p>

      <div className="space-y-3 border-t pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Explore a demo role</p>
            <p className="text-xs text-muted-foreground">One click — same password for all.</p>
          </div>
          <span className="shrink-0 rounded-full border bg-white px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
            {DEMO_PASSWORD}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              disabled={busy}
              onClick={() => signInAs(account.email)}
              className="flex h-10 items-center justify-between gap-2 rounded-xl border bg-white px-3 text-left text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
            >
              <span className="truncate">{ROLE_LABELS[account.role]}</span>
              {demoPending === account.email ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
              ) : (
                <span className="text-xs font-normal text-muted-foreground">Try</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
