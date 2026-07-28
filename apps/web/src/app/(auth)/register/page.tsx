'use client';

import { ApiError } from '@propertyflow/api-client';
import { registerSchema, type RegisterInput } from '@propertyflow/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerAccount } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterInput) {
    try {
      await registerAccount(values);
      toast.success('Your organization is ready!');
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to create account');
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-primary to-primary/75 px-6 py-7 text-primary-foreground">
        <Building2 className="h-7 w-7" aria-hidden="true" />
        <h2 className="mt-3 text-2xl font-bold tracking-tight">Create your organization</h2>
        <p className="mt-1 text-sm text-primary-foreground/80">
          Start a secure workspace for your property team.
        </p>
      </div>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">Administrator account</CardTitle>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            ORG_ADMIN
          </Badge>
        </div>
        <CardDescription>
          The first account is securely assigned Organization Admin. You can invite every other role
          from Settings after registration.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Company name</Label>
            <Input id="organizationName" {...register('organizationName')} />
            {errors.organizationName && (
              <p className="text-sm text-destructive">{errors.organizationName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Your full name</Label>
            <Input id="fullName" autoComplete="name" {...register('fullName')} />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                At least 8 characters, with uppercase, lowercase, and a number.
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create account
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
