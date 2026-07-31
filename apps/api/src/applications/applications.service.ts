import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { resource } from '@propertyflow/auth';
import { Prisma } from '@propertyflow/database';
import type {
  ApplicationFormOptions,
  ApplicationListResponse,
  RentalApplication,
  RequestUser,
} from '@propertyflow/types';
import type {
  CreateApplicationInput,
  ListApplicationsQuery,
  UpdateApplicationInput,
} from '@propertyflow/validation';
import { AbilityService } from '../authorization/ability.service';
import { PrismaService } from '../prisma/prisma.service';

const SELECT = {
  id: true, organizationId: true, unitId: true, applicantName: true, applicantEmail: true,
  applicantPhone: true, monthlyIncomeCents: true, desiredMoveIn: true, status: true, notes: true,
  submittedAt: true, updatedAt: true,
  unit: { select: { id: true, label: true, property: { select: { id: true, name: true } } } },
} satisfies Prisma.ApplicationSelect;
type Record = Prisma.ApplicationGetPayload<{ select: typeof SELECT }>;

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService, private readonly abilities: AbilityService) {}

  async list(user: RequestUser, query: ListApplicationsQuery): Promise<ApplicationListResponse> {
    const organizationId = requireOrg(user);
    const ability = this.abilities.abilityForUser(user);
    const contains = query.search ? { contains: query.search, mode: 'insensitive' as const } : undefined;
    const records = await this.prisma.client.application.findMany({
      where: {
        organizationId,
        ...(query.status ? { status: query.status } : {}),
        ...(contains ? { OR: [{ applicantName: contains }, { applicantEmail: contains }, { unit: { property: { name: contains } } }] } : {}),
      },
      select: SELECT,
      orderBy: { submittedAt: 'desc' },
    });
    const applications = records
      .filter((record) => ability.can('read', resource('Application', { id: record.id, organizationId })))
      .map(toApplication);
    const decided = applications.filter((item) => ['APPROVED', 'DENIED'].includes(item.status));
    return {
      applications,
      summary: {
        applicationCount: applications.length,
        newCount: applications.filter((item) => item.status === 'NEW').length,
        screeningCount: applications.filter((item) => item.status === 'SCREENING').length,
        approvalRate: decided.length ? Math.round((decided.filter((item) => item.status === 'APPROVED').length / decided.length) * 100) : 0,
      },
    };
  }

  async options(user: RequestUser): Promise<ApplicationFormOptions> {
    const organizationId = requireOrg(user);
    const units = await this.prisma.client.unit.findMany({
      where: { property: { organizationId }, status: 'VACANT' },
      select: { id: true, label: true, property: { select: { id: true, name: true } } },
      orderBy: [{ property: { name: 'asc' } }, { label: 'asc' }],
    });
    return { units: units.map((unit) => ({ id: unit.id, label: unit.label, propertyId: unit.property.id, propertyName: unit.property.name })) };
  }

  async create(user: RequestUser, input: CreateApplicationInput): Promise<RentalApplication> {
    const organizationId = requireOrg(user);
    const ability = this.abilities.abilityForUser(user);
    const unit = await this.prisma.client.unit.findFirst({ where: { id: input.unitId, property: { organizationId } }, select: { id: true } });
    if (!unit) throw new BadRequestException('Select a unit from your organization');
    if (!ability.can('create', resource('Application', { organizationId }))) throw new ForbiddenException();
    return toApplication(await this.prisma.client.application.create({
      data: { ...input, organizationId, desiredMoveIn: input.desiredMoveIn ?? null, applicantPhone: input.applicantPhone ?? null, notes: input.notes ?? null },
      select: SELECT,
    }));
  }

  async update(user: RequestUser, id: string, input: UpdateApplicationInput): Promise<RentalApplication> {
    const organizationId = requireOrg(user);
    const ability = this.abilities.abilityForUser(user);
    const record = await this.prisma.client.application.findFirst({ where: { id, organizationId }, select: SELECT });
    if (!record || !ability.can('update', resource('Application', { id, organizationId }))) throw new NotFoundException('Application not found');
    return toApplication(await this.prisma.client.application.update({ where: { id }, data: input, select: SELECT }));
  }
}

function requireOrg(user: RequestUser) {
  if (!user.organizationId) throw new ForbiddenException('Organization membership is required');
  return user.organizationId;
}
function toApplication(record: Record): RentalApplication {
  return {
    ...record,
    applicantPhone: record.applicantPhone,
    desiredMoveIn: record.desiredMoveIn?.toISOString() ?? null,
    submittedAt: record.submittedAt.toISOString(),
    createdAt: record.submittedAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    unit: { id: record.unit.id, label: record.unit.label, propertyId: record.unit.property.id, propertyName: record.unit.property.name },
  };
}
