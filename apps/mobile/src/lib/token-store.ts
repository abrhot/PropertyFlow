import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TokenStore } from '@propertyflow/api-client';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'pf_refresh_token';

/**
 * Refresh-token storage for the mobile client.
 * - Native: device keychain via expo-secure-store
 * - Web (Expo web / browser debug): AsyncStorage fallback — SecureStore is
 *   unavailable in browsers
 */
export const secureTokenStore: TokenStore = {
  async getRefreshToken() {
    try {
      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      }
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  async setRefreshToken(token) {
    try {
      if (Platform.OS === 'web') {
        if (token) await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
        else await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
        return;
      }
      if (token) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
      else await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      // Ignore storage failures; the next login will recreate the session.
    }
  },
};
