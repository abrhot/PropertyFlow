'use client';

import { accessibleSectionsFor, defineAbilityFor, type AppAbility } from '@propertyflow/auth';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from './auth-context';

const AbilityContext = createContext<AppAbility | null>(null);

/** Keeps the client-side ability synchronized with login, logout, and role changes. */
export function AbilityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const ability = useMemo(() => defineAbilityFor(user), [user]);

  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>;
}

export function useAbility(): AppAbility {
  const ability = useContext(AbilityContext);
  if (!ability) throw new Error('useAbility must be used within an <AbilityProvider>');
  return ability;
}

export function useAccessibleSections() {
  const ability = useAbility();
  return useMemo(() => accessibleSectionsFor(ability), [ability]);
}
