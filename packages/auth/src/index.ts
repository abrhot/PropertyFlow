/**
 * Framework-agnostic authentication and authorization for PropertyFlow.
 *
 * JWT signing stays in the API. CASL abilities live here so the API and clients
 * use one permission model. Client checks improve UX; the API remains the
 * authoritative security boundary.
 */

import {
  AbilityBuilder,
  createMongoAbility,
  subject,
  type ForcedSubject,
  type MongoAbility,
} from '@casl/ability';
import { APP_SECTIONS, type AppSection, type UserRole } from '@propertyflow/constants';

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

export type AppAction =
  'manage' | 'access' | 'create' | 'read' | 'update' | 'delete' | 'approve' | 'assign' | 'pay';

export type DomainSubject =
  | 'Organization'
  | 'Subscription'
  | 'User'
  | 'Invitation'
  | 'Property'
  | 'Lease'
  | 'Application'
  | 'Payment'
  | 'MaintenanceRequest'
  | 'WorkOrder'
  | 'Report'
  | 'Message';

export type PolicySubject = AppSection | DomainSubject | 'all';
export interface ResourceAttributes {
  id?: string;
  organizationId?: string | null;
  ownerId?: string;
  tenantId?: string;
  assigneeId?: string;
  participantIds?: string[];
  [attribute: string]: unknown;
}
export type ResourceSubject = {
  [Subject in DomainSubject]: ForcedSubject<Subject> & ResourceAttributes;
}[DomainSubject];
export type AppSubject = PolicySubject | ResourceSubject;
export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

/** Minimum identity needed to construct an ability. */
export interface AbilityUser {
  id: string;
  organizationId: string | null;
  role: UserRole;
}

type RuleBuilder = Pick<AbilityBuilder<AppAbility>, 'can' | 'cannot'>;

function allowSections(can: RuleBuilder['can'], sections: readonly AppSection[]): void {
  for (const section of sections) can('access', section);
}

/** Tags plain API/Prisma data with a CASL subject type for instance-level checks. */
export function resource(
  subjectType: DomainSubject,
  attributes: ResourceAttributes,
): ResourceSubject {
  return subject(subjectType, attributes) as ResourceSubject;
}

/**
 * Builds the complete role ability.
 *
 * Domain conditions enforce the tenant/owner boundary when callers check an
 * actual resource object. Controllers should first check the subject type, then
 * services must check the loaded object before returning or mutating it.
 */
export function defineAbilityFor(user: AbilityUser | null): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (!user) return build();

  can('access', 'dashboard');
  can('read', 'User', { id: user.id });
  const organizationId = user.organizationId;

  switch (user.role) {
    case 'SUPER_ADMIN':
      allowSections(can, ['organizations', 'billing', 'reports', 'settings']);
      can('manage', 'all');
      cannot('manage', 'Invitation');
      cannot('pay', 'Payment');
      break;

    case 'ORG_ADMIN':
      if (!organizationId) break;
      allowSections(can, [
        'properties',
        'leases',
        'payments',
        'maintenance',
        'tenants',
        'reports',
        'settings',
      ]);
      can('manage', 'Organization', { id: organizationId });
      can('manage', 'User', { organizationId });
      can('manage', 'Invitation', { organizationId });
      can('manage', 'Property', { organizationId });
      can('manage', 'Lease', { organizationId });
      can('manage', 'Payment', { organizationId });
      can('manage', 'MaintenanceRequest', { organizationId });
      can('manage', 'WorkOrder', { organizationId });
      can('read', 'Report', { organizationId });
      break;

    case 'PROPERTY_MANAGER':
      if (!organizationId) break;
      allowSections(can, ['properties', 'leases', 'applications', 'maintenance', 'reports']);
      can('manage', 'Property', { organizationId });
      can('manage', 'Lease', { organizationId });
      can('manage', 'Application', { organizationId });
      can('manage', 'MaintenanceRequest', { organizationId });
      can('assign', 'WorkOrder', { organizationId });
      can('read', 'Report', { organizationId });
      break;

    case 'LEASING_AGENT':
      if (!organizationId) break;
      allowSections(can, ['applications', 'leases', 'tenants']);
      can('manage', 'Application', { organizationId });
      can('create', 'Lease', { organizationId });
      can('read', 'Lease', { organizationId });
      can('update', 'Lease', { organizationId });
      can('read', 'Property', { organizationId });
      can('read', 'User', { organizationId, role: 'TENANT' });
      break;

    case 'ACCOUNTANT':
      if (!organizationId) break;
      allowSections(can, ['payments', 'reports']);
      can('manage', 'Payment', { organizationId });
      can('read', 'Report', { organizationId });
      can('read', 'Property', { organizationId });
      can('read', 'Lease', { organizationId });
      break;

    case 'MAINTENANCE':
      if (!organizationId) break;
      allowSections(can, ['work_orders']);
      can('read', 'MaintenanceRequest', { organizationId, assigneeId: user.id });
      can('read', 'WorkOrder', { organizationId, assigneeId: user.id });
      can('update', 'WorkOrder', { organizationId, assigneeId: user.id });
      break;

    case 'OWNER':
      if (!organizationId) break;
      allowSections(can, ['properties', 'reports']);
      can('read', 'Property', { organizationId, ownerId: user.id });
      can('read', 'Lease', { organizationId, ownerId: user.id });
      can('read', 'Payment', { organizationId, ownerId: user.id });
      can('read', 'Report', { organizationId, ownerId: user.id });
      break;

    case 'TENANT':
      if (!organizationId) break;
      allowSections(can, ['my_lease', 'my_payments', 'my_requests', 'messages']);
      can('read', 'Lease', { organizationId, tenantId: user.id });
      can('read', 'Payment', { organizationId, tenantId: user.id });
      can('pay', 'Payment', { organizationId, tenantId: user.id });
      can('create', 'MaintenanceRequest', { organizationId, tenantId: user.id });
      can('read', 'MaintenanceRequest', { organizationId, tenantId: user.id });
      can('update', 'MaintenanceRequest', { organizationId, tenantId: user.id });
      can('manage', 'Message', { organizationId, participantIds: user.id });
      break;
  }

  return build();
}

/** Returns navigable sections in the product-defined order. */
export function accessibleSectionsFor(ability: AppAbility): AppSection[] {
  return APP_SECTIONS.filter((section) => ability.can('access', section));
}

/** @deprecated Prefer an action/subject check through `defineAbilityFor`. */
export function canAccess(role: UserRole, allowed: readonly UserRole[]): boolean {
  return allowed.includes(role);
}

/** @deprecated Prefer CASL checks plus organization-scoped database queries. */
export function canAccessOrganization(
  role: UserRole,
  userOrgId: string | null,
  targetOrgId: string,
): boolean {
  if (role === 'SUPER_ADMIN') return true;
  return userOrgId !== null && userOrgId === targetOrgId;
}
