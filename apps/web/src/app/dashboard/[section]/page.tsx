import type { AppSection } from '@propertyflow/constants';
import { notFound } from 'next/navigation';
import { SectionPage } from '@/features/dashboard/section-page';

// `properties` and `settings` are intentionally absent: they have dedicated
// routes backed by real domain APIs rather than the generic preview page.
const SECTIONS_BY_SLUG = {
  organizations: 'organizations',
  billing: 'billing',
  leases: 'leases',
  applications: 'applications',
  payments: 'payments',
  maintenance: 'maintenance',
  'work-orders': 'work_orders',
  reports: 'reports',
  tenants: 'tenants',
  messages: 'messages',
  'my-lease': 'my_lease',
  'my-payments': 'my_payments',
  'my-requests': 'my_requests',
} as const satisfies Record<string, Exclude<AppSection, 'dashboard'>>;

export function generateStaticParams() {
  return Object.keys(SECTIONS_BY_SLUG).map((section) => ({ section }));
}

export default async function DashboardSectionRoute({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: slug } = await params;
  const section = SECTIONS_BY_SLUG[slug as keyof typeof SECTIONS_BY_SLUG];
  if (!section) notFound();

  return <SectionPage section={section} />;
}
