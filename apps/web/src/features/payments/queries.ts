import type { ListPaymentsParams } from '@propertyflow/api-client';

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (params: ListPaymentsParams) => [...paymentKeys.lists(), params] as const,
  options: () => [...paymentKeys.all, 'options'] as const,
};
