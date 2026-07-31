'use client';

import type { AbilityRule, AuthResponse, AuthUser, SessionResponse } from '@propertyflow/types';
import type { AcceptInvitationInput, LoginInput, RegisterInput } from '@propertyflow/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';
import { api } from '@/lib/api';

const ME_QUERY_KEY = ['auth', 'me'] as const;

interface AuthContextValue {
  user: AuthUser | null;
  /** The caller's authorization rules, scoped to them by the API. */
  abilityRules: AbilityRule[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  acceptInvitation: (input: AcceptInvitationInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** The auth responses and the `/me` payload share the same session shape. */
function toSession(response: AuthResponse): SessionResponse {
  return { user: response.user, abilityRules: response.abilityRules };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ME_QUERY_KEY,
    // The API client transparently attempts a refresh (via httpOnly cookie) on 401.
    queryFn: async () => {
      try {
        return await api.me();
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => api.login(input),
    onSuccess: (res) => queryClient.setQueryData(ME_QUERY_KEY, toSession(res)),
  });

  const registerMutation = useMutation({
    mutationFn: (input: RegisterInput) => api.register(input),
    onSuccess: (res) => queryClient.setQueryData(ME_QUERY_KEY, toSession(res)),
  });

  const acceptInvitationMutation = useMutation({
    mutationFn: (input: AcceptInvitationInput) => api.acceptInvitation(input),
    onSuccess: (res) => queryClient.setQueryData(ME_QUERY_KEY, toSession(res)),
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      queryClient.setQueryData(ME_QUERY_KEY, null);
      queryClient.clear();
    },
  });

  const value: AuthContextValue = {
    user: data?.user ?? null,
    abilityRules: data?.abilityRules ?? [],
    isLoading,
    isAuthenticated: Boolean(data),
    login: async (input) => {
      await loginMutation.mutateAsync(input);
    },
    register: async (input) => {
      await registerMutation.mutateAsync(input);
    },
    acceptInvitation: async (input) => {
      await acceptInvitationMutation.mutateAsync(input);
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}
