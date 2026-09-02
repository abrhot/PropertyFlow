import type {
  AssistantAttachment,
  AssistantCard,
  DashboardSummaryResponse,
  RequestUser,
} from '@propertyflow/types';

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantRequest {
  message: string;
  history?: AssistantMessage[];
  attachment?: AssistantAttachment;
}

export interface AssistantResponse {
  answer: string;
  mode: 'public' | 'workspace';
  contextUpdatedAt: string;
  cards: AssistantCard[];
}

export interface AssistantListing {
  unitId: string;
  unit: string;
  property: string;
  city: string;
  state: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  rent: string;
  imageUrl: string | null;
}

export interface AssistantListings {
  publicCount: number;
  orgCount?: number;
  homes: AssistantListing[];
}

export interface AssistantLeaseSummary {
  id: string;
  title: string;
  tenant: string;
  rent: string;
  deposit: string;
  start: string;
  end: string;
  status: string;
  notes: string | null;
}

export type AssistantIntent = 'homes' | 'dashboard' | 'lease' | 'maintenance' | 'general';

export interface AssistantContext {
  audience: 'visitor' | 'workspace-user';
  role?: RequestUser['role'];
  dashboard?: DashboardSummaryResponse;
  listings?: AssistantListings;
  leases?: AssistantLeaseSummary[];
  defaultLeaseId?: string;
  currentTime: string;
}

export interface WorkOrderDraft {
  title: string;
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}
