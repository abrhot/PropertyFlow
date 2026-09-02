import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Where the PropertyFlow API lives.
 *
 * A phone cannot reach `localhost`, so a physical device must use the LAN
 * address of the machine running the API. That address changes whenever the
 * Wi-Fi network changes, so the value baked in at build time is only a default:
 * see `server-config.ts` for the user-editable runtime override.
 *
 * Default priority:
 * 1. `EXPO_PUBLIC_API_URL` env var
 * 2. `expo.extra.apiUrl` (written by `scripts/set-api-url.js` at build time)
 * 3. Android emulator loopback → host machine
 * 4. `localhost` (web / iOS simulator)
 */
const EXTRA_API_URL = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;

/** Strips a trailing slash and any `/api` suffix so we always store an origin. */
export function normalizeOrigin(input: string): string {
  let value = input.trim();
  if (!value) return value;
  if (!/^https?:\/\//i.test(value)) value = `http://${value}`;
  value = value.replace(/\/+$/, '');
  value = value.replace(/\/api$/i, '');
  return value;
}

/** An origin (`http://host:port`) becomes the client base URL (`.../api`). */
export function toApiBaseUrl(origin: string): string {
  return `${normalizeOrigin(origin)}/api`;
}

function resolveDefaultOrigin(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return normalizeOrigin(process.env.EXPO_PUBLIC_API_URL);
  if (EXTRA_API_URL) return normalizeOrigin(EXTRA_API_URL);
  // Emulators reach the host machine through a special alias.
  if (Platform.OS === 'android' && Constants.isDevice === false) return 'http://10.0.2.2:3001';
  return 'http://localhost:3001';
}

export const DEFAULT_API_ORIGIN = resolveDefaultOrigin();

/** Initial base URL; `loadApiOrigin()` may replace it with a saved override. */
export const API_BASE_URL = toApiBaseUrl(DEFAULT_API_ORIGIN);
