/**
 * Single source of truth for roles, statuses and other enums used across PropertyFlow.
 * Each is declared `as const` so we can derive both runtime values and TypeScript types.
 */

/**
 * User roles (see PRD section 6). Permissions are scoped by BOTH role AND
 * organization/property to prevent cross-tenant data leakage.
 */
export const USER_ROLES = [
  'ORG_ADMIN', // Runs the management company: staff, properties, owners, finances, settings.
  'PROPERTY_MANAGER', // Day-to-day operations: properties, leases, applications, maintenance.
  'MAINTENANCE', // Field maintenance division: works assigned work orders.
  'OWNER', // Property owner; views performance for owned properties.
  'TENANT', // Pays rent, submits requests, views lease.
] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles that belong to a management company's staff (org-scoped, back-office). */
export const STAFF_ROLES = [
  'ORG_ADMIN',
  'PROPERTY_MANAGER',
] as const satisfies readonly UserRole[];

/**
 * Roles an organization administrator may assign through an invitation.
 */
export const INVITABLE_ROLES = [
  'ORG_ADMIN',
  'PROPERTY_MANAGER',
  'MAINTENANCE',
  'OWNER',
  'TENANT',
] as const satisfies readonly UserRole[];
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const SUBSCRIPTION_TIERS = ['TRIAL', 'STARTER', 'GROWTH', 'ENTERPRISE'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const SUBSCRIPTION_TIER_LABELS: Record<SubscriptionTier, string> = {
  TRIAL: 'Trial',
  STARTER: 'Starter',
  GROWTH: 'Growth',
  ENTERPRISE: 'Enterprise',
};

/**
 * Monthly list price per subscription tier, in minor currency units (cents).
 * Used to estimate platform MRR in the billing overview. TRIAL is $0.
 */
export const SUBSCRIPTION_TIER_PRICE_CENTS: Record<SubscriptionTier, number> = {
  TRIAL: 0,
  STARTER: 9900,
  GROWTH: 29900,
  ENTERPRISE: 99900,
};

export const PROPERTY_TYPES = [
  'SINGLE_FAMILY',
  'MULTI_FAMILY',
  'APARTMENT',
  'CONDO',
  'TOWNHOUSE',
  'COMMERCIAL',
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  SINGLE_FAMILY: 'Single family',
  MULTI_FAMILY: 'Multi family',
  APARTMENT: 'Apartment building',
  CONDO: 'Condominium',
  TOWNHOUSE: 'Townhouse',
  COMMERCIAL: 'Commercial',
};

export const UNIT_STATUSES = ['VACANT', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE'] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  VACANT: 'Vacant',
  OCCUPIED: 'Occupied',
  MAINTENANCE: 'Under maintenance',
  UNAVAILABLE: 'Unavailable',
};

export const MAINTENANCE_STATUSES = [
  'SUBMITTED',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  SUBMITTED: 'Submitted',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const MAINTENANCE_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number];

export const MAINTENANCE_PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const WORK_ORDER_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const APPLICATION_STATUSES = ['NEW', 'SCREENING', 'APPROVED', 'DENIED', 'WITHDRAWN'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  NEW: 'New',
  SCREENING: 'Screening',
  APPROVED: 'Approved',
  DENIED: 'Denied',
  WITHDRAWN: 'Withdrawn',
};

export const LEASE_STATUSES = [
  'DRAFT',
  'PENDING_SIGNATURE',
  'ACTIVE',
  'EXPIRED',
  'TERMINATED',
] as const;
export type LeaseStatus = (typeof LEASE_STATUSES)[number];

export const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  DRAFT: 'Draft',
  PENDING_SIGNATURE: 'Pending signature',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated',
};

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'LATE', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  LATE: 'Late',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

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
  ORG_ADMIN: 'Organization Admin',
  PROPERTY_MANAGER: 'Property Manager',
  MAINTENANCE: 'Maintenance / Technician',
  OWNER: 'Property Owner',
  TENANT: 'Tenant',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ORG_ADMIN:
    'Runs the company: staff, properties, owners, leasing, finances, maintenance, and settings.',
  PROPERTY_MANAGER:
    'Day-to-day operations: properties, leases, applications, payments, and maintenance.',
  MAINTENANCE: 'Works assigned work orders and updates their status from the field.',
  OWNER: 'Views performance, occupancy, and financials for owned properties.',
  TENANT: 'Pays rent, submits maintenance requests, and views the lease.',
};

/** Every navigable area in the product (features arrive across the roadmap). */
export const APP_SECTIONS = [
  'dashboard',
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
 * @deprecated Build an ability with `buildAbility` and derive navigation with
 * `accessibleSectionsFor` from `@propertyflow/auth`. Retained temporarily for
 * consumers migrating from the original role-list navigation.
 */
export const ROLE_SECTIONS: Record<UserRole, AppSection[]> = {
  ORG_ADMIN: [
    'dashboard',
    'properties',
    'leases',
    'applications',
    'payments',
    'maintenance',
    'work_orders',
    'tenants',
    'messages',
    'reports',
    'settings',
  ],
  PROPERTY_MANAGER: [
    'dashboard',
    'properties',
    'leases',
    'applications',
    'payments',
    'maintenance',
    'work_orders',
    'tenants',
    'messages',
    'reports',
    'settings',
  ],
  MAINTENANCE: ['dashboard', 'work_orders', 'settings'],
  OWNER: ['dashboard', 'properties', 'reports', 'settings'],
  TENANT: ['dashboard', 'my_lease', 'my_payments', 'my_requests', 'messages', 'settings'],
};
