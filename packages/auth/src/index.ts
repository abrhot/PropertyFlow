/**
 * Shared authentication + authorization (RBAC) logic.
 *
 * NOTE: JWT signing/verification lives in the API (which holds the secret).
 * This package holds the framework-agnostic pieces: token shapes and
 * role-based permission checks that both the API and clients can rely on.
 */

import type { UserRole } from '@fieldtrack/constants';

export interface AccessTokenPayload {
  sub: string;
  companyId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Simple role hierarchy: a higher rank inherits the permissions of lower ranks.
 * Adjust as the permission model grows (e.g. move to explicit permission sets).
 */
const ROLE_RANK: Record<UserRole, number> = {
  CUSTOMER: 0,
  TECHNICIAN: 1,
  AUDITOR: 2,
  DISPATCHER: 3,
  COMPANY_ADMIN: 4,
  SUPER_ADMIN: 5,
};

/** Returns true if `role` is at least as privileged as `required`. */
export function hasAtLeastRole(role: UserRole, required: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/** Returns true if `role` is one of the explicitly allowed roles. */
export function canAccess(role: UserRole, allowed: readonly UserRole[]): boolean {
  return allowed.includes(role);
}
