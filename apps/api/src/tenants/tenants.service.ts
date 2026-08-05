import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { resource } from '@propertyflow/auth';
import type {
  CreateTenantResponse,
  TenantDirectoryEntry,
  TenantDirectoryResponse,
  RequestUser,
} from '@propertyflow/types';
import type { CreateTenantInput, ListTenantsQuery } from '@propertyflow/validation';
import * as bcrypt from 'bcryptjs';
import { AbilityService } from '../authorization/ability.service';
import { buildingScope } from '../authorization/building-scope';
import { PrismaService } from '../prisma/prisma.service';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilities: AbilityService,
  ) {}

  async list(user: RequestUser, query: ListTenantsQuery): Promise<TenantDirectoryResponse> {
    if (!user.organizationId) throw new ForbiddenException('Organization membership is required');
    const ability = this.abilities.abilityForUser(user);
    const contains = query.search
      ? { contains: query.search, mode: 'insensitive' as const }
      : undefined;
    const records = await this.prisma.client.user.findMany({
      where: {
        organizationId: user.organizationId,
        role: 'TENANT',
        ...buildingScope(user).tenant,
        ...(query.includeInactive ? {} : { isActive: true }),
        ...(contains ? { OR: [{ fullName: contains }, { email: contains }] } : {}),
      },
      select: {
        id: true,
        organizationId: true,
        fullName: true,
        email: true,
        isActive: true,
        createdAt: true,
        leasesHeld: {
          where: { status: 'ACTIVE' },
          take: 1,
          select: {
            id: true,
            status: true,
            endDate: true,
            rentCents: true,
            unit: {
              select: {
                id: true,
                label: true,
                property: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });
    const tenants = records
      .filter((tenant) =>
        ability.can(
          'read',
          resource('User', {
            id: tenant.id,
            organizationId: tenant.organizationId,
            role: 'TENANT',
          }),
        ),
      )
      .map((tenant) => {
        const lease = tenant.leasesHeld[0];
        return {
          id: tenant.id,
          organizationId: tenant.organizationId!,
          fullName: tenant.fullName,
          email: tenant.email,
          isActive: tenant.isActive,
          createdAt: tenant.createdAt.toISOString(),
          activeLease: lease
            ? {
                id: lease.id,
                status: lease.status,
                endDate: lease.endDate.toISOString(),
                rentCents: lease.rentCents,
                unit: {
                  id: lease.unit.id,
                  label: lease.unit.label,
                  propertyId: lease.unit.property.id,
                  propertyName: lease.unit.property.name,
                },
              }
            : null,
        };
      });
    const activeLeases = tenants.filter((tenant) => tenant.activeLease).length;
    return {
      tenants,
      summary: {
        tenantCount: tenants.length,
        activeLeases,
        withoutActiveLease: tenants.length - activeLeases,
      },
    };
  }

  /**
   * Onboards a resident: creates their account with a one-time password and,
   * when a unit is provided, places them on an active lease so they appear in
   * their home immediately. Admin-only (enforced by the controller ability).
   */
  async create(user: RequestUser, input: CreateTenantInput): Promise<CreateTenantResponse> {
    const organizationId = user.organizationId;
    if (!organizationId) throw new ForbiddenException('Organization membership is required');

    const email = input.email.toLowerCase();
    const existing = await this.prisma.client.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) throw new ConflictException('A user with that email already exists');

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

    const entry = await this.prisma.client.$transaction(async (tx) => {
      const tenant = await tx.user.create({
        data: {
          organizationId,
          email,
          fullName: input.fullName,
          role: 'TENANT',
          passwordHash,
          isActive: true,
        },
        select: { id: true, organizationId: true, fullName: true, email: true, isActive: true, createdAt: true },
      });

      let activeLease: TenantDirectoryEntry['activeLease'] = null;

      if (input.unitId) {
        const unit = await tx.unit.findFirst({
          where: {
            id: input.unitId,
            property: { organizationId, ...buildingScope(user).property },
          },
          select: { id: true, label: true, property: { select: { id: true, name: true } } },
        });
        if (!unit) throw new BadRequestException('Select a unit from a building you manage');

        const conflict = await tx.lease.findFirst({
          where: { unitId: unit.id, status: 'ACTIVE' },
          select: { id: true },
        });
        if (conflict) throw new ConflictException('This unit already has an active lease');

        const lease = await tx.lease.create({
          data: {
            organizationId,
            unitId: unit.id,
            tenantId: tenant.id,
            status: 'ACTIVE',
            startDate: input.startDate!,
            endDate: input.endDate!,
            rentCents: input.rentCents!,
            depositCents: 0,
          },
          select: { id: true, status: true, endDate: true, rentCents: true },
        });
        await tx.unit.update({ where: { id: unit.id }, data: { status: 'OCCUPIED' } });

        activeLease = {
          id: lease.id,
          status: lease.status,
          endDate: lease.endDate.toISOString(),
          rentCents: lease.rentCents,
          unit: {
            id: unit.id,
            label: unit.label,
            propertyId: unit.property.id,
            propertyName: unit.property.name,
          },
        };
      }

      return {
        id: tenant.id,
        organizationId: tenant.organizationId!,
        fullName: tenant.fullName,
        email: tenant.email,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt.toISOString(),
        activeLease,
      } satisfies TenantDirectoryEntry;
    });

    return { tenant: entry, temporaryPassword };
  }
}

/** A readable one-time password like `Rent-4F9K2QX7`. */
function generateTemporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 8; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `Rent-${suffix}`;
}
