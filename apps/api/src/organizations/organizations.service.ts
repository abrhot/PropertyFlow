import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@propertyflow/database';
import type {
  OrganizationListResponse,
  PlatformOrganization,
  RequestUser,
  UpdateOrganizationRequest,
} from '@propertyflow/types';
import type { ListOrganizationsQuery } from '@propertyflow/validation';
import { PrismaService } from '../prisma/prisma.service';

const SELECT = {
  id: true,
  name: true,
  slug: true,
  subscriptionTier: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { users: true, properties: true } },
} satisfies Prisma.OrganizationSelect;
type OrganizationRecord = Prisma.OrganizationGetPayload<{ select: typeof SELECT }>;

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser, query: ListOrganizationsQuery): Promise<OrganizationListResponse> {
    assertPlatformAdmin(user);
    const records = await this.prisma.client.organization.findMany({
      where: query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: SELECT,
      orderBy: { createdAt: 'desc' },
    });
    // Active leases per organization, in one grouped query.
    const leaseCounts = await this.prisma.client.lease.groupBy({
      by: ['organizationId'],
      where: { status: 'ACTIVE' },
      _count: { _all: true },
    });
    const activeByOrg = new Map(leaseCounts.map((row) => [row.organizationId, row._count._all]));

    const organizations = records.map((record) => toPlatformOrganization(record, activeByOrg));
    return {
      organizations,
      summary: {
        organizationCount: organizations.length,
        activeCount: organizations.filter((org) => org.isActive).length,
        userCount: organizations.reduce((sum, org) => sum + org.counts.users, 0),
        propertyCount: organizations.reduce((sum, org) => sum + org.counts.properties, 0),
      },
    };
  }

  async update(
    user: RequestUser,
    id: string,
    input: UpdateOrganizationRequest,
  ): Promise<PlatformOrganization> {
    assertPlatformAdmin(user);
    const existing = await this.prisma.client.organization.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Organization not found');
    const record = await this.prisma.client.organization.update({
      where: { id },
      data: input,
      select: SELECT,
    });
    const activeLeases = await this.prisma.client.lease.count({
      where: { organizationId: id, status: 'ACTIVE' },
    });
    return toPlatformOrganization(record, new Map([[id, activeLeases]]));
  }
}

function assertPlatformAdmin(user: RequestUser): void {
  if (user.role !== 'SUPER_ADMIN') {
    throw new ForbiddenException('Only platform administrators can manage organizations');
  }
}

function toPlatformOrganization(
  record: OrganizationRecord,
  activeByOrg: Map<string, number>,
): PlatformOrganization {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    subscriptionTier: record.subscriptionTier,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    counts: {
      users: record._count.users,
      properties: record._count.properties,
      activeLeases: activeByOrg.get(record.id) ?? 0,
    },
  };
}
