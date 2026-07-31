import { ForbiddenException, Injectable } from '@nestjs/common';
import { resource } from '@propertyflow/auth';
import type { TenantDirectoryResponse, RequestUser } from '@propertyflow/types';
import type { ListTenantsQuery } from '@propertyflow/validation';
import { AbilityService } from '../authorization/ability.service';
import { PrismaService } from '../prisma/prisma.service';

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
}
