import { ApiError } from '@propertyflow/api-client';
import { getApiHostLabel } from './server-config';

function unreachable(): string {
  return `Cannot reach the server at ${getApiHostLabel()}. Check it is running, that you are on the same Wi‑Fi, then update the server address in Profile → Server.`;
}

/** Turn fetch / ApiError failures into a short message the user can act on. */
export function formatApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 0 || /network|failed to fetch|network request failed/i.test(err.message)) {
      return unreachable();
    }
    return err.message || fallback;
  }

  if (err instanceof TypeError || (err instanceof Error && /network/i.test(err.message))) {
    return unreachable();
  }

  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
