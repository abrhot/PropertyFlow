import type { ListLeasesParams } from '@propertyflow/api-client';

/** Query keys for leases, so mutations can invalidate precisely. */
export const leaseKeys = {
  all: ['leases'] as const,
  lists: () => [...leaseKeys.all, 'list'] as const,
  list: (params: ListLeasesParams) => [...leaseKeys.lists(), params] as const,
  detail: (id: string) => [...leaseKeys.all, 'detail', id] as const,
  options: () => [...leaseKeys.all, 'options'] as const,
};
