import { ApiClient } from '@propertyflow/api-client';
import { API_BASE_URL } from './config';
import { secureTokenStore } from './token-store';

/**
 * Singleton API client for the mobile app. Uses the token-based (mobile)
 * transport: the refresh token is persisted in the device keychain and sent in
 * the request body, since React Native has no httpOnly cookie jar.
 */
export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  clientType: 'mobile',
  tokenStore: secureTokenStore,
});
