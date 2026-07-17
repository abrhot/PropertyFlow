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
