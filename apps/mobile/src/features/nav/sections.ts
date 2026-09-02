import type { Ionicons } from '@expo/vector-icons';
import type { AppSection } from '@propertyflow/constants';
import type { Href } from 'expo-router';

/**
 * Mobile counterpart of the web sidebar. Each entry maps a permission section to
 * the route that implements it on mobile, so navigation stays derived from the
 * user's ability rules instead of hardcoded per role.
 */
export interface SectionEntry {
  section: AppSection;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
  /** Sections already reachable from the bottom tab bar are hidden in the hub. */
  inTabBar?: boolean;
}

export const SECTION_ENTRIES: SectionEntry[] = [
  {
    section: 'dashboard',
    label: 'Overview',
    description: 'Headline numbers for your role',
    icon: 'grid-outline',
    href: '/(tabs)',
    inTabBar: true,
  },
  {
    section: 'properties',
    label: 'Properties',
    description: 'Buildings, units, and occupancy',
    icon: 'business-outline',
    href: '/properties',
  },
  {
    section: 'leases',
    label: 'Leases',
    description: 'Agreements, terms, and rent',
    icon: 'document-text-outline',
    href: '/leases',
  },
  {
    section: 'tenants',
    label: 'Residents',
    description: 'Directory and onboarding',
    icon: 'people-outline',
    href: '/tenants',
  },
  {
    section: 'applications',
    label: 'Inquiries',
    description: 'Applications from public listings',
    icon: 'clipboard-outline',
    href: '/applications',
  },
  {
    section: 'payments',
    label: 'Payments',
    description: 'Rent collection and arrears',
    icon: 'wallet-outline',
    href: '/(tabs)/payments',
    inTabBar: true,
  },
  {
    section: 'maintenance',
    label: 'Maintenance',
    description: 'Requests and approvals',
    icon: 'construct-outline',
    href: '/(tabs)/maintenance',
    inTabBar: true,
  },
  {
    section: 'work_orders',
    label: 'Work orders',
    description: 'Jobs assigned to you',
    icon: 'hammer-outline',
    href: '/(tabs)/maintenance',
    inTabBar: true,
  },
  {
    section: 'reports',
    label: 'Reports',
    description: 'Cash flow and occupancy',
    icon: 'bar-chart-outline',
    href: '/reports',
  },
  {
    section: 'messages',
    label: 'Messages',
    description: 'Conversations with residents',
    icon: 'chatbubbles-outline',
    href: '/(tabs)/messages',
    inTabBar: true,
  },
  {
    section: 'my_lease',
    label: 'My lease',
    description: 'Your agreement and home',
    icon: 'home-outline',
    href: '/lease',
  },
  {
    section: 'my_payments',
    label: 'Pay rent',
    description: 'Balance and payment history',
    icon: 'wallet-outline',
    href: '/(tabs)/payments',
    inTabBar: true,
  },
  {
    section: 'my_requests',
    label: 'My requests',
    description: 'Maintenance you have reported',
    icon: 'construct-outline',
    href: '/(tabs)/maintenance',
    inTabBar: true,
  },
  {
    section: 'team',
    label: 'Team',
    description: 'Invites and building assignments',
    icon: 'shield-checkmark-outline',
    href: '/team',
  },
  {
    section: 'settings',
    label: 'Settings',
    description: 'Profile, organization, and server',
    icon: 'settings-outline',
    href: '/settings',
  },
];

/**
 * Hub entries for the Manage tab: everything the user can reach that is not
 * already a bottom tab.
 *
 * `Lease` is included whenever the user can read the subject even though no role
 * is granted the `leases` section — that grant is missing upstream, and staff
 * still need lease access on mobile.
 */
export function hubEntriesFor(sections: AppSection[], canReadLease: boolean): SectionEntry[] {
  return SECTION_ENTRIES.filter((entry) => {
    if (entry.inTabBar) return false;
    if (entry.section === 'leases') return canReadLease;
    return sections.includes(entry.section);
  });
}

/**
 * Sections that make someone "staff" for navigation purposes. Residents and
 * technicians reach their handful of extra screens from the profile tab instead,
 * which keeps their tab bar short.
 */
const STAFF_SECTIONS: AppSection[] = ['properties', 'tenants', 'applications', 'reports', 'team'];

export function hasHubSections(sections: AppSection[]): boolean {
  return STAFF_SECTIONS.some((section) => sections.includes(section));
}
