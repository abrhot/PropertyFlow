import * as SecureStore from 'expo-secure-store';
import type { TokenStore } from '@propertyflow/api-client';

const REFRESH_TOKEN_KEY = 'pf_refresh_token';

/**
 * Refresh-token storage for the mobile client, backed by the device keychain
 * (iOS Keychain / Android Keystore) via expo-secure-store. This is the mobile
 * equivalent of the web's httpOnly cookie.
 */
export const secureTokenStore: TokenStore = {
  async getRefreshToken() {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  async setRefreshToken(token) {
    if (token) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  },
};
