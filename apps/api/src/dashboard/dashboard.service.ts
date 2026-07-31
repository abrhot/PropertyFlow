import { Injectable } from '@nestjs/common';
import type {
  DashboardMetric,
  DashboardSummaryResponse,
  DashboardTrendPoint,
  RequestUser,
} from '@propertyflow/types';
import { PrismaService } from '../prisma/prisma.service';

const DAYS = 90;
const WINDOW = 30;

interface AmountEvent {
  date: Date;
  amount: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: RequestUser): Promise<DashboardSummaryResponse> {
    if (user.role === 'TENANT') return this.tenantSummary(user);
    return this.portfolioSummary(user);
  }

  /** Staff (org-wide) and owners (their properties): collections and occupancy. */
  private async portfolioSummary(user: RequestUser): Promise<DashboardSummaryResponse> {
    const organizationId = user.organizationId ?? '';
    const owner = user.role === 'OWNER';
    const paymentWhere = { organizationId, ...(owner ? { ownerId: user.id } : {}) };
    const propertyWhere = { organizationId, ...(owner ? { ownerId: user.id } : {}), isActive: true };

    const [payments, properties, activeLeases] = await Promise.all([
      this.prisma.client.payment.findMany({
        where: paymentWhere,
        select: { amountCents: true, status: true, dueDate: true, paidAt: true },
      }),
      this.prisma.client.property.findMany({
        where: propertyWhere,
        select: { units: { select: { status: true } } },
      }),
      this.prisma.client.lease.count({
        where: { organizationId, status: 'ACTIVE', ...(owner ? { unit: { property: { ownerId: user.id } } } : {}) },
      }),
    ]);

    const now = new Date();
    const collectedThisMonth = sumInMonth(payments, now, 0, 'PAID');
    const collectedLastMonth = sumInMonth(payments, now, -1, 'PAID');
    const outstanding = payments
      .filter((p) => ['PENDING', 'LATE', 'FAILED'].includes(p.status))
      .reduce((sum, p) => sum + p.amountCents, 0);
    const units = properties.flatMap((p) => p.units);
    const occupied = units.filter((u) => u.status === 'OCCUPIED').length;
    const occupancy = units.length ? Math.round((occupied / units.length) * 1000) / 10 : 0;
    const delta = percentDelta(collectedThisMonth, collectedLastMonth);

    const metrics: DashboardMetric[] = [
      {
        key: 'collected',
        label: owner ? 'Your collections' : 'Collected this month',
        value: formatCurrency(collectedThisMonth),
        delta: delta.label,
        trend: delta.trend,
        hint: 'Paid rent this month',
      },
      {
        key: 'outstanding',
        label: 'Outstanding',
        value: formatCurrency(outstanding),
        delta: outstanding > 0 ? 'Needs attention' : 'All clear',
        trend: outstanding > 0 ? 'down' : 'up',
        hint: 'Pending, late, and failed',
      },
      {
        key: 'leases',
        label: 'Active leases',
        value: formatCount(activeLeases),
        delta: `${occupied} units occupied`,
        trend: 'neutral',
        hint: 'Currently in effect',
      },
      {
        key: 'occupancy',
        label: 'Occupancy',
        value: `${occupancy}%`,
        delta: `${units.length} total units`,
        trend: occupancy >= 90 ? 'up' : occupancy >= 75 ? 'neutral' : 'down',
        hint: 'Across your portfolio',
      },
    ];

    const collectedEvents = toDollarEvents(payments.filter((p) => p.status === 'PAID' && p.paidAt), (p) => p.paidAt as Date);
    const billedEvents = toDollarEvents(payments, (p) => p.dueDate);
    return {
      metrics,
      trend: {
        title: 'Cash flow',
        subtitle: 'Collected and billed over the last 3 months',
        primaryLabel: 'Collected',
        secondaryLabel: 'Billed',
        points: zipSeries(trailingSums(collectedEvents), trailingSums(billedEvents)),
      },
    };
  }

  /** Tenant: their balance, upcoming rent, and open requests. */
  private async tenantSummary(user: RequestUser): Promise<DashboardSummaryResponse> {
    const organizationId = user.organizationId ?? '';
    const [payments, openRequests, lease] = await Promise.all([
      this.prisma.client.payment.findMany({
        where: { organizationId, tenantId: user.id },
        select: { amountCents: true, status: true, dueDate: true, paidAt: true },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.client.maintenanceRequest.count({
        where: { organizationId, tenantId: user.id, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      this.prisma.client.lease.findFirst({
        where: { organizationId, tenantId: user.id, status: 'ACTIVE' },
        select: { endDate: true, rentCents: true },
        orderBy: { startDate: 'desc' },
      }),
    ]);

    const unpaid = payments.filter((p) => ['PENDING', 'LATE'].includes(p.status));
    const balance = unpaid.reduce((sum, p) => sum + p.amountCents, 0);
    const next = unpaid[0];
    const daysToRenewal = lease ? Math.max(0, Math.round((lease.endDate.getTime() - Date.now()) / 86400000)) : 0;

    const metrics: DashboardMetric[] = [
      {
        key: 'next',
        label: 'Next payment',
        value: next ? formatCurrency(next.amountCents) : formatCurrency(lease?.rentCents ?? 0),
        delta: next ? `Due ${next.dueDate.toLocaleDateString()}` : 'Nothing due',
        trend: 'neutral',
        hint: 'Upcoming rent charge',
      },
      {
        key: 'balance',
        label: 'Current balance',
        value: formatCurrency(balance),
        delta: balance > 0 ? `${unpaid.length} open` : 'Paid in full',
        trend: balance > 0 ? 'down' : 'up',
        hint: 'Amount you owe',
      },
      {
        key: 'requests',
        label: 'Open requests',
        value: formatCount(openRequests),
        delta: openRequests > 0 ? 'In progress' : 'None open',
        trend: 'neutral',
        hint: 'Maintenance you submitted',
      },
      {
        key: 'lease',
        label: 'Lease renewal',
        value: lease ? `${daysToRenewal}d` : '—',
        delta: lease ? `Ends ${lease.endDate.toLocaleDateString()}` : 'No active lease',
        trend: 'neutral',
        hint: 'Days until renewal',
      },
    ];

    const paidEvents = toDollarEvents(payments.filter((p) => p.status === 'PAID' && p.paidAt), (p) => p.paidAt as Date);
    const billedEvents = toDollarEvents(payments, (p) => p.dueDate);
    return {
      metrics,
      trend: {
        title: 'Your rent',
        subtitle: 'Paid and billed over the last 3 months',
        primaryLabel: 'Paid',
        secondaryLabel: 'Billed',
        points: zipSeries(trailingSums(paidEvents), trailingSums(billedEvents)),
      },
    };
  }

}

function sumInMonth(
  payments: { amountCents: number; status: string; paidAt: Date | null }[],
  now: Date,
  monthOffset: number,
  status: string,
): number {
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  return payments
    .filter(
      (p) =>
        p.status === status &&
        p.paidAt &&
        p.paidAt.getFullYear() === target.getFullYear() &&
        p.paidAt.getMonth() === target.getMonth(),
    )
    .reduce((sum, p) => sum + p.amountCents, 0);
}

function toDollarEvents<T>(rows: T[], getDate: (row: T) => Date): AmountEvent[] {
  return rows.map((row) => ({
    date: getDate(row),
    amount: ((row as { amountCents: number }).amountCents ?? 0) / 100,
  }));
}

/** For each of the last DAYS days, sum event amounts within the trailing WINDOW. */
function trailingSums(events: AmountEvent[]): { date: string; value: number }[] {
  const points: { date: string; value: number }[] = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  for (let i = DAYS - 1; i >= 0; i -= 1) {
    const end = new Date(today);
    end.setDate(end.getDate() - i);
    const start = new Date(end);
    start.setDate(start.getDate() - WINDOW);
    const value = events
      .filter((e) => e.date > start && e.date <= end)
      .reduce((sum, e) => sum + e.amount, 0);
    points.push({ date: isoDay(end), value: Math.round(value) });
  }
  return points;
}

function zipSeries(
  primary: { date: string; value: number }[],
  secondary: { date: string; value: number }[],
): DashboardTrendPoint[] {
  return primary.map((point, index) => ({
    date: point.date,
    primary: point.value,
    secondary: secondary[index]?.value ?? 0,
  }));
}

function percentDelta(current: number, previous: number): { label: string; trend: 'up' | 'down' | 'neutral' } {
  if (previous === 0) return { label: current > 0 ? 'New' : 'No change', trend: current > 0 ? 'up' : 'neutral' };
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  return { label: `${pct >= 0 ? '+' : ''}${pct}%`, trend: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral' };
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
function formatCurrency(cents: number): string {
  return CURRENCY.format(cents / 100);
}
function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
