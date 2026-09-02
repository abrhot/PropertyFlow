import type { AssistantCard } from '@propertyflow/types';
import type {
  AssistantContext,
  AssistantIntent,
  AssistantLeaseSummary,
  WorkOrderDraft,
} from './assistant.types';

export function detectIntent(message: string, hasAttachment: boolean): AssistantIntent {
  const q = message.toLowerCase();
  if (hasAttachment && /(lease|agreement|contract|document|pdf)/.test(q)) return 'lease';
  if (hasAttachment && !/(lease|agreement|contract|document)/.test(q)) return 'maintenance';
  if (/(dashboard|occupancy|collected|outstanding|cash flow|how.*(doing|performing)|metrics|portfolio)/.test(q)) {
    return 'dashboard';
  }
  if (/(lease|agreement|renew|deposit|contract|document)/.test(q)) return 'lease';
  if (/(repair|maintenance|work order|technician|leak|hvac|broken|clog|issue|video|photo of)/.test(q)) {
    return 'maintenance';
  }
  if (/(home|listing|browse|vacant|available|unit|apartment|townhome|show me)/.test(q)) return 'homes';
  return 'general';
}

export function cardsFor(
  intent: AssistantIntent,
  context: AssistantContext,
  draft?: WorkOrderDraft,
): AssistantCard[] {
  if (intent === 'homes') return homeCards(context);
  if (intent === 'dashboard') return metricCards(context);
  if (intent === 'lease') return leaseCards(context);
  if (intent === 'maintenance' && draft) return [workOrderCard(context, draft)];
  return [];
}

export function homeCards(context: AssistantContext): AssistantCard[] {
  return (context.listings?.homes ?? []).slice(0, 6).map((home) => ({
    kind: 'home' as const,
    unitId: home.unitId,
    title: `${home.property} · ${home.unit}`,
    subtitle: home.address,
    imageUrl: home.imageUrl,
    href: `/homes?unit=${encodeURIComponent(home.unitId)}`,
    facts: [
      { label: 'Beds', value: home.bedrooms === 0 ? 'Studio' : String(home.bedrooms) },
      { label: 'Baths', value: String(home.bathrooms) },
      { label: 'Size', value: home.squareFeet ? `${home.squareFeet.toLocaleString()} sqft` : 'On request' },
      { label: 'Rent', value: home.rent },
    ],
  }));
}

export function metricCards(context: AssistantContext): AssistantCard[] {
  return (context.dashboard?.metrics ?? []).map((metric) => ({
    kind: 'metric' as const,
    label: metric.label,
    value: metric.value,
    hint: metric.delta ?? metric.hint,
    href: '/dashboard',
  }));
}

export function leaseCards(context: AssistantContext): AssistantCard[] {
  const href = context.role === 'TENANT' ? '/dashboard/my-lease' : '/dashboard/leases';
  return (context.leases ?? []).slice(0, 4).map((lease) => ({
    kind: 'lease' as const,
    id: lease.id,
    title: lease.title,
    href,
    facts: [
      { label: 'Resident', value: lease.tenant },
      { label: 'Rent', value: lease.rent },
      { label: 'Deposit', value: lease.deposit },
      { label: 'Term', value: `${lease.start} – ${lease.end}` },
      { label: 'Status', value: lease.status },
    ],
  }));
}

export function workOrderCard(context: AssistantContext, draft: WorkOrderDraft): AssistantCard {
  const path = context.role === 'TENANT' ? '/dashboard/my-requests' : '/dashboard/maintenance';
  const params = new URLSearchParams({
    title: draft.title,
    description: draft.description,
    priority: draft.priority,
  });
  return {
    kind: 'workOrder',
    title: draft.title,
    description: draft.description,
    priority: draft.priority,
    href: `${path}?${params.toString()}`,
    leaseId: context.defaultLeaseId,
  };
}

export function formatMoney(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export function toLeaseSummary(input: {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  rentCents: number;
  depositCents: number;
  notes: string | null;
  tenant: { fullName: string };
  unit: { label: string; propertyName: string };
}): AssistantLeaseSummary {
  return {
    id: input.id,
    title: `${input.unit.propertyName} · ${input.unit.label}`,
    tenant: input.tenant.fullName,
    rent: `${formatMoney(input.rentCents)}/mo`,
    deposit: formatMoney(input.depositCents),
    start: formatDay(input.startDate),
    end: formatDay(input.endDate),
    status: input.status,
    notes: input.notes,
  };
}

export function fallbackDraft(message: string): WorkOrderDraft {
  const q = message.toLowerCase();
  const priority = /(flood|fire|gas|no heat|spark|emergency|urgent)/.test(q)
    ? 'URGENT'
    : /(leak|broken|clog|no hot water|hvac)/.test(q)
      ? 'HIGH'
      : 'NORMAL';
  const title = /(leak)/.test(q)
    ? 'Water leak'
    : /(hvac|heat|ac|air)/.test(q)
      ? 'HVAC issue'
      : /(clog|drain|toilet)/.test(q)
        ? 'Plumbing issue'
        : message.trim().slice(0, 80) || 'Maintenance request';
  return {
    title,
    description: message.trim() || 'Resident reported an issue from the assistant.',
    priority,
  };
}

export function formatListingsText(listings?: AssistantContext['listings']): string {
  if (!listings) return 'unavailable';
  const count =
    listings.orgCount !== undefined
      ? `${listings.orgCount} vacant in this organization (${listings.publicCount} on Available Homes)`
      : `${listings.publicCount} vacant on Available Homes`;
  if (!listings.homes.length) return `${count}. None listed.`;
  return `${count}\n${listings.homes
    .map((home) => `${home.property} ${home.unit} · ${home.address} · ${home.bedrooms} bd · ${home.rent}`)
    .join('\n')}`;
}
