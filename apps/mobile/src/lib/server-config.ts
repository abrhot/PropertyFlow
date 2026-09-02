import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { DEFAULT_API_ORIGIN, normalizeOrigin, toApiBaseUrl } from './config';

/**
 * Runtime-editable API origin. A device's reachable server address depends on
 * the Wi-Fi network, so users can repoint the app from the profile screen
 * instead of needing a new build.
 */
const STORAGE_KEY = 'pf_api_origin_v1';

let currentOrigin = DEFAULT_API_ORIGIN;

export function getApiOrigin(): string {
  return currentOrigin;
}

/** Host:port only — used in "cannot reach the server" messages. */
export function getApiHostLabel(): string {
  return currentOrigin.replace(/^https?:\/\//i, '');
}

export function getDefaultApiOrigin(): string {
  return DEFAULT_API_ORIGIN;
}

function apply(origin: string): void {
  currentOrigin = origin;
  api.setBaseUrl(toApiBaseUrl(origin));
}

/** Called once at startup, before any request is made. */
export async function loadApiOrigin(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    apply(stored ? normalizeOrigin(stored) : DEFAULT_API_ORIGIN);
  } catch {
    apply(DEFAULT_API_ORIGIN);
  }
  return currentOrigin;
}

export async function saveApiOrigin(input: string): Promise<string> {
  const origin = normalizeOrigin(input);
  apply(origin);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, origin);
  } catch {
    // A failed write only means the override won't survive a restart.
  }
  return origin;
}

export async function resetApiOrigin(): Promise<string> {
  apply(DEFAULT_API_ORIGIN);
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — the in-memory value is already reset.
  }
  return currentOrigin;
}

/** Probes `/api/health` so users get instant feedback on an address. */
export async function testApiOrigin(input: string): Promise<{ ok: boolean; message: string }> {
  const origin = normalizeOrigin(input);
  if (!origin) return { ok: false, message: 'Enter a server address first.' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${toApiBaseUrl(origin)}/health`, { signal: controller.signal });
    if (!res.ok) return { ok: false, message: `Server replied with ${res.status}.` };
    return { ok: true, message: `Connected to ${origin.replace(/^https?:\/\//i, '')}` };
  } catch {
    return { ok: false, message: `No response from ${origin.replace(/^https?:\/\//i, '')}` };
  } finally {
    clearTimeout(timeout);
  }
}
