'use client';

import { accessibleSectionsFor, buildAbility, type AppAbility } from '@propertyflow/auth';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from './auth-context';

const AbilityContext = createContext<AppAbility | null>(null);

/**
 * Keeps the client-side ability synchronized with login, logout, and role
 * changes. The rules come straight from the API (already scoped to the user),
 * so the UI evaluates the same policy the server enforces.
 */
export function AbilityProvider({ children }: { children: ReactNode }) {
  const { abilityRules } = useAuth();
  const ability = useMemo(() => buildAbility(abilityRules), [abilityRules]);

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
