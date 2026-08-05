import type { AppSection } from '@propertyflow/constants';

type Section = Exclude<AppSection, 'dashboard'>;

export interface SectionContent {
  action: string;
  search: string;
  stats: readonly [
    { label: string; value: string; detail: string },
    { label: string; value: string; detail: string },
    { label: string; value: string; detail: string },
  ];
  columns: readonly [string, string, string];
  rows: readonly {
    primary: string;
    secondary: string;
    tertiary: string;
    status: string;
  }[];
}

const content = (
  action: string,
  search: string,
  stats: SectionContent['stats'],
  columns: SectionContent['columns'],
  rows: SectionContent['rows'],
): SectionContent => ({ action, search, stats, columns, rows });

export const SECTION_CONTENT: Record<Section, SectionContent> = {
  properties: content(
    'Add property',
    'Search properties...',
    [
      { label: 'Properties', value: '24', detail: 'Across 6 neighborhoods' },
      { label: 'Total units', value: '486', detail: '94.7% occupied' },
      { label: 'Open vacancies', value: '26', detail: '-5 since last month' },
    ],
    ['Property', 'Location', 'Occupancy'],
    [
      {
        primary: 'The Meridian',
        secondary: 'Downtown',
        tertiary: '96% · 120 units',
        status: 'Healthy',
      },
      {
        primary: 'Cedar Grove',
        secondary: 'West End',
        tertiary: '92% · 84 units',
        status: 'Leasing',
      },
      {
        primary: 'Parkside Lofts',
        secondary: 'Midtown',
        tertiary: '98% · 64 units',
        status: 'Healthy',
      },
    ],
  ),
  leases: content(
    'Create lease',
    'Search leases or tenants...',
    [
      { label: 'Active leases', value: '412', detail: '84.8% of all units' },
      { label: 'Renewals due', value: '18', detail: 'Within 60 days' },
      { label: 'Pending signatures', value: '7', detail: '3 sent today' },
    ],
    ['Tenant', 'Property / Unit', 'Lease term'],
    [
      {
        primary: 'Maya Thompson',
        secondary: 'The Meridian · 12B',
        tertiary: 'Jan–Dec 2026',
        status: 'Active',
      },
      {
        primary: 'Daniel Ortiz',
        secondary: 'Cedar Grove · 4A',
        tertiary: 'Mar 2026–Feb 2027',
        status: 'Pending',
      },
      {
        primary: 'Ava Robinson',
        secondary: 'Parkside Lofts · 8C',
        tertiary: 'Jul 2025–Jun 2026',
        status: 'Renewal',
      },
    ],
  ),
  applications: content(
    'New application',
    'Search applicants...',
    [
      { label: 'New applications', value: '14', detail: '+6 this week' },
      { label: 'In screening', value: '9', detail: '2 need review' },
      { label: 'Approval rate', value: '72%', detail: 'Last 30 days' },
    ],
    ['Applicant', 'Applied for', 'Submitted'],
    [
      {
        primary: 'Olivia Martin',
        secondary: 'The Meridian · 7D',
        tertiary: 'Today, 9:42 AM',
        status: 'New',
      },
      {
        primary: 'Noah Williams',
        secondary: 'Cedar Grove · 2C',
        tertiary: 'Yesterday',
        status: 'Screening',
      },
      {
        primary: 'Emma Davis',
        secondary: 'Parkside Lofts · 5A',
        tertiary: 'Jul 20',
        status: 'Approved',
      },
    ],
  ),
  payments: content(
    'Record payment',
    'Search payments...',
    [
      { label: 'Collected this month', value: '$612,480', detail: '96.1% collection rate' },
      { label: 'Outstanding', value: '$24,860', detail: '21 tenant balances' },
      { label: 'Processing', value: '$8,320', detail: '12 transactions' },
    ],
    ['Tenant', 'Reference', 'Amount'],
    [
      {
        primary: 'Maya Thompson',
        secondary: 'Rent · July 2026',
        tertiary: '$1,850',
        status: 'Paid',
      },
      {
        primary: 'Daniel Ortiz',
        secondary: 'Rent · July 2026',
        tertiary: '$1,620',
        status: 'Processing',
      },
      {
        primary: 'Ava Robinson',
        secondary: 'Balance · July 2026',
        tertiary: '$420',
        status: 'Overdue',
      },
    ],
  ),
  maintenance: content(
    'Create request',
    'Search requests...',
    [
      { label: 'Open requests', value: '32', detail: '6 high priority' },
      { label: 'In progress', value: '18', detail: '11 due this week' },
      { label: 'Avg. resolution', value: '2.4 days', detail: '-0.6 days this month' },
    ],
    ['Request', 'Property / Unit', 'Assignee'],
    [
      {
        primary: 'Leaking kitchen faucet',
        secondary: 'The Meridian · 12B',
        tertiary: 'Alex Morgan',
        status: 'In progress',
      },
      {
        primary: 'HVAC not cooling',
        secondary: 'Cedar Grove · 4A',
        tertiary: 'Rapid Air Co.',
        status: 'Urgent',
      },
      {
        primary: 'Replace hallway light',
        secondary: 'Parkside Lofts · Floor 3',
        tertiary: 'Jordan Lee',
        status: 'Scheduled',
      },
    ],
  ),
  work_orders: content(
    'Update availability',
    'Search assigned work...',
    [
      { label: 'Assigned to you', value: '8', detail: '2 due today' },
      { label: 'In progress', value: '3', detail: 'All on schedule' },
      { label: 'Completed this week', value: '12', detail: '4.9 average rating' },
    ],
    ['Work order', 'Location', 'Due'],
    [
      {
        primary: 'WO-318 · Kitchen faucet',
        secondary: 'The Meridian · 12B',
        tertiary: 'Today, 2:00 PM',
        status: 'In progress',
      },
      {
        primary: 'WO-321 · Hallway lighting',
        secondary: 'Parkside Lofts · Floor 3',
        tertiary: 'Tomorrow',
        status: 'Scheduled',
      },
      {
        primary: 'WO-315 · Door alignment',
        secondary: 'Cedar Grove · 6F',
        tertiary: 'Jul 25',
        status: 'Assigned',
      },
    ],
  ),
  reports: content(
    'Export report',
    'Search reports...',
    [
      { label: 'Portfolio value', value: '$48.2M', detail: '+4.3% year over year' },
      { label: 'Net operating income', value: '$382K', detail: '+7.1% this month' },
      { label: 'Occupancy', value: '94.7%', detail: '+1.2% this quarter' },
    ],
    ['Report', 'Period', 'Last generated'],
    [
      {
        primary: 'Portfolio performance',
        secondary: 'Q2 2026',
        tertiary: 'Jul 20, 2026',
        status: 'Ready',
      },
      { primary: 'Rent roll', secondary: 'July 2026', tertiary: 'Jul 22, 2026', status: 'Ready' },
      {
        primary: 'Owner statements',
        secondary: 'June 2026',
        tertiary: 'Jul 5, 2026',
        status: 'Ready',
      },
    ],
  ),
  tenants: content(
    'Add tenant',
    'Search tenants...',
    [
      { label: 'Current tenants', value: '438', detail: 'Across 24 properties' },
      { label: 'Move-ins', value: '12', detail: 'This month' },
      { label: 'Move-outs', value: '7', detail: 'This month' },
    ],
    ['Tenant', 'Property / Unit', 'Contact'],
    [
      {
        primary: 'Maya Thompson',
        secondary: 'The Meridian · 12B',
        tertiary: 'maya@example.com',
        status: 'Current',
      },
      {
        primary: 'Daniel Ortiz',
        secondary: 'Cedar Grove · 4A',
        tertiary: 'daniel@example.com',
        status: 'Move-in',
      },
      {
        primary: 'Ava Robinson',
        secondary: 'Parkside Lofts · 8C',
        tertiary: 'ava@example.com',
        status: 'Renewal',
      },
    ],
  ),
  messages: content(
    'New message',
    'Search conversations...',
    [
      { label: 'Unread', value: '3', detail: '1 new today' },
      { label: 'Open conversations', value: '5', detail: 'Management and maintenance' },
      { label: 'Avg. response', value: '18 min', detail: 'During office hours' },
    ],
    ['Conversation', 'Topic', 'Last message'],
    [
      {
        primary: 'Property management',
        secondary: 'Lease renewal options',
        tertiary: '10 minutes ago',
        status: 'Unread',
      },
      {
        primary: 'Maintenance team',
        secondary: 'Kitchen request update',
        tertiary: 'Yesterday',
        status: 'Replied',
      },
      {
        primary: 'Billing support',
        secondary: 'Payment receipt',
        tertiary: 'Jul 18',
        status: 'Closed',
      },
    ],
  ),
  my_lease: content(
    'Download lease',
    'Search lease documents...',
    [
      { label: 'Monthly rent', value: '$1,850', detail: 'Due on the 1st' },
      { label: 'Lease ends', value: 'Dec 31, 2026', detail: '161 days remaining' },
      { label: 'Security deposit', value: '$1,850', detail: 'Paid in full' },
    ],
    ['Document', 'Category', 'Updated'],
    [
      {
        primary: 'Residential lease agreement',
        secondary: 'Lease',
        tertiary: 'Jan 1, 2026',
        status: 'Signed',
      },
      {
        primary: 'Community guidelines',
        secondary: 'Policy',
        tertiary: 'Jan 1, 2026',
        status: 'Current',
      },
      {
        primary: 'Move-in inspection',
        secondary: 'Inspection',
        tertiary: 'Jan 2, 2026',
        status: 'Complete',
      },
    ],
  ),
  my_payments: content(
    'Pay rent',
    'Search payment history...',
    [
      { label: 'Next payment', value: '$1,850', detail: 'Due Aug 1, 2026' },
      { label: 'Current balance', value: '$0', detail: 'You are all caught up' },
      { label: 'Autopay', value: 'Enabled', detail: 'Bank account ending 2048' },
    ],
    ['Payment', 'Method', 'Amount'],
    [
      {
        primary: 'July 2026 rent',
        secondary: 'Bank ···· 2048',
        tertiary: '$1,850',
        status: 'Paid',
      },
      {
        primary: 'June 2026 rent',
        secondary: 'Bank ···· 2048',
        tertiary: '$1,850',
        status: 'Paid',
      },
      { primary: 'May 2026 rent', secondary: 'Bank ···· 2048', tertiary: '$1,850', status: 'Paid' },
    ],
  ),
  my_requests: content(
    'Submit request',
    'Search your requests...',
    [
      { label: 'Open requests', value: '1', detail: 'Currently in progress' },
      { label: 'Resolved', value: '6', detail: 'In the last 12 months' },
      { label: 'Avg. resolution', value: '1.8 days', detail: 'For your requests' },
    ],
    ['Request', 'Submitted', 'Latest update'],
    [
      {
        primary: 'Kitchen faucet leak',
        secondary: 'Jul 22, 2026',
        tertiary: 'Technician arriving today',
        status: 'In progress',
      },
      {
        primary: 'Bedroom outlet',
        secondary: 'May 14, 2026',
        tertiary: 'Completed May 15',
        status: 'Resolved',
      },
      {
        primary: 'Window screen',
        secondary: 'Mar 3, 2026',
        tertiary: 'Completed Mar 5',
        status: 'Resolved',
      },
    ],
  ),
  team: content(
    'Invite member',
    'Search team members...',
    [
      { label: 'Team members', value: '18', detail: '3 administrators' },
      { label: 'Managers', value: '9', detail: 'Assigned to buildings' },
      { label: 'Pending invites', value: '2', detail: 'Awaiting acceptance' },
    ],
    ['Member', 'Role', 'Building access'],
    [
      {
        primary: 'Alex Manager',
        secondary: 'Property manager',
        tertiary: 'The Meridian, Cedar Grove',
        status: 'Active',
      },
      {
        primary: 'Jordan Lee',
        secondary: 'Maintenance',
        tertiary: 'All buildings',
        status: 'Active',
      },
      {
        primary: 'sam@company.com',
        secondary: 'Property manager',
        tertiary: 'Parkside Lofts',
        status: 'Invited',
      },
    ],
  ),
  settings: content(
    'Save changes',
    'Search settings...',
    [
      { label: 'Team members', value: '18', detail: '3 administrators' },
      { label: 'Integrations', value: '6', detail: 'All systems operational' },
      { label: 'Security score', value: 'Strong', detail: 'MFA enabled for admins' },
    ],
    ['Setting', 'Scope', 'Last updated'],
    [
      {
        primary: 'Organization profile',
        secondary: 'Company-wide',
        tertiary: 'Yesterday',
        status: 'Configured',
      },
      {
        primary: 'Payment processing',
        secondary: 'Finance',
        tertiary: 'Jul 18, 2026',
        status: 'Connected',
      },
      {
        primary: 'Notification preferences',
        secondary: 'Your account',
        tertiary: 'Jul 12, 2026',
        status: 'Configured',
      },
    ],
  ),
};
