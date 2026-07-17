/**
 * Shared authentication + authorization (RBAC) logic for PropertyFlow.
 *
 * JWT signing/verification lives in the API (which holds the secrets). This
 * package holds the framework-agnostic pieces: token shapes and role-based
 * permission checks that both the API and clients can rely on.
 *
 * IMPORTANT (multi-tenant SaaS): authorization must be scoped by BOTH role AND
 * organization. `canAccess` handles the role check; callers MUST additionally
 * scope every query by `organizationId` (see `assertSameOrg`).
 */

import type { UserRole } from '@propertyflow/constants';

export interface AccessTokenPayload {
  /** User id. */
  sub: string;
  /** Organization id, or null for SUPER_ADMIN. */
  orgId: string | null;
  role: UserRole;
  /** Token type discriminator. */
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  /** Opaque token id, used to look up / rotate the stored refresh token. */
  jti: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

/** Returns true if `role` is one of the explicitly allowed roles. */
export function canAccess(role: UserRole, allowed: readonly UserRole[]): boolean {
  return allowed.includes(role);
}

/** SUPER_ADMIN can see across organizations; everyone else is confined to their own. */
export function canAccessOrganization(
  role: UserRole,
  userOrgId: string | null,
  targetOrgId: string,
): boolean {
  if (role === 'SUPER_ADMIN') return true;
  return userOrgId !== null && userOrgId === targetOrgId;
}
