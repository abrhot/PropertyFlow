/**
 * Shared domain types for the FieldTrack platform.
 * These interfaces are consumed by the API, web, and (where relevant) mobile apps
 * so the whole system agrees on a single shape for each entity.
 */

import type { UserRole, WorkOrderStatus, WorkOrderPriority } from '@fieldtrack/constants';

export type ID = string;

export type ISODateString = string;

export interface Timestamped {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Company extends Timestamped {
  id: ID;
  name: string;
  isActive: boolean;
}

export interface User extends Timestamped {
  id: ID;
  companyId: ID;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

export interface Customer extends Timestamped {
  id: ID;
  companyId: ID;
  name: string;
  email?: string;
  phone?: string;
}

export interface Address {
  id: ID;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface WorkOrder extends Timestamped {
  id: ID;
  companyId: ID;
  customerId: ID;
  title: string;
  description?: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  assignedTechnicianId?: ID;
  scheduledFor?: ISODateString;
  addressId?: ID;
}

export interface WorkOrderTask {
  id: ID;
  workOrderId: ID;
  title: string;
  isComplete: boolean;
}

// Re-export the enum-like unions so consumers can import them from @fieldtrack/types too.
export type { UserRole, WorkOrderStatus, WorkOrderPriority };
