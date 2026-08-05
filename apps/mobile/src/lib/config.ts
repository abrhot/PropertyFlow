import Constants from 'expo-constants';

/**
 * Base URL of the PropertyFlow API.
 *
 * Priority: `EXPO_PUBLIC_API_URL` env var → `expo.extra.apiUrl` (app.json) →
 * localhost. On a physical device use your machine's LAN IP (e.g.
 * `http://192.168.1.20:3001`) because `localhost` points at the device itself.
 */
const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? fromExtra ?? 'http://localhost:3001';

export const API_BASE_URL = `${rawBaseUrl.replace(/\/$/, '')}/api`;
