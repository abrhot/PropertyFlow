/**
 * Single source of truth for roles, statuses and other enums used across PropertyFlow.
 * Each is declared `as const` so we can derive both runtime values and TypeScript types.
 */

/**
 * User roles (see PRD section 6). Permissions are scoped by BOTH role AND
 * organization/property to prevent cross-tenant data leakage.
 */
export const USER_ROLES = [
  'SUPER_ADMIN', // Platform-wide administrator (no organization).
  'ORG_ADMIN', // Manages a single management company (organization).
  'PROPERTY_MANAGER', // Manages assigned properties.
  'LEASING_AGENT', // Listings, applications, screening, lease creation.
  'ACCOUNTANT', // Financial data, ledgers, statements.
  'MAINTENANCE', // Maintenance staff / vendor working assigned work orders.
  'OWNER', // Property owner; views performance for owned properties.
  'TENANT', // Pays rent, submits requests, views lease.
] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles that belong to a management company's staff (org-scoped, back-office). */
export const STAFF_ROLES = [
  'ORG_ADMIN',
  'PROPERTY_MANAGER',
  'LEASING_AGENT',
  'ACCOUNTANT',
] as const satisfies readonly UserRole[];

/**
 * Roles an organization administrator may assign through an invitation.
 * SUPER_ADMIN is platform-controlled and can never be self-selected or invited.
 */
export const INVITABLE_ROLES = [
  'ORG_ADMIN',
  'PROPERTY_MANAGER',
  'LEASING_AGENT',
  'ACCOUNTANT',
  'MAINTENANCE',
  'OWNER',
  'TENANT',
] as const satisfies readonly UserRole[];
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const SUBSCRIPTION_TIERS = ['TRIAL', 'STARTER', 'GROWTH', 'ENTERPRISE'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const MAINTENANCE_STATUSES = [
  'SUBMITTED',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const LEASE_STATUSES = [
  'DRAFT',
  'PENDING_SIGNATURE',
  'ACTIVE',
  'EXPIRED',
  'TERMINATED',
] as const;
export type LeaseStatus = (typeof LEASE_STATUSES)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'LATE', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Cookie name used for the httpOnly refresh token. */
export const REFRESH_TOKEN_COOKIE = 'pf_refresh_token';

/**
 * Non-httpOnly "hint" cookie set alongside the refresh token. It carries NO
 * secret — it only lets the web middleware know a session likely exists so it can
 * redirect at the edge. Real authorization is always enforced by the API (JWT).
 */
export const SESSION_HINT_COOKIE = 'pf_session';

// ---------------------------------------------------------------------------
// Role metadata & per-role app sections (drives the after-login experience)
// ---------------------------------------------------------------------------

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Administrator',
  ORG_ADMIN: 'Organization Admin',
  PROPERTY_MANAGER: 'Property Manager',
  LEASING_AGENT: 'Leasing Agent',
  ACCOUNTANT: 'Accountant',
  MAINTENANCE: 'Maintenance / Vendor',
  OWNER: 'Property Owner',
  TENANT: 'Tenant',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Platform-wide control: organizations, subscriptions, and system analytics.',
  ORG_ADMIN: 'Runs a management company: staff, properties, owners, and settings.',
  PROPERTY_MANAGER: 'Manages assigned properties, leases, applications, and maintenance.',
  LEASING_AGENT: 'Handles listings, applications, screening, and lease creation.',
  ACCOUNTANT: 'Owns the financials: rent ledgers, statements, and reconciliation.',
  MAINTENANCE: 'Works assigned work orders and updates their status from the field.',
  OWNER: 'Views performance, occupancy, and financials for owned properties.',
  TENANT: 'Pays rent, submits maintenance requests, and views the lease.',
};

/** Every navigable area in the product (features arrive across the roadmap). */
export const APP_SECTIONS = [
  'dashboard',
  'organizations',
  'billing',
  'properties',
  'leases',
  'applications',
  'payments',
  'maintenance',
  'work_orders',
  'reports',
  'tenants',
  'messages',
  'my_lease',
  'my_payments',
  'my_requests',
  'settings',
] as const;
export type AppSection = (typeof APP_SECTIONS)[number];

/**
 * @deprecated Use `defineAbilityFor` and `accessibleSectionsFor` from
 * `@propertyflow/auth`. Retained temporarily for consumers migrating from the
 * original role-list navigation.
 */
export const ROLE_SECTIONS: Record<UserRole, AppSection[]> = {
  SUPER_ADMIN: ['dashboard', 'organizations', 'billing', 'reports', 'settings'],
  ORG_ADMIN: [
    'dashboard',
    'properties',
    'leases',
    'payments',
    'maintenance',
    'tenants',
    'reports',
    'settings',
  ],
  PROPERTY_MANAGER: ['dashboard', 'properties', 'leases', 'applications', 'maintenance', 'reports'],
  LEASING_AGENT: ['dashboard', 'applications', 'leases', 'tenants'],
  ACCOUNTANT: ['dashboard', 'payments', 'reports'],
  MAINTENANCE: ['dashboard', 'work_orders'],
  OWNER: ['dashboard', 'properties', 'reports'],
  TENANT: ['dashboard', 'my_lease', 'my_payments', 'my_requests', 'messages'],
};
