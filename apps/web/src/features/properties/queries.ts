import type { ListPropertiesParams } from '@propertyflow/api-client';

/** Query keys for the portfolio, so mutations can invalidate precisely. */
export const propertyKeys = {
  all: ['properties'] as const,
  lists: () => [...propertyKeys.all, 'list'] as const,
  list: (params: ListPropertiesParams) => [...propertyKeys.lists(), params] as const,
  detail: (id: string) => [...propertyKeys.all, 'detail', id] as const,
  owners: () => [...propertyKeys.all, 'owners'] as const,
};
