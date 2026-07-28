import type { AppSection } from '@propertyflow/constants';
import {
  BarChart3,
  Boxes,
  Building2,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SectionMeta {
  label: string;
  description: string;
  icon: LucideIcon;
  path: string;
}

export const SECTION_META: Record<AppSection, SectionMeta> = {
  dashboard: {
    label: 'Dashboard',
    description: 'Your overview',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  organizations: {
    label: 'Organizations',
    description: 'Manage tenant companies on the platform',
    icon: Boxes,
    path: '/dashboard/organizations',
  },
  billing: {
    label: 'Billing',
    description: 'Subscriptions & platform revenue',
    icon: CreditCard,
    path: '/dashboard/billing',
  },
  properties: {
    label: 'Properties',
    description: 'Buildings and units',
    icon: Building2,
    path: '/dashboard/properties',
  },
  leases: {
    label: 'Leases',
    description: 'Agreements and renewals',
    icon: FileText,
    path: '/dashboard/leases',
  },
  applications: {
    label: 'Applications',
    description: 'Listings, applicants & screening',
    icon: ClipboardList,
    path: '/dashboard/applications',
  },
  payments: {
    label: 'Payments',
    description: 'Rent collection & ledgers',
    icon: CircleDollarSign,
    path: '/dashboard/payments',
  },
  maintenance: {
    label: 'Maintenance',
    description: 'Requests and work orders',
    icon: Wrench,
    path: '/dashboard/maintenance',
  },
  work_orders: {
    label: 'Work Orders',
    description: 'Jobs assigned to you',
    icon: ClipboardCheck,
    path: '/dashboard/work-orders',
  },
  reports: {
    label: 'Reports',
    description: 'Financial & operational reports',
    icon: BarChart3,
    path: '/dashboard/reports',
  },
  tenants: {
    label: 'Tenants',
    description: 'People and their leases',
    icon: Users,
    path: '/dashboard/tenants',
  },
  messages: {
    label: 'Messages',
    description: 'Talk to your management',
    icon: MessageSquare,
    path: '/dashboard/messages',
  },
  my_lease: {
    label: 'My Lease',
    description: 'Your lease & documents',
    icon: FileText,
    path: '/dashboard/my-lease',
  },
  my_payments: {
    label: 'Pay Rent',
    description: 'Payments & autopay',
    icon: CircleDollarSign,
    path: '/dashboard/my-payments',
  },
  my_requests: {
    label: 'My Requests',
    description: 'Submit & track maintenance',
    icon: Wrench,
    path: '/dashboard/my-requests',
  },
  settings: {
    label: 'Settings',
    description: 'Organization & profile settings',
    icon: Settings,
    path: '/dashboard/settings',
  },
};
