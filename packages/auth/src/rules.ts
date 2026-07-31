/**
 * The declarative source of truth for every role's permissions.
 *
 * Each entry is a plain {@link AbilityRule} (a CASL "RawRule"), so the whole
 * policy reads like a table and can be stored verbatim in the database. The API
 * reconciles the `AbilityRule` table to this list on boot; nothing else should
 * hardcode role logic. To change what a role can do, edit the data here.
 *
 * Conditions use {@link RULE_PLACEHOLDERS} tokens that resolve to the current
 * user at request time — e.g. `{ organizationId: '{{organizationId}}' }` keeps a
 * rule scoped to the caller's own organization.
 */

import type { AppSection, UserRole } from '@propertyflow/constants';
import type { AbilityRule } from '@propertyflow/types';
import { RULE_PLACEHOLDERS } from './ability';

const ME = RULE_PLACEHOLDERS.USER_ID;
const ORG = RULE_PLACEHOLDERS.ORGANIZATION_ID;

/** One `access` grant per navigable section, in the order given. */
function sections(...names: AppSection[]): AbilityRule[] {
  return names.map((name) => ({ action: 'access', subject: name }));
}

/** Granted to every authenticated user, regardless of role. */
const BASE_RULES: AbilityRule[] = [
  { action: 'access', subject: 'dashboard' },
  { action: 'read', subject: 'User', conditions: { id: ME } },
];

export const DEFAULT_ABILITY_RULES: Record<UserRole, AbilityRule[]> = {
  SUPER_ADMIN: [
    ...BASE_RULES,
    ...sections('organizations', 'billing', 'reports', 'settings'),
    { action: 'manage', subject: 'all' },
    {
      action: 'manage',
      subject: 'Invitation',
      inverted: true,
      reason: 'Invitations are managed by organization admins, not the platform admin.',
    },
    {
      action: 'pay',
      subject: 'Payment',
      inverted: true,
      reason: 'Platform admins never make tenant payments.',
    },
  ],

  ORG_ADMIN: [
    ...BASE_RULES,
    ...sections(
      'properties',
      'leases',
      'payments',
      'maintenance',
      'tenants',
      'messages',
      'reports',
      'settings',
    ),
    { action: 'manage', subject: 'Organization', conditions: { id: ORG } },
    { action: 'manage', subject: 'User', conditions: { organizationId: ORG } },
    { action: 'manage', subject: 'Invitation', conditions: { organizationId: ORG } },
    { action: 'manage', subject: 'Property', conditions: { organizationId: ORG } },
    { action: 'manage', subject: 'Lease', conditions: { organizationId: ORG } },
    { action: 'manage', subject: 'Payment', conditions: { organizationId: ORG } },
    { action: 'manage', subject: 'MaintenanceRequest', conditions: { organizationId: ORG } },
    { action: 'manage', subject: 'WorkOrder', conditions: { organizationId: ORG } },
    { action: 'manage', subject: 'Message', conditions: { organizationId: ORG } },
    { action: 'read', subject: 'Report', conditions: { organizationId: ORG } },
  ],

  PROPERTY_MANAGER: [
    ...BASE_RULES,
    ...sections('properties', 'leases', 'applications', 'maintenance', 'messages', 'reports'),
    { action: 'manage', subject: 'Property', conditions: { organizationId: ORG } },
    { action: 'manage', subject: 'Lease', conditions: { organizationId: ORG } },
    { action: 'manage', subject: 'Application', conditions: { organizationId: ORG } },
    { action: 'manage', subject: 'MaintenanceRequest', conditions: { organizationId: ORG } },
    { action: 'assign', subject: 'WorkOrder', conditions: { organizationId: ORG } },
    { action: 'manage', subject: 'Message', conditions: { organizationId: ORG } },
    { action: 'read', subject: 'Report', conditions: { organizationId: ORG } },
  ],

  LEASING_AGENT: [
    ...BASE_RULES,
    ...sections('applications', 'leases', 'tenants'),
    { action: 'manage', subject: 'Application', conditions: { organizationId: ORG } },
    { action: 'create', subject: 'Lease', conditions: { organizationId: ORG } },
    { action: 'read', subject: 'Lease', conditions: { organizationId: ORG } },
    { action: 'update', subject: 'Lease', conditions: { organizationId: ORG } },
    { action: 'read', subject: 'Property', conditions: { organizationId: ORG } },
    { action: 'read', subject: 'User', conditions: { organizationId: ORG, role: 'TENANT' } },
  ],

  ACCOUNTANT: [
    ...BASE_RULES,
    ...sections('payments', 'reports'),
    { action: 'manage', subject: 'Payment', conditions: { organizationId: ORG } },
    { action: 'read', subject: 'Report', conditions: { organizationId: ORG } },
    { action: 'read', subject: 'Property', conditions: { organizationId: ORG } },
    { action: 'read', subject: 'Lease', conditions: { organizationId: ORG } },
  ],

  MAINTENANCE: [
    ...BASE_RULES,
    ...sections('work_orders'),
    {
      action: 'read',
      subject: 'MaintenanceRequest',
      conditions: { organizationId: ORG, assigneeId: ME },
    },
    { action: 'read', subject: 'WorkOrder', conditions: { organizationId: ORG, assigneeId: ME } },
    { action: 'update', subject: 'WorkOrder', conditions: { organizationId: ORG, assigneeId: ME } },
  ],

  OWNER: [
    ...BASE_RULES,
    ...sections('properties', 'reports'),
    { action: 'read', subject: 'Property', conditions: { organizationId: ORG, ownerId: ME } },
    { action: 'read', subject: 'Lease', conditions: { organizationId: ORG, ownerId: ME } },
    { action: 'read', subject: 'Payment', conditions: { organizationId: ORG, ownerId: ME } },
    { action: 'read', subject: 'Report', conditions: { organizationId: ORG, ownerId: ME } },
  ],

  TENANT: [
    ...BASE_RULES,
    ...sections('my_lease', 'my_payments', 'my_requests', 'messages'),
    { action: 'read', subject: 'Lease', conditions: { organizationId: ORG, tenantId: ME } },
    { action: 'read', subject: 'Payment', conditions: { organizationId: ORG, tenantId: ME } },
    { action: 'pay', subject: 'Payment', conditions: { organizationId: ORG, tenantId: ME } },
    {
      action: 'create',
      subject: 'MaintenanceRequest',
      conditions: { organizationId: ORG, tenantId: ME },
    },
    {
      action: 'read',
      subject: 'MaintenanceRequest',
      conditions: { organizationId: ORG, tenantId: ME },
    },
    {
      action: 'update',
      subject: 'MaintenanceRequest',
      conditions: { organizationId: ORG, tenantId: ME },
    },
    { action: 'manage', subject: 'Message', conditions: { organizationId: ORG, participantIds: ME } },
  ],
};
