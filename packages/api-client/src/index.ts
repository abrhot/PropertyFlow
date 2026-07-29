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
  AcceptInvitationRequest,
  AuthResponse,
  AuthUser,
  CreateInvitationRequest,
  CreateInvitationResponse,
  CreateLeaseRequest,
  CreatePropertyRequest,
  CreateUnitRequest,
  ForgotPasswordRequest,
  InvitationPreview,
  InvitationTokenRequest,
  Lease,
  LeaseFormOptions,
  LeaseListResponse,
  LeaseStatus,
  LoginRequest,
  OrganizationInvitationSummary,
  Property,
  PropertyDetail,
  PropertyListResponse,
  PropertyOwnerSummary,
  PropertyType,
  RegisterRequest,
  ResetPasswordRequest,
  Unit,
  UpdateLeaseRequest,
  UpdatePropertyRequest,
  UpdateUnitRequest,
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

  me(): Promise<AuthUser> {
    return this.request<AuthUser>('/auth/me', { method: 'GET' });
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
}

export type { AuthResponse, AuthUser } from '@propertyflow/types';
