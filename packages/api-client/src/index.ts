/**
 * Typed PropertyFlow API client (SDK) used by web and mobile.
 *
 * Design notes:
 * - The refresh token is an httpOnly cookie managed by the server; this client
 *   never reads/writes it. It only holds the short-lived access token in memory.
 * - On a 401 it will try `POST /auth/refresh` once (using the cookie) and retry
 *   the original request, so callers rarely deal with token expiry directly.
 */

import type {
  AccountProfile,
  AcceptInvitationRequest,
  ApplicationFormOptions,
  ApplicationListResponse,
  AuthResponse,
  BillingOverviewResponse,
  NotificationPreferences,
  OrganizationProfile,
  SettingsResponse,
  UpdateNotificationPreferencesRequest,
  UpdateOrganizationProfileRequest,
  UpdateProfileRequest,
  Conversation,
  ConversationDetail,
  ConversationListResponse,
  DashboardSummaryResponse,
  CreateConversationRequest,
  CreateInvitationRequest,
  CreateInvitationResponse,
  CreateApplicationRequest,
  CreateLeaseRequest,
  CreateMaintenanceRequestRequest,
  CreateMessageRequest,
  CreatePaymentRequest,
  CreatePropertyRequest,
  CreateUnitRequest,
  ForgotPasswordRequest,
  Message,
  MessagingOptions,
  OrganizationListResponse,
  PlatformOrganization,
  UpdateOrganizationRequest,
  InvitationPreview,
  InvitationTokenRequest,
  Lease,
  LeaseFormOptions,
  LeaseListResponse,
  LeaseStatus,
  MaintenanceFormOptions,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceRequestListResponse,
  MaintenanceStatus,
  Payment,
  PaymentFormOptions,
  PaymentListResponse,
  PaymentStatus,
  LoginRequest,
  OrganizationInvitationSummary,
  Property,
  PropertyDetail,
  PropertyListResponse,
  PropertyOwnerSummary,
  PropertyType,
  RegisterRequest,
  ReportDashboardResponse,
  RentalApplication,
  ResetPasswordRequest,
  SessionResponse,
  TenantDirectoryResponse,
  Unit,
  UpdateLeaseRequest,
  UpdateApplicationRequest,
  UpdateMaintenanceRequestRequest,
  UpdatePaymentRequest,
  UpdatePropertyRequest,
  UpdateUnitRequest,
  UpdateWorkOrderRequest,
  WorkOrder,
  WorkOrderListResponse,
  WorkOrderStatus,
  AssignWorkOrderRequest,
} from '@propertyflow/types';

export interface ListPropertiesParams {
  search?: string;
  type?: PropertyType;
  includeInactive?: boolean;
}

export interface ListLeasesParams {
  status?: LeaseStatus;
  unitId?: string;
  tenantId?: string;
  search?: string;
}

export interface ListPaymentsParams {
  status?: PaymentStatus;
  leaseId?: string;
  tenantId?: string;
  search?: string;
}

export interface ListMaintenanceParams {
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  search?: string;
}

export interface ListWorkOrdersParams {
  status?: WorkOrderStatus;
  search?: string;
}

export interface ListTenantsParams {
  search?: string;
  includeInactive?: boolean;
}

export interface ListApplicationsParams {
  status?: import('@propertyflow/types').ApplicationStatus;
  search?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Called whenever the access token changes (login/refresh/logout). */
  onAccessTokenChange?: (token: string | null) => void;
  /** Provide an initial access token (e.g. restored from memory). */
  accessToken?: string | null;
}

export class ApiClient {
  private baseUrl: string;
  private accessToken: string | null;
  private onAccessTokenChange?: (token: string | null) => void;
  private refreshing: Promise<boolean> | null = null;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.accessToken = options.accessToken ?? null;
    this.onAccessTokenChange = options.onAccessTokenChange;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
    this.onAccessTokenChange?.(token);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(path: string, init: RequestInit = {}, retryOn401 = true): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    if (this.accessToken) headers.set('Authorization', `Bearer ${this.accessToken}`);

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      credentials: 'include', // send/receive the httpOnly refresh cookie
    });

    if (res.status === 401 && retryOn401 && path !== '/auth/refresh') {
      const refreshed = await this.tryRefresh();
      if (refreshed) return this.request<T>(path, init, false);
    }

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await res.json().catch(() => undefined) : undefined;

    if (!res.ok) {
      const message =
        (body && typeof body === 'object' && 'message' in body && String(body.message)) ||
        `Request failed with status ${res.status}`;
      throw new ApiError(res.status, message, body);
    }

    return body as T;
  }

  /** De-duplicated refresh: concurrent 401s share a single refresh call. */
  private tryRefresh(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = this.request<AuthResponse>('/auth/refresh', { method: 'POST' }, false)
        .then((res) => {
          this.setAccessToken(res.accessToken);
          return true;
        })
        .catch(() => {
          this.setAccessToken(null);
          return false;
        })
        .finally(() => {
          this.refreshing = null;
        });
    }
    return this.refreshing;
  }

  // ---- Auth endpoints ----

  async register(input: RegisterRequest): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    this.setAccessToken(res.accessToken);
    return res;
  }

  async login(input: LoginRequest): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    this.setAccessToken(res.accessToken);
    return res;
  }

  async logout(): Promise<void> {
    try {
      await this.request<void>('/auth/logout', { method: 'POST' }, false);
    } finally {
      this.setAccessToken(null);
    }
  }

  me(): Promise<SessionResponse> {
    return this.request<SessionResponse>('/auth/me', { method: 'GET' });
  }

  forgotPassword(input: ForgotPasswordRequest): Promise<{ message: string; devToken?: string }> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  resetPassword(input: ResetPasswordRequest): Promise<{ message: string }> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ---- Organization invitations ----

  listInvitations(): Promise<OrganizationInvitationSummary[]> {
    return this.request('/invitations', { method: 'GET' });
  }

  createInvitation(input: CreateInvitationRequest): Promise<CreateInvitationResponse> {
    return this.request('/invitations', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  revokeInvitation(id: string): Promise<{ message: string }> {
    return this.request(`/invitations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  previewInvitation(input: InvitationTokenRequest): Promise<InvitationPreview> {
    return this.request('/invitations/preview', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async acceptInvitation(input: AcceptInvitationRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    this.setAccessToken(response.accessToken);
    return response;
  }

  // ---- Properties & units ----

  listProperties(params: ListPropertiesParams = {}): Promise<PropertyListResponse> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.type) query.set('type', params.type);
    if (params.includeInactive) query.set('includeInactive', 'true');
    const suffix = query.size ? `?${query.toString()}` : '';
    return this.request(`/properties${suffix}`, { method: 'GET' });
  }

  listPropertyOwners(): Promise<PropertyOwnerSummary[]> {
    return this.request('/properties/owners', { method: 'GET' });
  }

  getProperty(id: string): Promise<PropertyDetail> {
    return this.request(`/properties/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  createProperty(input: CreatePropertyRequest): Promise<Property> {
    return this.request('/properties', { method: 'POST', body: JSON.stringify(input) });
  }

  updateProperty(id: string, input: UpdatePropertyRequest): Promise<Property> {
    return this.request(`/properties/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  deleteProperty(id: string): Promise<{ message: string }> {
    return this.request(`/properties/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  createUnit(propertyId: string, input: CreateUnitRequest): Promise<Unit> {
    return this.request(`/properties/${encodeURIComponent(propertyId)}/units`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateUnit(propertyId: string, unitId: string, input: UpdateUnitRequest): Promise<Unit> {
    return this.request(
      `/properties/${encodeURIComponent(propertyId)}/units/${encodeURIComponent(unitId)}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    );
  }

  deleteUnit(propertyId: string, unitId: string): Promise<{ message: string }> {
    return this.request(
      `/properties/${encodeURIComponent(propertyId)}/units/${encodeURIComponent(unitId)}`,
      { method: 'DELETE' },
    );
  }

  // ---- Leases ----

  listLeases(params: ListLeasesParams = {}): Promise<LeaseListResponse> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.unitId) query.set('unitId', params.unitId);
    if (params.tenantId) query.set('tenantId', params.tenantId);
    if (params.search) query.set('search', params.search);
    const suffix = query.size ? `?${query.toString()}` : '';
    return this.request(`/leases${suffix}`, { method: 'GET' });
  }

  listLeaseFormOptions(): Promise<LeaseFormOptions> {
    return this.request('/leases/options', { method: 'GET' });
  }

  getLease(id: string): Promise<Lease> {
    return this.request(`/leases/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  createLease(input: CreateLeaseRequest): Promise<Lease> {
    return this.request('/leases', { method: 'POST', body: JSON.stringify(input) });
  }

  updateLease(id: string, input: UpdateLeaseRequest): Promise<Lease> {
    return this.request(`/leases/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  deleteLease(id: string): Promise<{ message: string }> {
    return this.request(`/leases/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  // ---- Payments ----

  listPayments(params: ListPaymentsParams = {}): Promise<PaymentListResponse> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.leaseId) query.set('leaseId', params.leaseId);
    if (params.tenantId) query.set('tenantId', params.tenantId);
    if (params.search) query.set('search', params.search);
    const suffix = query.size ? `?${query.toString()}` : '';
    return this.request(`/payments${suffix}`, { method: 'GET' });
  }

  listPaymentFormOptions(): Promise<PaymentFormOptions> {
    return this.request('/payments/options', { method: 'GET' });
  }

  createPayment(input: CreatePaymentRequest): Promise<Payment> {
    return this.request('/payments', { method: 'POST', body: JSON.stringify(input) });
  }

  updatePayment(id: string, input: UpdatePaymentRequest): Promise<Payment> {
    return this.request(`/payments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  payPayment(id: string): Promise<Payment> {
    return this.request(`/payments/${encodeURIComponent(id)}/pay`, { method: 'POST' });
  }

  // ---- Maintenance ----

  listMaintenanceRequests(params: ListMaintenanceParams = {}): Promise<MaintenanceRequestListResponse> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.priority) query.set('priority', params.priority);
    if (params.search) query.set('search', params.search);
    const suffix = query.size ? `?${query.toString()}` : '';
    return this.request(`/maintenance-requests${suffix}`, { method: 'GET' });
  }

  listMaintenanceOptions(): Promise<MaintenanceFormOptions> {
    return this.request('/maintenance-requests/options', { method: 'GET' });
  }

  createMaintenanceRequest(input: CreateMaintenanceRequestRequest): Promise<MaintenanceRequest> {
    return this.request('/maintenance-requests', { method: 'POST', body: JSON.stringify(input) });
  }

  updateMaintenanceRequest(
    id: string,
    input: UpdateMaintenanceRequestRequest,
  ): Promise<MaintenanceRequest> {
    return this.request(`/maintenance-requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  listWorkOrders(params: ListWorkOrdersParams = {}): Promise<WorkOrderListResponse> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    const suffix = query.size ? `?${query.toString()}` : '';
    return this.request(`/work-orders${suffix}`, { method: 'GET' });
  }

  assignWorkOrder(input: AssignWorkOrderRequest): Promise<WorkOrder> {
    return this.request('/work-orders', { method: 'POST', body: JSON.stringify(input) });
  }

  updateWorkOrder(id: string, input: UpdateWorkOrderRequest): Promise<WorkOrder> {
    return this.request(`/work-orders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  listTenants(params: ListTenantsParams = {}): Promise<TenantDirectoryResponse> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.includeInactive) query.set('includeInactive', 'true');
    const suffix = query.size ? `?${query.toString()}` : '';
    return this.request(`/tenants${suffix}`, { method: 'GET' });
  }

  listApplications(params: ListApplicationsParams = {}): Promise<ApplicationListResponse> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    const suffix = query.size ? `?${query.toString()}` : '';
    return this.request(`/applications${suffix}`, { method: 'GET' });
  }

  listApplicationOptions(): Promise<ApplicationFormOptions> {
    return this.request('/applications/options', { method: 'GET' });
  }

  createApplication(input: CreateApplicationRequest): Promise<RentalApplication> {
    return this.request('/applications', { method: 'POST', body: JSON.stringify(input) });
  }

  updateApplication(id: string, input: UpdateApplicationRequest): Promise<RentalApplication> {
    return this.request(`/applications/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) });
  }

  getReportDashboard(): Promise<ReportDashboardResponse> {
    return this.request('/reports/dashboard', { method: 'GET' });
  }

  getDashboardSummary(): Promise<DashboardSummaryResponse> {
    return this.request('/dashboard/summary', { method: 'GET' });
  }

  // ---- Messaging ----

  listConversations(params: { search?: string } = {}): Promise<ConversationListResponse> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    const suffix = query.size ? `?${query.toString()}` : '';
    return this.request(`/conversations${suffix}`, { method: 'GET' });
  }

  listMessagingOptions(): Promise<MessagingOptions> {
    return this.request('/conversations/options', { method: 'GET' });
  }

  getConversation(id: string): Promise<ConversationDetail> {
    return this.request(`/conversations/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  createConversation(input: CreateConversationRequest): Promise<ConversationDetail> {
    return this.request('/conversations', { method: 'POST', body: JSON.stringify(input) });
  }

  sendMessage(conversationId: string, input: CreateMessageRequest): Promise<Message> {
    return this.request(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ---- Platform administration ----

  listOrganizations(params: { search?: string } = {}): Promise<OrganizationListResponse> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    const suffix = query.size ? `?${query.toString()}` : '';
    return this.request(`/organizations${suffix}`, { method: 'GET' });
  }

  updateOrganization(id: string, input: UpdateOrganizationRequest): Promise<PlatformOrganization> {
    return this.request(`/organizations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  getBillingOverview(): Promise<BillingOverviewResponse> {
    return this.request('/billing/overview', { method: 'GET' });
  }

  // ---- Settings ----

  getSettings(): Promise<SettingsResponse> {
    return this.request('/settings', { method: 'GET' });
  }

  updateOrganizationProfile(
    input: UpdateOrganizationProfileRequest,
  ): Promise<OrganizationProfile> {
    return this.request('/settings/organization', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  updateNotificationPreferences(
    input: UpdateNotificationPreferencesRequest,
  ): Promise<NotificationPreferences> {
    return this.request('/settings/notifications', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  updateProfile(input: UpdateProfileRequest): Promise<AccountProfile> {
    return this.request('/settings/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }
}

export type { AuthResponse, AuthUser } from '@propertyflow/types';
