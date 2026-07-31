import type { ListMaintenanceParams, ListWorkOrdersParams } from '@propertyflow/api-client';

export const maintenanceKeys = {
  all: ['maintenance-requests'] as const,
  list: (params: ListMaintenanceParams) => [...maintenanceKeys.all, params] as const,
  options: () => [...maintenanceKeys.all, 'options'] as const,
};

export const workOrderKeys = {
  all: ['work-orders'] as const,
  list: (params: ListWorkOrdersParams) => [...workOrderKeys.all, params] as const,
};
