'use client';

import { ApiError } from '@propertyflow/api-client';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@propertyflow/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '@/lib/api';
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

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordInput) {
    try {
      const res = await api.forgotPassword(values);
      toast.success(res.message);
      // In development the API returns a token so you can test the reset flow.
      if (res.devToken) {
        toast.info('Dev reset link', {
          description: `/reset-password?token=${res.devToken}`,
          duration: 15000,
        });
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          {isSubmitSuccessful && (
            <p className="text-sm text-muted-foreground">
              If an account exists for that email, a reset link is on its way.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Send reset link
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
