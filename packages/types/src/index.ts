/**
 * Shared domain types for the PropertyFlow platform.
 * These interfaces are consumed by the API, web, and mobile apps so the whole
 * system agrees on a single shape for each entity and API contract.
 */

import type {
  ApplicationStatus,
  InvitableRole,
  LeaseStatus,
  MaintenancePriority,
  MaintenanceStatus,
  NotificationType,
  PaymentStatus,
  PropertyType,
  SubscriptionTier,
  UnitStatus,
  UserRole,
  WorkOrderStatus,
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
  /** Nullable so an account can exist briefly before being attached to an org. */
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
  /**
   * Buildings a PROPERTY_MANAGER is assigned to. Loaded per request and used to
   * scope managers to their own portfolio. Undefined for every other role
   * (which are scoped by other means).
   */
  managedPropertyIds?: ID[];
}

/** A property manager and the buildings currently assigned to them. */
export interface ManagerSummary {
  id: ID;
  fullName: string;
  email: string;
  isActive: boolean;
  propertyIds: ID[];
}

/** Admin view for assigning managers to buildings. */
export interface ManagerAssignmentsResponse {
  managers: ManagerSummary[];
  properties: { id: ID; name: string }[];
}

export interface UpdateManagerPropertiesRequest {
  propertyIds: ID[];
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

// ---- Authorization rules (CASL "RawRule", shared contract) ----

/**
 * A serializable authorization rule — the CASL "RawRule" shape. This is the one
 * contract used to store permissions in the database AND ship them to any client,
 * so the API and the web/mobile apps evaluate exactly the same policy.
 *
 * When stored, `conditions` values may contain interpolation tokens (e.g.
 * "{{userId}}"). The API resolves them for the current user before returning the
 * rules, so clients only ever receive concrete, pre-scoped rules.
 */
export interface AbilityRule {
  /** A single action or a list of them (e.g. "read", ["create", "update"]). */
  action: string | string[];
  /** The subject/entity the action applies to (e.g. "Property"). Omit for "all". */
  subject?: string | string[];
  /** Restricts the rule to specific fields of the subject. */
  fields?: string[];
  /** Attribute conditions (MongoDB-style query) that scope the rule. */
  conditions?: Record<string, unknown>;
  /** When true the rule forbids instead of allows. */
  inverted?: boolean;
  /** Human-readable explanation surfaced when an inverted rule blocks access. */
  reason?: string;
}

/** Login/register/refresh responses. The refresh token is delivered via httpOnly cookie. */
export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
  /** The caller's authorization rules, already scoped to them. */
  abilityRules: AbilityRule[];
  /**
   * Only present for token-based (mobile) clients that can't use the httpOnly
   * refresh cookie. Web clients receive the refresh token via cookie instead and
   * this field stays undefined.
   */
  refreshToken?: string;
}

/** The `GET /auth/me` payload: the current user plus their authorization rules. */
export interface SessionResponse {
  user: AuthUser;
  abilityRules: AbilityRule[];
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
  /** Optional cover photo URL. */
  imageUrl: string | null;
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
  imageUrl?: string;
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

// ---- Leases ----

/** Enough of the related unit/property/tenant to render a lease without extra calls. */
export interface LeaseUnitSummary {
  id: ID;
  label: string;
  propertyId: ID;
  propertyName: string;
}

export interface LeaseTenantSummary {
  id: ID;
  fullName: string;
  email: string;
}

export interface Lease extends Timestamped {
  id: ID;
  organizationId: ID;
  unitId: ID;
  tenantId: ID;
  status: LeaseStatus;
  startDate: ISODateString;
  endDate: ISODateString;
  /** Monthly rent in minor currency units (cents). */
  rentCents: number;
  depositCents: number;
  notes: string | null;
  unit: LeaseUnitSummary;
  tenant: LeaseTenantSummary;
  /** The owner of the leased unit's property, used for owner scoping. */
  ownerId: ID | null;
}

export interface LeasePortfolioSummary {
  leaseCount: number;
  activeLeases: number;
  /** Combined rent of active leases, in cents. */
  monthlyRentCents: number;
}

export interface LeaseListResponse {
  leases: Lease[];
  summary: LeasePortfolioSummary;
}

export interface CreateLeaseRequest {
  unitId: ID;
  tenantId: ID;
  status?: LeaseStatus;
  startDate: ISODateString;
  endDate: ISODateString;
  rentCents: number;
  depositCents?: number;
  notes?: string;
}

export type UpdateLeaseRequest = Partial<Omit<CreateLeaseRequest, 'unitId'>>;

/** Choices for the lease create/edit form, scoped to the caller's organization. */
export interface LeaseFormOptions {
  units: LeaseUnitSummary[];
  tenants: LeaseTenantSummary[];
}

// ---- Payments ----

export interface Payment extends Timestamped {
  id: ID;
  organizationId: ID;
  leaseId: ID;
  tenantId: ID;
  ownerId: ID | null;
  status: PaymentStatus;
  amountCents: number;
  dueDate: ISODateString;
  paidAt: ISODateString | null;
  description: string;
  method: string | null;
  reference: string | null;
  tenant: LeaseTenantSummary;
  unit: LeaseUnitSummary;
}

export interface PaymentPortfolioSummary {
  paymentCount: number;
  collectedCents: number;
  outstandingCents: number;
  collectionRate: number;
}

export interface PaymentListResponse {
  payments: Payment[];
  summary: PaymentPortfolioSummary;
}

export interface CreatePaymentRequest {
  leaseId: ID;
  amountCents: number;
  dueDate: ISODateString;
  description: string;
  status?: PaymentStatus;
  method?: string;
  reference?: string;
}

export type UpdatePaymentRequest = Partial<Omit<CreatePaymentRequest, 'leaseId'>>;

export interface PaymentFormOptions {
  leases: (LeaseUnitSummary & {
    tenant: LeaseTenantSummary;
    rentCents: number;
  })[];
}

// ---- Maintenance ----

export interface MaintenanceRequest extends Timestamped {
  id: ID;
  organizationId: ID;
  unitId: ID;
  leaseId: ID | null;
  tenantId: ID;
  ownerId: ID | null;
  assigneeId: ID | null;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  submittedAt: ISODateString;
  completedAt: ISODateString | null;
  cancelledAt: ISODateString | null;
  unit: LeaseUnitSummary;
  tenant: LeaseTenantSummary;
  assignee: LeaseTenantSummary | null;
}

export interface MaintenanceSummary {
  requestCount: number;
  openCount: number;
  inProgressCount: number;
  urgentCount: number;
}

export interface MaintenanceRequestListResponse {
  requests: MaintenanceRequest[];
  summary: MaintenanceSummary;
}

export interface CreateMaintenanceRequestRequest {
  leaseId?: ID;
  unitId?: ID;
  tenantId?: ID;
  title: string;
  description: string;
  priority?: MaintenancePriority;
}

export interface UpdateMaintenanceRequestRequest {
  title?: string;
  description?: string;
  priority?: MaintenancePriority;
  status?: MaintenanceStatus;
}

export interface MaintenanceFormOptions {
  leases: (LeaseUnitSummary & { tenant: LeaseTenantSummary })[];
  assignees: LeaseTenantSummary[];
}

export interface WorkOrder extends Timestamped {
  id: ID;
  organizationId: ID;
  maintenanceRequestId: ID;
  assigneeId: ID;
  tenantId: ID;
  ownerId: ID | null;
  status: WorkOrderStatus;
  dueDate: ISODateString | null;
  startedAt: ISODateString | null;
  completedAt: ISODateString | null;
  notes: string | null;
  completionNotes: string | null;
  imageUrls: string[];
  referenceCode: string;
  assignee: LeaseTenantSummary;
  request: Pick<MaintenanceRequest, 'id' | 'title' | 'priority'> & {
    unit: LeaseUnitSummary;
    tenant: LeaseTenantSummary;
  };
}

// ---- Work-order completion (technician proof) ----

export interface CompleteWorkOrderRequest {
  completionNotes?: string;
  imageUrls?: string[];
}

export interface WorkOrderListResponse {
  workOrders: WorkOrder[];
  summary: {
    workOrderCount: number;
    assignedCount: number;
    inProgressCount: number;
    completedCount: number;
  };
}

// ---- Notifications ----

export interface AppNotification {
  id: ID;
  type: NotificationType;
  title: string;
  body: string;
  linkPath: string | null;
  isRead: boolean;
  createdAt: ISODateString;
}

export interface NotificationListResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

// ---- Tenant directory ----

export interface TenantDirectoryEntry {
  id: ID;
  organizationId: ID;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: ISODateString;
  activeLease: {
    id: ID;
    status: LeaseStatus;
    endDate: ISODateString;
    rentCents: number;
    unit: LeaseUnitSummary;
  } | null;
}

export interface TenantDirectoryResponse {
  tenants: TenantDirectoryEntry[];
  summary: {
    tenantCount: number;
    activeLeases: number;
    withoutActiveLease: number;
  };
}

export interface CreateTenantRequest {
  fullName: string;
  email: string;
  unitId?: ID;
  rentCents?: number;
  startDate?: ISODateString;
  endDate?: ISODateString;
}

export interface CreateTenantResponse {
  tenant: TenantDirectoryEntry;
  /** A one-time password the admin shares so the resident can sign in. */
  temporaryPassword: string;
}

// ---- Rental applications ----

export interface RentalApplication extends Timestamped {
  id: ID;
  organizationId: ID;
  unitId: ID;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string | null;
  monthlyIncomeCents: number | null;
  desiredMoveIn: ISODateString | null;
  status: ApplicationStatus;
  notes: string | null;
  submittedAt: ISODateString;
  unit: LeaseUnitSummary;
}

export interface ApplicationListResponse {
  applications: RentalApplication[];
  summary: {
    applicationCount: number;
    newCount: number;
    screeningCount: number;
    approvalRate: number;
  };
}

export interface CreateApplicationRequest {
  unitId: ID;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  monthlyIncomeCents?: number;
  desiredMoveIn?: ISODateString;
  notes?: string;
}

export interface UpdateApplicationRequest {
  status?: ApplicationStatus;
  notes?: string;
}

export interface ApplicationFormOptions {
  units: LeaseUnitSummary[];
}

/** A vacant unit shown on the public Available Homes browse page. */
export interface PublicListing {
  unitId: ID;
  label: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  marketRentCents: number;
  propertyId: ID;
  propertyName: string;
  propertyType: PropertyType;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  yearBuilt: number | null;
  /** Building notes / marketing description when set. */
  description: string | null;
  imageUrl: string | null;
  organizationId: ID;
  /** Highlighted facilities derived from the building type and unit size. */
  facilities: string[];
}

export interface PublicListingsResponse {
  listings: PublicListing[];
}

export type ListingInterest = 'RENT' | 'BUY';

export interface PublicInquiryRequest {
  unitId: ID;
  interest: ListingInterest;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  desiredMoveIn?: ISODateString;
  notes?: string;
}

export interface PublicInquiryResponse {
  message: string;
  applicationId: ID;
}

export interface ReportDashboardResponse {
  summary: {
    collectedCents: number;
    outstandingCents: number;
    occupancyRate: number;
  };
  cashFlow: {
    month: string;
    collected: number;
    outstanding: number;
  }[];
  occupancy: {
    property: string;
    occupancy: number;
  }[];
  reports: {
    id: string;
    report: string;
    category: string;
    period: string;
    generated: string;
    status: 'Ready';
  }[];
}

// ---- Messaging (conversations) ----

export interface MessageAuthor {
  id: ID;
  fullName: string;
  role: UserRole;
}

export interface Message {
  id: ID;
  conversationId: ID;
  body: string;
  createdAt: ISODateString;
  sender: MessageAuthor;
}

export interface Conversation extends Timestamped {
  id: ID;
  organizationId: ID;
  subject: string;
  participantIds: ID[];
  lastMessageAt: ISODateString;
  messageCount: number;
  lastMessage: Pick<Message, 'body' | 'createdAt'> & { senderName: string };
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export interface ConversationListResponse {
  conversations: Conversation[];
  summary: {
    conversationCount: number;
    unreadHint: number;
  };
}

/** Tenants a staff member can start a conversation with (their org's residents). */
export interface MessagingContact {
  id: ID;
  fullName: string;
  email: string;
}

export interface MessagingOptions {
  /** Populated for staff; empty for tenants (they message management directly). */
  contacts: MessagingContact[];
}

export interface CreateConversationRequest {
  subject: string;
  body: string;
  /** Required for staff: the tenant the thread is with. Ignored for tenants. */
  participantId?: ID;
}

export interface CreateMessageRequest {
  body: string;
}

// ---- Settings ----

/** Editable organization profile shown in Settings → Organization. */
export interface OrganizationProfile {
  id: ID;
  name: string;
  slug: string;
  subscriptionTier: SubscriptionTier;
  contactEmail: string | null;
  contactPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  websiteUrl: string | null;
}

/** Per-user notification channel preferences. */
export interface NotificationPreferences {
  notifyByEmail: boolean;
  notifyPayments: boolean;
  notifyMaintenance: boolean;
  notifyMessages: boolean;
  notifyAnnouncements: boolean;
}

/** The caller's own account details, editable in Settings → Profile. */
export interface AccountProfile {
  id: ID;
  fullName: string;
  email: string;
  role: UserRole;
}

/** Everything the Settings page needs for the current user, in one request. */
export interface SettingsResponse {
  profile: AccountProfile;
  /** Null if the account is not attached to an organization. */
  organization: OrganizationProfile | null;
  notifications: NotificationPreferences;
}

export interface UpdateOrganizationProfileRequest {
  name?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  websiteUrl?: string | null;
}

export type UpdateNotificationPreferencesRequest = Partial<NotificationPreferences>;

export interface UpdateProfileRequest {
  fullName?: string;
}

// ---- Dashboard summary (role-aware landing) ----

export interface DashboardMetric {
  key: string;
  label: string;
  /** Preformatted for display (currency, percentage, or count). */
  value: string;
  /** Short delta/context chip, e.g. "+12.5%" or "3 due". */
  delta: string;
  trend: 'up' | 'down' | 'neutral';
  /** One-line explanation shown under the value. */
  hint: string;
}

export interface DashboardTrendPoint {
  /** ISO day (yyyy-mm-dd). */
  date: ISODateString;
  primary: number;
  secondary: number;
}

export interface DashboardSummaryResponse {
  /** Four headline metrics tailored to the caller's role. */
  metrics: DashboardMetric[];
  trend: {
    title: string;
    subtitle: string;
    primaryLabel: string;
    secondaryLabel: string;
    /** Daily points for the last 90 days; the client slices to the range. */
    points: DashboardTrendPoint[];
  };
}

export interface AssignWorkOrderRequest {
  maintenanceRequestId: ID;
  assigneeId: ID;
  dueDate?: ISODateString;
  notes?: string;
}

export interface UpdateWorkOrderRequest {
  status?: WorkOrderStatus;
  dueDate?: ISODateString | null;
  notes?: string;
  completionNotes?: string;
  imageUrls?: string[];
}

export type {
  ApplicationStatus,
  InvitableRole,
  LeaseStatus,
  MaintenancePriority,
  MaintenanceStatus,
  PaymentStatus,
  PropertyType,
  SubscriptionTier,
  UnitStatus,
  UserRole,
  WorkOrderStatus,
};
