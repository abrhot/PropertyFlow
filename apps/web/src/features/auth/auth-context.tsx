'use client';

import type { AuthUser } from '@propertyflow/types';
import type { LoginInput, RegisterInput } from '@propertyflow/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';
import { api } from '@/lib/api';

const ME_QUERY_KEY = ['auth', 'me'] as const;

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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
    onSuccess: (res) => queryClient.setQueryData(ME_QUERY_KEY, res.user),
  });

  const registerMutation = useMutation({
    mutationFn: (input: RegisterInput) => api.register(input),
    onSuccess: (res) => queryClient.setQueryData(ME_QUERY_KEY, res.user),
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      queryClient.setQueryData(ME_QUERY_KEY, null);
      queryClient.clear();
    },
  });

  const value: AuthContextValue = {
    user: data ?? null,
    isLoading,
    isAuthenticated: Boolean(data),
    login: async (input) => {
      await loginMutation.mutateAsync(input);
    },
    register: async (input) => {
      await registerMutation.mutateAsync(input);
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
