/**
 * Shared domain types for the PropertyFlow platform.
 * These interfaces are consumed by the API, web, and mobile apps so the whole
 * system agrees on a single shape for each entity and API contract.
 */

import type { UserRole, SubscriptionTier } from '@propertyflow/constants';

export type ID = string;

export type ISODateString = string;

export interface Timestamped {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** A management company — the "tenant" of the multi-tenant SaaS platform. */
export interface Organization extends Timestamped {
  id: ID;
  name: string;
  slug: string;
  subscriptionTier: SubscriptionTier;
  isActive: boolean;
}

export interface User extends Timestamped {
  id: ID;
  /** Null for SUPER_ADMIN (platform-wide, not tied to an organization). */
  organizationId: ID | null;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  emailVerifiedAt: ISODateString | null;
}

/** The authenticated user shape returned to clients (never includes secrets). */
export interface AuthUser {
  id: ID;
  organizationId: ID | null;
  email: string;
  fullName: string;
  role: UserRole;
}

/**
 * The principal attached to each authenticated request, derived purely from the
 * access token (no DB hit). Load the full user record when you need email/name.
 */
export interface RequestUser {
  id: ID;
  organizationId: ID | null;
  role: UserRole;
}

// ---- Auth API contracts (DTOs) ----

export interface RegisterRequest {
  organizationName: string;
  fullName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

/** Login/register/refresh responses. The refresh token is delivered via httpOnly cookie. */
export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export type { UserRole, SubscriptionTier };
