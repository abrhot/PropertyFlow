/**
 * Shared domain types for the PropertyFlow platform.
 * These interfaces are consumed by the API, web, and mobile apps so the whole
 * system agrees on a single shape for each entity and API contract.
 */

import type {
  InvitableRole,
  PropertyType,
  SubscriptionTier,
  UnitStatus,
  UserRole,
} from '@propertyflow/constants';

export type ID = string;

export type ISODateString = string;

export interface Timestamped {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** A management company — the "tenant" of the multi-tenant SaaS platform. */
export interface Organization extends Timestamped {
  id: ID;
  name: string;
  slug: string;
  subscriptionTier: SubscriptionTier;
  isActive: boolean;
}

export interface User extends Timestamped {
  id: ID;
  /** Null for SUPER_ADMIN (platform-wide, not tied to an organization). */
  organizationId: ID | null;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  emailVerifiedAt: ISODateString | null;
}

/** The authenticated user shape returned to clients (never includes secrets). */
export interface AuthUser {
  id: ID;
  organizationId: ID | null;
  email: string;
  fullName: string;
  role: UserRole;
}

/**
 * The principal attached to each authenticated request, derived purely from the
 * access token (no DB hit). Load the full user record when you need email/name.
 */
export interface RequestUser {
  id: ID;
  organizationId: ID | null;
  role: UserRole;
}

// ---- Auth API contracts (DTOs) ----

export interface RegisterRequest {
  organizationName: string;
  fullName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export interface OrganizationInvitationSummary {
  id: ID;
  email: string;
  role: InvitableRole;
  status: InvitationStatus;
  expiresAt: ISODateString;
  createdAt: ISODateString;
}

export interface CreateInvitationRequest {
  email: string;
  role: InvitableRole;
}

export interface CreateInvitationResponse {
  invitation: OrganizationInvitationSummary;
  /** Development-only acceptance URL. Production sends this by email. */
  devAcceptUrl?: string;
}

export interface InvitationTokenRequest {
  token: string;
}

export interface AcceptInvitationRequest extends InvitationTokenRequest {
  fullName: string;
  password: string;
}

export interface InvitationPreview {
  email: string;
  organizationName: string;
  role: InvitableRole;
  expiresAt: ISODateString;
}

/** Login/register/refresh responses. The refresh token is delivered via httpOnly cookie. */
export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

// ---- Portfolio: properties & units ----

export interface PropertyAddress {
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Unit extends Timestamped {
  id: ID;
  propertyId: ID;
  label: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  /** Minor currency units (cents) so rent arithmetic stays exact. */
  marketRentCents: number;
  status: UnitStatus;
}

/** Aggregate figures the UI shows without loading every unit. */
export interface PropertyStats {
  unitCount: number;
  occupiedUnits: number;
  vacantUnits: number;
  /** Combined market rent of all units, in cents. */
  monthlyRentCents: number;
  /** Occupied share of units, 0-100, rounded to the nearest whole percent. */
  occupancyRate: number;
}

export interface PropertyOwnerSummary {
  id: ID;
  fullName: string;
  email: string;
}

export interface Property extends Timestamped, PropertyAddress {
  id: ID;
  organizationId: ID;
  ownerId: ID | null;
  name: string;
  type: PropertyType;
  yearBuilt: number | null;
  notes: string | null;
  isActive: boolean;
  owner: PropertyOwnerSummary | null;
  stats: PropertyStats;
}

/** A property plus its units, returned by the detail endpoint. */
export interface PropertyDetail extends Property {
  units: Unit[];
}

/** Portfolio-wide totals for the properties list header. */
export interface PropertyPortfolioSummary {
  propertyCount: number;
  unitCount: number;
  occupiedUnits: number;
  monthlyRentCents: number;
  occupancyRate: number;
}

export interface PropertyListResponse {
  properties: Property[];
  summary: PropertyPortfolioSummary;
}

export interface CreatePropertyRequest extends Omit<PropertyAddress, 'addressLine2' | 'country'> {
  name: string;
  type: PropertyType;
  addressLine2?: string;
  country?: string;
  yearBuilt?: number;
  notes?: string;
  ownerId?: ID;
}

export type UpdatePropertyRequest = Partial<CreatePropertyRequest> & { isActive?: boolean };

export interface CreateUnitRequest {
  label: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  marketRentCents: number;
  status: UnitStatus;
}

export type UpdateUnitRequest = Partial<CreateUnitRequest>;

export type { InvitableRole, PropertyType, SubscriptionTier, UnitStatus, UserRole };
