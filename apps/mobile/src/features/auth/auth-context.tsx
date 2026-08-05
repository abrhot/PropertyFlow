import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { buildAbility, accessibleSectionsFor, type AppAbility } from '@propertyflow/auth';
import type { AppSection } from '@propertyflow/constants';
import type { AbilityRule, AuthUser } from '@propertyflow/types';
import { api } from '@/lib/api';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  ability: AppAbility;
  sections: AppSection[];
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Empty ability: fails closed until rules are loaded. */
const EMPTY_ABILITY = buildAbility([]);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [rules, setRules] = useState<AbilityRule[]>([]);

  const applySession = useCallback((nextUser: AuthUser, nextRules: AbilityRule[]) => {
    setUser(nextUser);
    setRules(nextRules);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setRules([]);
    setStatus('unauthenticated');
  }, []);

  // Restore a session from the secure store on launch.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const restored = await api.bootstrap();
        if (!active) return;
        if (!restored) return clearSession();
        const session = await api.me();
        if (!active) return;
        applySession(session.user, session.abilityRules);
      } catch {
        if (active) clearSession();
      }
    })();
    return () => {
      active = false;
    };
  }, [applySession, clearSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await api.login({ email, password });
      applySession(res.user, res.abilityRules);
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const ability = useMemo(() => (rules.length ? buildAbility(rules) : EMPTY_ABILITY), [rules]);
  const sections = useMemo(() => accessibleSectionsFor(ability), [ability]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, ability, sections, signIn, signOut }),
    [status, user, ability, sections, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
