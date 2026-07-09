/**
 * Single source of truth for roles, statuses and other enums used across the platform.
 * Each is declared `as const` so we can derive both runtime values and TypeScript types.
 */

export const USER_ROLES = [
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'DISPATCHER',
  'TECHNICIAN',
  'CUSTOMER',
  'AUDITOR',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const WORK_ORDER_STATUSES = [
  'DRAFT',
  'ASSIGNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const WORK_ORDER_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITIES)[number];
