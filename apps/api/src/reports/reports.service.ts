import { Injectable } from '@nestjs/common';
import type { ReportDashboardResponse, RequestUser } from '@propertyflow/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(user: RequestUser): Promise<ReportDashboardResponse> {
    const organizationFilter = user.organizationId ? { organizationId: user.organizationId } : {};
    const ownerId = user.role === 'OWNER' ? user.id : undefined;
    const [payments, properties] = await Promise.all([
      this.prisma.client.payment.findMany({
        where: { ...organizationFilter, ...(ownerId ? { ownerId } : {}) },
        select: { amountCents: true, status: true, dueDate: true },
      }),
      this.prisma.client.property.findMany({
        where: { ...organizationFilter, ...(ownerId ? { ownerId } : {}), isActive: true },
        select: { name: true, units: { select: { status: true } } },
        orderBy: { name: 'asc' },
      }),
    ]);
    const collectedCents = payments
      .filter((payment) => payment.status === 'PAID')
      .reduce((sum, payment) => sum + payment.amountCents, 0);
    const outstandingCents = payments
      .filter((payment) => ['PENDING', 'LATE', 'FAILED'].includes(payment.status))
      .reduce((sum, payment) => sum + payment.amountCents, 0);
    const units = properties.flatMap((property) => property.units);
    const occupied = units.filter((unit) => unit.status === 'OCCUPIED').length;
    const now = new Date();
    const cashFlow = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const inMonth = payments.filter(
        (payment) =>
          payment.dueDate.getFullYear() === date.getFullYear() &&
          payment.dueDate.getMonth() === date.getMonth(),
      );
      return {
        month: date.toLocaleString('en-US', { month: 'short' }),
        collected: Math.round(
          inMonth
            .filter((payment) => payment.status === 'PAID')
            .reduce((sum, payment) => sum + payment.amountCents, 0) / 100,
        ),
        outstanding: Math.round(
          inMonth
            .filter((payment) => ['PENDING', 'LATE', 'FAILED'].includes(payment.status))
            .reduce((sum, payment) => sum + payment.amountCents, 0) / 100,
        ),
      };
    });
    const generated = now.toLocaleDateString();
    return {
      summary: {
        collectedCents,
        outstandingCents,
        occupancyRate: units.length ? Math.round((occupied / units.length) * 1000) / 10 : 0,
      },
      cashFlow,
      occupancy: properties.map((property) => ({
        property: property.name,
        occupancy: property.units.length
          ? Math.round(
              (property.units.filter((unit) => unit.status === 'OCCUPIED').length /
                property.units.length) *
                100,
            )
          : 0,
      })),
      reports: [
        { id: 'portfolio', report: 'Portfolio performance', category: 'Operations', period: 'Current', generated, status: 'Ready' },
        { id: 'rent-roll', report: 'Rent roll', category: 'Leasing', period: 'Current', generated, status: 'Ready' },
        { id: 'collections', report: 'Collections summary', category: 'Financial', period: 'Current', generated, status: 'Ready' },
      ],
    };
  }
}
