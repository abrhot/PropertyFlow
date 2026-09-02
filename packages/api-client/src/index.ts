/**
 * Typed PropertyFlow API client (SDK) used by web and mobile.
 *
 * Two auth transports share the exact same endpoints:
 * - `web` (default): the refresh token lives in an httpOnly cookie managed by
 *   the server. This client never reads/writes it and only holds the short-lived
 *   access token in memory. On a 401 it calls `POST /auth/refresh` (using the
 *   cookie) once and retries the original request.
 * - `mobile`: React Native has no reliable cookie jar, so the refresh token is
 *   returned in the auth response body and persisted through a {@link TokenStore}
 *   (e.g. Expo SecureStore). Refreshes send that token in the request body.
 *
 * Callers rarely deal with token expiry directly.
 */

import type {
  AccountProfile,
  AcceptInvitationRequest,
  ApplicationFormOptions,
  ApplicationListResponse,
  AuthResponse,
  NotificationPreferences,
  OrganizationProfile,
  SettingsResponse,
  UpdateNotificationPreferencesRequest,
  UpdateOrganizationProfileRequest,
  UpdateProfileRequest,
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
  ManagerAssignmentsResponse,
  ManagerSummary,
  AppNotification,
  NotificationListResponse,
  UnreadCountResponse,
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
  CreateTenantRequest,
  CreateTenantResponse,
  PublicInquiryRequest,
  PublicInquiryResponse,
  PublicListingsResponse,
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
  AssistantAttachment,
  AssistantCard,
  AssistantChatResponse,
} from '@propertyflow/types';

export type {
  AssistantAttachment,
  AssistantCard,
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantFact,
  AssistantHomeCard,
  AssistantLeaseCard,
  AssistantMetricCard,
  AssistantWorkOrderCard,
} from '@propertyflow/types';

export interface AssistantChatMessage {
  role: 'user' | 'assistant';
  content: string;
  cards?: AssistantCard[];
}

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

/**
 * Persists the refresh token for token-based (mobile) clients. Web clients use
 * an httpOnly cookie instead and never provide a store. Methods may be sync or
 * async so implementations can wrap secure device storage.
 */
export interface TokenStore {
  getRefreshToken(): string | null | Promise<string | null>;
  setRefreshToken(token: string | null): void | Promise<void>;
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Called whenever the access token changes (login/refresh/logout). */
  onAccessTokenChange?: (token: string | null) => void;
  /** Provide an initial access token (e.g. restored from memory). */
  accessToken?: string | null;
  /**
   * Transport for the refresh token. `web` (default) relies on the httpOnly
   * cookie; `mobile` reads/writes the refresh token from {@link TokenStore}.
   */
  clientType?: 'web' | 'mobile';
  /** Required when `clientType` is `mobile`. */
  tokenStore?: TokenStore;
}

export class ApiClient {
  private baseUrl: string;
  private accessToken: string | null;
  private onAccessTokenChange?: (token: string | null) => void;
  private refreshing: Promise<boolean> | null = null;
  private readonly clientType: 'web' | 'mobile';
  private readonly tokenStore?: TokenStore;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.accessToken = options.accessToken ?? null;
    this.onAccessTokenChange = options.onAccessTokenChange;
    this.clientType = options.clientType ?? 'web';
    this.tokenStore = options.tokenStore;
  }

  private get isMobile(): boolean {
    return this.clientType === 'mobile';
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
    this.onAccessTokenChange?.(token);
  }

  /**
   * Repoints the client at a different API origin at runtime. Mobile uses this
   * so a device can be aimed at a new LAN address without a rebuild.
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Persists any refresh token returned in an auth response (mobile transport
   * only) so the next app launch / 401 can silently refresh.
   */
  private async captureSession(res: AuthResponse): Promise<AuthResponse> {
    this.setAccessToken(res.accessToken);
    if (this.isMobile && this.tokenStore && res.refreshToken) {
      await this.tokenStore.setRefreshToken(res.refreshToken);
    }
    return res;
  }

  /**
   * Restores a session on app launch (mobile): if a refresh token is stored it
   * exchanges it for a fresh access token. Returns true when a session is live.
   */
  async bootstrap(): Promise<boolean> {
    if (this.isMobile) {
      const stored = await this.tokenStore?.getRefreshToken();
      if (!stored) return false;
    }
    return this.tryRefresh();
  }

  private async request<T>(path: string, init: RequestInit = {}, retryOn401 = true): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    if (this.accessToken) headers.set('Authorization', `Bearer ${this.accessToken}`);
    // Signals the API to return the refresh token in the body instead of a cookie.
    if (this.isMobile) headers.set('X-Client-Type', 'mobile');

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        credentials: 'include', // web: send/receive the httpOnly refresh cookie (no-op on RN)
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Network request failed';
      throw new ApiError(0, `Network request failed (${detail})`, { path, baseUrl: this.baseUrl });
    }

    if (res.status === 401 && retryOn401 && path !== '/auth/refresh') {
      const refreshed = await this.tryRefresh();
      if (refreshed) return this.request<T>(path, init, false);
    }

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await res.json().catch(() => undefined) : undefined;

    if (!res.ok) {
      const rawMessage =
        body && typeof body === 'object' && 'message' in body ? (body as { message: unknown }).message : undefined;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : (typeof rawMessage === 'string' && rawMessage) || `Request failed with status ${res.status}`;
      throw new ApiError(res.status, message, body);
    }

    return body as T;
  }

  /** De-duplicated refresh: concurrent 401s share a single refresh call. */
  private tryRefresh(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = this.performRefresh()
        .then(async (res) => {
          await this.captureSession(res);
          return true;
        })
        .catch(async () => {
          this.setAccessToken(null);
          if (this.isMobile) await this.tokenStore?.setRefreshToken(null);
          return false;
        })
        .finally(() => {
          this.refreshing = null;
        });
    }
    return this.refreshing;
  }

  private async performRefresh(): Promise<AuthResponse> {
    // Mobile sends the stored refresh token in the body; web relies on the cookie.
    let init: RequestInit = { method: 'POST' };
    if (this.isMobile) {
      const stored = await this.tokenStore?.getRefreshToken();
      if (!stored) throw new ApiError(401, 'No stored refresh token');
      init = { method: 'POST', body: JSON.stringify({ refreshToken: stored }) };
    }
    return this.request<AuthResponse>('/auth/refresh', init, false);
  }

  // ---- Auth endpoints ----

  async register(input: RegisterRequest): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return this.captureSession(res);
  }

  async login(input: LoginRequest): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return this.captureSession(res);
  }

  async logout(): Promise<void> {
    try {
      const body =
        this.isMobile && this.tokenStore
          ? JSON.stringify({ refreshToken: await this.tokenStore.getRefreshToken() })
          : undefined;
      await this.request<void>('/auth/logout', { method: 'POST', body }, false);
    } finally {
      this.setAccessToken(null);
      if (this.isMobile) await this.tokenStore?.setRefreshToken(null);
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
    return this.captureSession(response);
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

  /** Admin-only: property managers and the buildings assigned to each. */
  listManagerAssignments(): Promise<ManagerAssignmentsResponse> {
    return this.request('/properties/managers', { method: 'GET' });
  }

  /** Admin-only: set exactly which buildings a manager is responsible for. */
  setManagerProperties(managerId: string, propertyIds: string[]): Promise<ManagerSummary> {
    return this.request(`/properties/managers/${encodeURIComponent(managerId)}`, {
      method: 'PUT',
      body: JSON.stringify({ propertyIds }),
    });
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

  // ---- Notifications ----

  listNotifications(): Promise<NotificationListResponse> {
    return this.request('/notifications', { method: 'GET' });
  }

  getUnreadNotificationCount(): Promise<UnreadCountResponse> {
    return this.request('/notifications/unread-count', { method: 'GET' });
  }

  markNotificationRead(id: string): Promise<AppNotification> {
    return this.request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
  }

  markAllNotificationsRead(): Promise<UnreadCountResponse> {
    return this.request('/notifications/read-all', { method: 'POST' });
  }

  listTenants(params: ListTenantsParams = {}): Promise<TenantDirectoryResponse> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.includeInactive) query.set('includeInactive', 'true');
    const suffix = query.size ? `?${query.toString()}` : '';
    return this.request(`/tenants${suffix}`, { method: 'GET' });
  }

  createTenant(input: CreateTenantRequest): Promise<CreateTenantResponse> {
    return this.request('/tenants', { method: 'POST', body: JSON.stringify(input) });
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

  /** Public — vacant homes anyone can browse before signing in. */
  listPublicListings(params: { search?: string } = {}): Promise<PublicListingsResponse> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    const suffix = query.size ? `?${query.toString()}` : '';
    return this.request(`/listings${suffix}`, { method: 'GET' });
  }

  /** Public — submit a rent or buy inquiry that lands in the admin Inquiries inbox. */
  submitPublicInquiry(input: PublicInquiryRequest): Promise<PublicInquiryResponse> {
    return this.request('/listings/inquire', { method: 'POST', body: JSON.stringify(input) });
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

  chatWithAssistant(input: {
    message: string;
    history?: AssistantChatMessage[];
    attachment?: AssistantAttachment;
  }): Promise<AssistantChatResponse> {
    return this.request('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: input.message,
        history: input.history?.map(({ role, content }) => ({ role, content })),
        attachment: input.attachment,
      }),
    });
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
