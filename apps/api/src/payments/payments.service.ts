import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AppAbility } from '@propertyflow/auth';
import { Prisma, type PrismaClient } from '@propertyflow/database';
import type {
  Payment,
  PaymentFormOptions,
  PaymentListResponse,
  PaymentPortfolioSummary,
  RequestUser,
} from '@propertyflow/types';
import type {
  CreatePaymentInput,
  ListPaymentsQuery,
  UpdatePaymentInput,
} from '@propertyflow/validation';
import { AbilityService } from '../authorization/ability.service';
import { buildingScope } from '../authorization/building-scope';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertCanAccessPayment,
  canAccessPayment,
  paymentScopeFor,
  type PaymentIdentity,
} from './payment-access';

function formatMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAYMENT_SELECT = {
  id: true,
  organizationId: true,
  leaseId: true,
  tenantId: true,
  ownerId: true,
  status: true,
  amountCents: true,
  dueDate: true,
  paidAt: true,
  description: true,
  method: true,
  reference: true,
  createdAt: true,
  updatedAt: true,
  tenant: { select: { id: true, fullName: true, email: true } },
  lease: {
    select: {
      unit: {
        select: {
          id: true,
          label: true,
          property: { select: { id: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.PaymentSelect;

type PaymentRecord = Prisma.PaymentGetPayload<{ select: typeof PAYMENT_SELECT }>;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilities: AbilityService,
    private readonly notifications: NotificationsService,
  ) {}

  private get db(): PrismaClient {
    return this.prisma.client;
  }

  async list(user: RequestUser, query: ListPaymentsQuery): Promise<PaymentListResponse> {
    const ability = this.abilities.abilityForUser(user);
    const scope = paymentScopeFor(ability, 'read');
    if (!scope) return { payments: [], summary: emptySummary() };

    const filters: Prisma.PaymentWhereInput[] = [scope, buildingScope(user).payment];
    if (query.status) filters.push({ status: query.status });
    if (query.leaseId) filters.push({ leaseId: query.leaseId });
    if (query.tenantId) filters.push({ tenantId: query.tenantId });
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' } as const;
      filters.push({
        OR: [
          { description: contains },
          { reference: contains },
          { tenant: { fullName: contains } },
          { tenant: { email: contains } },
          { lease: { unit: { label: contains } } },
          { lease: { unit: { property: { name: contains } } } },
        ],
      });
    }

    const records = await this.db.payment.findMany({
      where: { AND: filters },
      select: PAYMENT_SELECT,
      orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
    const payments = records
      .filter((record) => canAccessPayment(ability, 'read', identityOf(record)))
      .map(toPayment);
    return { payments, summary: summarize(payments) };
  }

  async formOptions(user: RequestUser): Promise<PaymentFormOptions> {
    const organizationId = requireOrganization(user);
    const leases = await this.db.lease.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: {
        id: true,
        rentCents: true,
        tenant: { select: { id: true, fullName: true, email: true } },
        unit: {
          select: {
            id: true,
            label: true,
            property: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ unit: { property: { name: 'asc' } } }, { unit: { label: 'asc' } }],
    });

    return {
      leases: leases.map((lease) => ({
        id: lease.id,
        label: lease.unit.label,
        propertyId: lease.unit.property.id,
        propertyName: lease.unit.property.name,
        tenant: lease.tenant,
        rentCents: lease.rentCents,
      })),
    };
  }

  async create(user: RequestUser, input: CreatePaymentInput): Promise<Payment> {
    const ability = this.abilities.abilityForUser(user);
    const organizationId = requireOrganization(user);
    const lease = await this.loadLease(user, organizationId, input.leaseId);
    const identity: PaymentIdentity = {
      id: '',
      organizationId,
      tenantId: lease.tenantId,
      ownerId: lease.unit.property.ownerId,
    };
    assertCanAccessPayment(ability, 'create', identity);

    const paid = input.status === 'PAID';
    if (paid && !input.method) {
      throw new BadRequestException('A paid payment must include a payment method');
    }
    const record = await this.db.payment.create({
      data: {
        organizationId,
        leaseId: lease.id,
        tenantId: lease.tenantId,
        ownerId: lease.unit.property.ownerId,
        amountCents: input.amountCents,
        dueDate: input.dueDate,
        description: input.description,
        status: input.status ?? 'PENDING',
        paidAt: paid ? new Date() : null,
        method: input.method ?? null,
        reference: input.reference ?? null,
      },
      select: PAYMENT_SELECT,
    });
    if (record.status !== 'PAID') {
      await this.notifications.notifyUser(record.organizationId, record.tenantId, {
        type: 'PAYMENT_DUE',
        title: 'New charge added',
        body: `${formatMoney(record.amountCents)} for ${record.description} is due ${record.dueDate.toLocaleDateString('en-US')}.`,
        linkPath: '/dashboard/my-payments',
      });
    }
    return toPayment(record);
  }

  async update(user: RequestUser, id: string, input: UpdatePaymentInput): Promise<Payment> {
    const { ability, record } = await this.loadReadable(user, id);
    assertCanAccessPayment(ability, 'update', identityOf(record));
    const nextStatus = input.status ?? record.status;
    const nextMethod = input.method ?? record.method;
    if (nextStatus === 'PAID' && !nextMethod) {
      throw new BadRequestException('A paid payment must include a payment method');
    }

    const updated = await this.db.payment.update({
      where: { id: record.id },
      data: {
        amountCents: input.amountCents,
        dueDate: input.dueDate,
        description: input.description,
        status: input.status,
        paidAt:
          input.status === 'PAID'
            ? record.paidAt ?? new Date()
            : input.status
              ? null
              : undefined,
        method: input.method,
        reference: input.reference,
      },
      select: PAYMENT_SELECT,
    });
    return toPayment(updated);
  }

  /**
   * Provider-independent checkout boundary. Stripe will replace this demo
   * settlement in the next phase without changing the client contract.
   */
  async pay(user: RequestUser, id: string): Promise<Payment> {
    const { ability, record } = await this.loadReadable(user, id);
    assertCanAccessPayment(ability, 'pay', identityOf(record));
    if (record.status === 'PAID') throw new ConflictException('This payment is already paid');
    if (record.status === 'REFUNDED') throw new ConflictException('A refunded payment cannot be paid');

    const updated = await this.db.payment.update({
      where: { id: record.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        method: 'Demo ACH',
        reference: `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      },
      select: PAYMENT_SELECT,
    });
    await this.notifications.notifyPropertyStaff(
      updated.organizationId,
      updated.lease.unit.property.id,
      {
        type: 'PAYMENT_RECEIVED',
        title: 'Rent payment received',
        body: `${updated.tenant.fullName} paid ${formatMoney(updated.amountCents)} for ${updated.lease.unit.property.name} · ${updated.lease.unit.label}.`,
        linkPath: '/dashboard/payments',
      },
      user.id,
    );
    return toPayment(updated);
  }

  private async loadReadable(
    user: RequestUser,
    id: string,
  ): Promise<{ ability: AppAbility; record: PaymentRecord }> {
    const ability = this.abilities.abilityForUser(user);
    const scope = paymentScopeFor(ability, 'read');
    if (!scope) throw new NotFoundException('Payment not found');
    const record = await this.db.payment.findFirst({
      where: { AND: [{ id }, scope, buildingScope(user).payment] },
      select: PAYMENT_SELECT,
    });
    if (!record || !canAccessPayment(ability, 'read', identityOf(record))) {
      throw new NotFoundException('Payment not found');
    }
    return { ability, record };
  }

  private async loadLease(user: RequestUser, organizationId: string, leaseId: string) {
    const lease = await this.db.lease.findFirst({
      where: { id: leaseId, organizationId, ...buildingScope(user).lease },
      select: {
        id: true,
        tenantId: true,
        unit: { select: { property: { select: { ownerId: true } } } },
      },
    });
    if (!lease) throw new BadRequestException('Select a lease from a building you manage');
    return lease;
  }
}

function requireOrganization(user: RequestUser): string {
  if (!user.organizationId) {
    throw new ForbiddenException('Only members of an organization can manage payments');
  }
  return user.organizationId;
}

function identityOf(record: PaymentRecord): PaymentIdentity {
  return {
    id: record.id,
    organizationId: record.organizationId,
    tenantId: record.tenantId,
    ownerId: record.ownerId,
  };
}

function toPayment(record: PaymentRecord): Payment {
  return {
    id: record.id,
    organizationId: record.organizationId,
    leaseId: record.leaseId,
    tenantId: record.tenantId,
    ownerId: record.ownerId,
    status: record.status,
    amountCents: record.amountCents,
    dueDate: record.dueDate.toISOString(),
    paidAt: record.paidAt?.toISOString() ?? null,
    description: record.description,
    method: record.method,
    reference: record.reference,
    tenant: record.tenant,
    unit: {
      id: record.lease.unit.id,
      label: record.lease.unit.label,
      propertyId: record.lease.unit.property.id,
      propertyName: record.lease.unit.property.name,
    },
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function summarize(payments: readonly Payment[]): PaymentPortfolioSummary {
  const collectible = payments.filter((payment) => payment.status !== 'REFUNDED');
  const total = collectible.reduce((sum, payment) => sum + payment.amountCents, 0);
  const collected = collectible
    .filter((payment) => payment.status === 'PAID')
    .reduce((sum, payment) => sum + payment.amountCents, 0);
  return {
    paymentCount: payments.length,
    collectedCents: collected,
    outstandingCents: Math.max(0, total - collected),
    collectionRate: total ? Math.round((collected / total) * 1000) / 10 : 0,
  };
}

function emptySummary(): PaymentPortfolioSummary {
  return { paymentCount: 0, collectedCents: 0, outstandingCents: 0, collectionRate: 0 };
}
