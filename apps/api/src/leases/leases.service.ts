import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { defineAbilityFor, type AppAbility } from '@propertyflow/auth';
import { Prisma, type PrismaClient } from '@propertyflow/database';
import type {
  Lease,
  LeaseFormOptions,
  LeaseListResponse,
  LeasePortfolioSummary,
  RequestUser,
} from '@propertyflow/types';
import type {
  CreateLeaseInput,
  ListLeasesQuery,
  UpdateLeaseInput,
} from '@propertyflow/validation';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertCanAccessLease,
  canAccessLease,
  leaseScopeFor,
  type LeaseIdentity,
} from './lease-access';

const LEASE_SELECT = {
  id: true,
  organizationId: true,
  unitId: true,
  tenantId: true,
  status: true,
  startDate: true,
  endDate: true,
  rentCents: true,
  depositCents: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  tenant: { select: { id: true, fullName: true, email: true } },
  unit: {
    select: {
      id: true,
      label: true,
      property: { select: { id: true, name: true, ownerId: true } },
    },
  },
} satisfies Prisma.LeaseSelect;

type LeaseRecord = Prisma.LeaseGetPayload<{ select: typeof LEASE_SELECT }>;

@Injectable()
export class LeasesService {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): PrismaClient {
    return this.prisma.client;
  }

  async list(user: RequestUser, query: ListLeasesQuery): Promise<LeaseListResponse> {
    const ability = defineAbilityFor(user);
    const scope = leaseScopeFor(ability, 'read');
    if (!scope) return { leases: [], summary: emptySummary() };

    const filters: Prisma.LeaseWhereInput[] = [scope];
    if (query.status) filters.push({ status: query.status });
    if (query.unitId) filters.push({ unitId: query.unitId });
    if (query.tenantId) filters.push({ tenantId: query.tenantId });
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' } as const;
      filters.push({
        OR: [
          { tenant: { fullName: contains } },
          { tenant: { email: contains } },
          { unit: { label: contains } },
          { unit: { property: { name: contains } } },
        ],
      });
    }

    const records = await this.db.lease.findMany({
      where: { AND: filters },
      select: LEASE_SELECT,
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
      take: 300,
    });

    const leases = records
      .filter((record) => canAccessLease(ability, 'read', identityOf(record)))
      .map(toLease);

    return { leases, summary: summarize(leases) };
  }

  async findOne(user: RequestUser, id: string): Promise<Lease> {
    const { record } = await this.loadReadable(user, id);
    return toLease(record);
  }

  /** Units and tenants the caller can put on a lease, for the create/edit form. */
  async formOptions(user: RequestUser): Promise<LeaseFormOptions> {
    const organizationId = requireOrganization(user);

    const [units, tenants] = await Promise.all([
      this.db.unit.findMany({
        where: { property: { organizationId } },
        select: { id: true, label: true, property: { select: { id: true, name: true } } },
        orderBy: [{ property: { name: 'asc' } }, { label: 'asc' }],
      }),
      this.db.user.findMany({
        where: { organizationId, role: 'TENANT', isActive: true },
        select: { id: true, fullName: true, email: true },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    return {
      units: units.map((unit) => ({
        id: unit.id,
        label: unit.label,
        propertyId: unit.property.id,
        propertyName: unit.property.name,
      })),
      tenants,
    };
  }

  async create(user: RequestUser, input: CreateLeaseInput): Promise<Lease> {
    const ability = defineAbilityFor(user);
    const organizationId = requireOrganization(user);

    const unit = await this.loadUnit(organizationId, input.unitId);
    await this.assertTenant(organizationId, input.tenantId);

    const status = input.status ?? 'DRAFT';
    assertCanAccessLease(ability, 'create', {
      id: '',
      organizationId,
      tenantId: input.tenantId,
      ownerId: unit.property.ownerId,
    });

    const record = await this.db.$transaction(async (tx) => {
      if (status === 'ACTIVE') await this.assertNoActiveLease(tx, input.unitId, null);

      const created = await tx.lease.create({
        data: {
          organizationId,
          unitId: input.unitId,
          tenantId: input.tenantId,
          status,
          startDate: input.startDate,
          endDate: input.endDate,
          rentCents: input.rentCents,
          depositCents: input.depositCents ?? 0,
          notes: input.notes ?? null,
        },
        select: LEASE_SELECT,
      });

      await this.syncUnitStatus(tx, input.unitId, status);
      return created;
    });

    return toLease(record);
  }

  async update(user: RequestUser, id: string, input: UpdateLeaseInput): Promise<Lease> {
    const { ability, record } = await this.loadReadable(user, id);
    assertCanAccessLease(ability, 'update', identityOf(record));

    if (input.tenantId && input.tenantId !== record.tenantId) {
      await this.assertTenant(record.organizationId, input.tenantId);
      // Moving a lease to another tenant must stay within the caller's scope.
      assertCanAccessLease(ability, 'update', {
        ...identityOf(record),
        tenantId: input.tenantId,
      });
    }

    const nextStatus = input.status ?? record.status;
    const startDate = input.startDate ?? record.startDate;
    const endDate = input.endDate ?? record.endDate;
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after the start date');
    }

    const updated = await this.db.$transaction(async (tx) => {
      if (nextStatus === 'ACTIVE') await this.assertNoActiveLease(tx, record.unitId, record.id);

      const result = await tx.lease.update({
        where: { id: record.id },
        data: {
          tenantId: input.tenantId,
          status: input.status,
          startDate: input.startDate,
          endDate: input.endDate,
          rentCents: input.rentCents,
          depositCents: input.depositCents,
          notes: input.notes,
        },
        select: LEASE_SELECT,
      });

      if (input.status && input.status !== record.status) {
        await this.syncUnitStatus(tx, record.unitId, input.status);
      }
      return result;
    });

    return toLease(updated);
  }

  async remove(user: RequestUser, id: string): Promise<{ message: string }> {
    const { ability, record } = await this.loadReadable(user, id);
    assertCanAccessLease(ability, 'delete', identityOf(record));

    await this.db.lease.delete({ where: { id: record.id } });
    return { message: `Lease for unit ${record.unit.label} was deleted` };
  }

  /**
   * Loads a lease the caller may read, reporting 404 (not 403) for anything
   * outside scope so ids cannot be probed. Write permission is asserted by callers.
   */
  private async loadReadable(
    user: RequestUser,
    id: string,
  ): Promise<{ ability: AppAbility; record: LeaseRecord }> {
    const ability = defineAbilityFor(user);
    const scope = leaseScopeFor(ability, 'read');
    if (!scope) throw new NotFoundException('Lease not found');

    const record = await this.db.lease.findFirst({
      where: { AND: [{ id }, scope] },
      select: LEASE_SELECT,
    });
    if (!record || !canAccessLease(ability, 'read', identityOf(record))) {
      throw new NotFoundException('Lease not found');
    }

    return { ability, record };
  }

  private async loadUnit(organizationId: string, unitId: string) {
    const unit = await this.db.unit.findFirst({
      where: { id: unitId, property: { organizationId } },
      select: { id: true, property: { select: { ownerId: true } } },
    });
    if (!unit) throw new BadRequestException('Select a unit from your own organization');
    return unit;
  }

  private async assertTenant(organizationId: string, tenantId: string): Promise<void> {
    const tenant = await this.db.user.findFirst({
      where: { id: tenantId, organizationId, role: 'TENANT', isActive: true },
      select: { id: true },
    });
    if (!tenant) throw new BadRequestException('Select an active tenant from your own organization');
  }

  /** A unit may have only one ACTIVE lease at a time. */
  private async assertNoActiveLease(
    tx: Prisma.TransactionClient,
    unitId: string,
    exceptLeaseId: string | null,
  ): Promise<void> {
    const conflict = await tx.lease.findFirst({
      where: {
        unitId,
        status: 'ACTIVE',
        ...(exceptLeaseId ? { id: { not: exceptLeaseId } } : {}),
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException('This unit already has an active lease');
    }
  }

  /** Keeps unit occupancy in step with the lease lifecycle. */
  private async syncUnitStatus(
    tx: Prisma.TransactionClient,
    unitId: string,
    status: string,
  ): Promise<void> {
    if (status === 'ACTIVE') {
      await tx.unit.update({ where: { id: unitId }, data: { status: 'OCCUPIED' } });
      return;
    }

    if (status === 'EXPIRED' || status === 'TERMINATED') {
      const stillActive = await tx.lease.findFirst({
        where: { unitId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!stillActive) {
        await tx.unit.update({ where: { id: unitId }, data: { status: 'VACANT' } });
      }
    }
  }
}

function requireOrganization(user: RequestUser): string {
  if (!user.organizationId) {
    throw new ForbiddenException('Only members of an organization can manage leases');
  }
  return user.organizationId;
}

function identityOf(record: LeaseRecord): LeaseIdentity {
  return {
    id: record.id,
    organizationId: record.organizationId,
    tenantId: record.tenantId,
    ownerId: record.unit.property.ownerId,
  };
}

function toLease(record: LeaseRecord): Lease {
  return {
    id: record.id,
    organizationId: record.organizationId,
    unitId: record.unitId,
    tenantId: record.tenantId,
    status: record.status,
    startDate: record.startDate.toISOString(),
    endDate: record.endDate.toISOString(),
    rentCents: record.rentCents,
    depositCents: record.depositCents,
    notes: record.notes,
    ownerId: record.unit.property.ownerId,
    tenant: {
      id: record.tenant.id,
      fullName: record.tenant.fullName,
      email: record.tenant.email,
    },
    unit: {
      id: record.unit.id,
      label: record.unit.label,
      propertyId: record.unit.property.id,
      propertyName: record.unit.property.name,
    },
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function summarize(leases: readonly Lease[]): LeasePortfolioSummary {
  const active = leases.filter((lease) => lease.status === 'ACTIVE');
  return {
    leaseCount: leases.length,
    activeLeases: active.length,
    monthlyRentCents: active.reduce((total, lease) => total + lease.rentCents, 0),
  };
}

function emptySummary(): LeasePortfolioSummary {
  return { leaseCount: 0, activeLeases: 0, monthlyRentCents: 0 };
}
