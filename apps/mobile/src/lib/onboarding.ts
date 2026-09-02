import AsyncStorage from '@react-native-async-storage/async-storage';

const WELCOME_SEEN_KEY = 'pf_welcome_seen_v3';

let cached: boolean | null = null;
const listeners = new Set<(seen: boolean) => void>();

function notify(seen: boolean) {
  cached = seen;
  for (const listener of listeners) listener(seen);
}

/** Persists only a non-sensitive first-launch flag on this installation. */
export async function hasSeenWelcome(): Promise<boolean> {
  if (cached !== null) return cached;
  try {
    const seen = (await AsyncStorage.getItem(WELCOME_SEEN_KEY)) === '1';
    cached = seen;
    return seen;
  } catch {
    return false;
  }
}

export async function markWelcomeSeen(): Promise<void> {
  notify(true);
  try {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, '1');
  } catch {
    // Navigation may continue even when local persistence is unavailable.
  }
}

export function subscribeWelcomeSeen(listener: (seen: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
