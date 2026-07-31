/**
 * Framework-agnostic authentication and authorization for PropertyFlow.
 *
 * JWT signing stays in the API. Authorization is expressed as declarative CASL
 * rules ({@link AbilityRule}) that are stored in the database and shared by the
 * API and clients, so everyone evaluates one permission model. Client checks
 * improve UX; the API remains the authoritative security boundary.
 *
 * - `./ability` — how to type, scope, and build an ability from rule data.
 * - `./rules`   — the declarative per-role rules used to seed the database.
 */

import type { UserRole } from '@propertyflow/constants';

export * from './ability';
export * from './rules';

export interface AccessTokenPayload {
  /** User id. */
  sub: string;
  /** Organization id. Null only for accounts not yet attached to an org. */
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

/** @deprecated Prefer an action/subject check through a built ability. */
export function canAccess(role: UserRole, allowed: readonly UserRole[]): boolean {
  return allowed.includes(role);
}

/** @deprecated Prefer CASL checks plus organization-scoped database queries. */
export function canAccessOrganization(
  _role: UserRole,
  userOrgId: string | null,
  targetOrgId: string,
): boolean {
  return userOrgId !== null && userOrgId === targetOrgId;
}
