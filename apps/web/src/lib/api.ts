import { ApiClient } from '@propertyflow/api-client';

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';

/** Singleton API client for the browser. Access token is kept in memory only. */
export const api = new ApiClient({ baseUrl: `${baseUrl}/api` });
