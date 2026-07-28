'use client';

import { ApiError } from '@propertyflow/api-client';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@propertyflow/constants';
import { acceptInvitationSchema, type AcceptInvitationInput } from '@propertyflow/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, ShieldCheck, TriangleAlert, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { api } from '@/lib/api';

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { acceptInvitation } = useAuth();
  const preview = useQuery({
    queryKey: ['invitation', 'preview', token],
    queryFn: () => api.previewInvitation({ token }),
    enabled: Boolean(token),
    retry: false,
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInvitationInput>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { token, fullName: '', password: '' },
  });

  async function onSubmit(input: AcceptInvitationInput) {
    try {
      await acceptInvitation(input);
      toast.success('Welcome to PropertyFlow');
      router.push('/dashboard');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Unable to accept invitation');
    }
  }

  if (!token || preview.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitation unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>We could not verify this link</AlertTitle>
            <AlertDescription>
              It may be expired, revoked, already used, or missing its secure token.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (preview.isLoading || !preview.data) {
    return (
      <Card>
        <CardContent className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const invitation = preview.data;

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-primary to-primary/75 px-6 py-7 text-primary-foreground">
        <div className="flex items-center gap-2 text-sm font-medium text-primary-foreground/80">
          <UsersRound className="h-4 w-4" aria-hidden="true" />
          {invitation.organizationName}
        </div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">You&apos;re invited</h2>
        <p className="mt-1 text-sm text-primary-foreground/80">
          Join the organization with a securely assigned role.
        </p>
      </div>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{ROLE_LABELS[invitation.role]}</CardTitle>
            <CardDescription className="mt-1">{invitation.email}</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            CASL protected
          </Badge>
        </div>
        <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
          {ROLE_DESCRIPTIONS[invitation.role]}
        </p>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <input type="hidden" {...register('token')} />
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" autoComplete="name" {...register('fullName')} />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Create password</Label>
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
                At least 8 characters with uppercase, lowercase, and a number.
              </p>
            )}
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Your role and organization come from this signed invitation and cannot be changed here.
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Accept invitation
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Expires {new Date(invitation.expiresAt).toLocaleDateString()}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}
