'use client';

import type { AppAction, PolicySubject } from '@propertyflow/auth';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAbility } from './ability-context';
import { useAuth } from './auth-context';

interface RequireAbilityProps {
  action: AppAction;
  subject: PolicySubject;
  children: ReactNode;
  fallbackPath?: string;
}

/**
 * UX route guard for protected pages. API authorization is still mandatory;
 * client guards must never be treated as a security boundary.
 */
export function RequireAbility({
  action,
  subject,
  children,
  fallbackPath = '/dashboard',
}: RequireAbilityProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const ability = useAbility();
  const router = useRouter();
  const isAllowed = ability.can(action, subject);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isAllowed) {
      router.replace(fallbackPath);
    }
  }, [fallbackPath, isAllowed, isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated || !isAllowed) return null;
  return <>{children}</>;
}
