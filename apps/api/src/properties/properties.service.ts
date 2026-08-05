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
  ManagerAssignmentsResponse,
  ManagerSummary,
  Property,
  PropertyDetail,
  PropertyListResponse,
  PropertyOwnerSummary,
  PropertyPortfolioSummary,
  PropertyStats,
  RequestUser,
  Unit,
} from '@propertyflow/types';
import type {
  CreatePropertyInput,
  CreateUnitInput,
  ListPropertiesQuery,
  UpdatePropertyInput,
  UpdateUnitInput,
} from '@propertyflow/validation';
import { AbilityService } from '../authorization/ability.service';
import { buildingScope } from '../authorization/building-scope';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertCanAccessProperty,
  canAccessProperty,
  propertyScopeFor,
  type PropertyIdentity,
} from './property-access';

const UNIT_SELECT = {
  id: true,
  propertyId: true,
  label: true,
  bedrooms: true,
  bathrooms: true,
  squareFeet: true,
  marketRentCents: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UnitSelect;

const PROPERTY_SELECT = {
  id: true,
  organizationId: true,
  ownerId: true,
  name: true,
  type: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  postalCode: true,
  country: true,
  yearBuilt: true,
  notes: true,
  imageUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, fullName: true, email: true } },
  units: { select: UNIT_SELECT, orderBy: { label: 'asc' } },
} satisfies Prisma.PropertySelect;

type PropertyRecord = Prisma.PropertyGetPayload<{ select: typeof PROPERTY_SELECT }>;
type UnitRecord = Prisma.UnitGetPayload<{ select: typeof UNIT_SELECT }>;

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilities: AbilityService,
  ) {}

  private get db(): PrismaClient {
    return this.prisma.client;
  }

  async list(user: RequestUser, query: ListPropertiesQuery): Promise<PropertyListResponse> {
    const ability = this.abilities.abilityForUser(user);
    const scope = propertyScopeFor(ability, 'read');
    if (!scope) return { properties: [], summary: emptySummary() };

    const filters: Prisma.PropertyWhereInput[] = [scope, buildingScope(user).property];
    if (!query.includeInactive) filters.push({ isActive: true });
    if (query.type) filters.push({ type: query.type });
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' } as const;
      filters.push({
        OR: [{ name: contains }, { city: contains }, { addressLine1: contains }],
      });
    }

    const records = await this.db.property.findMany({
      where: { AND: filters },
      select: PROPERTY_SELECT,
      orderBy: { name: 'asc' },
      take: 200,
    });

    const properties = records
      .filter((record) => canAccessProperty(ability, 'read', record))
      .map(toProperty);

    return { properties, summary: summarize(properties) };
  }

  /** Owners in the caller's organization who can be attached to a property. */
  async listAssignableOwners(user: RequestUser): Promise<PropertyOwnerSummary[]> {
    const organizationId = requireOrganization(user);
    return this.db.user.findMany({
      where: { organizationId, role: 'OWNER', isActive: true },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(user: RequestUser, id: string): Promise<PropertyDetail> {
    const { record } = await this.loadReadable(user, id);
    return toPropertyDetail(record);
  }

  /** Admin view: every property manager and the buildings assigned to them. */
  async listManagers(user: RequestUser): Promise<ManagerAssignmentsResponse> {
    const organizationId = requireOrganization(user);
    const [managers, properties] = await Promise.all([
      this.db.user.findMany({
        where: { organizationId, role: 'PROPERTY_MANAGER' },
        select: {
          id: true,
          fullName: true,
          email: true,
          isActive: true,
          managedProperties: { where: { organizationId }, select: { id: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      this.db.property.findMany({
        where: { organizationId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return {
      managers: managers.map((manager) => ({
        id: manager.id,
        fullName: manager.fullName,
        email: manager.email,
        isActive: manager.isActive,
        propertyIds: manager.managedProperties.map((property) => property.id),
      })),
      properties,
    };
  }

  /** Admin action: set exactly which buildings a manager is responsible for. */
  async setManagerProperties(
    user: RequestUser,
    managerId: string,
    propertyIds: string[],
  ): Promise<ManagerSummary> {
    const organizationId = requireOrganization(user);
    const manager = await this.db.user.findFirst({
      where: { id: managerId, organizationId, role: 'PROPERTY_MANAGER' },
      select: { id: true },
    });
    if (!manager) throw new NotFoundException('Property manager not found');

    // Ignore ids outside the organization so a request can't reach across orgs.
    const owned = propertyIds.length
      ? await this.db.property.findMany({
          where: { id: { in: propertyIds }, organizationId },
          select: { id: true },
        })
      : [];

    const updated = await this.db.user.update({
      where: { id: managerId },
      data: { managedProperties: { set: owned.map((property) => ({ id: property.id })) } },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        managedProperties: { where: { organizationId }, select: { id: true } },
      },
    });
    return {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      isActive: updated.isActive,
      propertyIds: updated.managedProperties.map((property) => property.id),
    };
  }

  async create(user: RequestUser, input: CreatePropertyInput): Promise<Property> {
    const ability = this.abilities.abilityForUser(user);
    const organizationId = requireOrganization(user);
    const ownerId = await this.resolveOwner(organizationId, input.ownerId);

    assertCanAccessProperty(ability, 'create', {
      id: '',
      organizationId,
      ownerId,
    });

    // A manager creating a building is automatically assigned to run it, so it
    // stays inside their own building scope.
    const assignToManager = buildingScope(user).restricted;

    const record = await this.db.property.create({
      data: {
        organizationId,
        ownerId,
        name: input.name,
        type: input.type,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 ?? null,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: input.country,
        yearBuilt: input.yearBuilt ?? null,
        notes: input.notes ?? null,
        imageUrl: input.imageUrl ?? null,
        ...(assignToManager ? { managers: { connect: { id: user.id } } } : {}),
      },
      select: PROPERTY_SELECT,
    });

    return toProperty(record);
  }

  async update(user: RequestUser, id: string, input: UpdatePropertyInput): Promise<Property> {
    const { ability, record } = await this.loadReadable(user, id);
    assertCanAccessProperty(ability, 'update', record);

    const ownerId =
      input.ownerId === undefined
        ? undefined
        : await this.resolveOwner(record.organizationId, input.ownerId);

    // Re-check against the post-update shape so a property can never be moved
    // outside the caller's own scope.
    if (ownerId !== undefined) {
      assertCanAccessProperty(ability, 'update', { ...record, ownerId });
    }

    const updated = await this.db.property.update({
      where: { id: record.id },
      data: {
        ownerId,
        name: input.name,
        type: input.type,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: input.country,
        yearBuilt: input.yearBuilt,
        notes: input.notes,
        imageUrl: input.imageUrl,
        isActive: input.isActive,
      },
      select: PROPERTY_SELECT,
    });

    return toProperty(updated);
  }

  async remove(user: RequestUser, id: string): Promise<{ message: string }> {
    const { ability, record } = await this.loadReadable(user, id);
    assertCanAccessProperty(ability, 'delete', record);

    await this.db.property.delete({ where: { id: record.id } });
    return { message: `${record.name} was deleted` };
  }

  async addUnit(user: RequestUser, propertyId: string, input: CreateUnitInput): Promise<Unit> {
    const { ability, record } = await this.loadReadable(user, propertyId);
    assertCanAccessProperty(ability, 'update', record);

    try {
      const unit = await this.db.unit.create({
        data: { propertyId: record.id, ...input },
        select: UNIT_SELECT,
      });
      return toUnit(unit);
    } catch (error) {
      throw this.asDuplicateLabel(error, input.label);
    }
  }

  async updateUnit(
    user: RequestUser,
    propertyId: string,
    unitId: string,
    input: UpdateUnitInput,
  ): Promise<Unit> {
    const { ability, record } = await this.loadReadable(user, propertyId);
    assertCanAccessProperty(ability, 'update', record);
    this.requireUnit(record, unitId);

    try {
      const unit = await this.db.unit.update({
        where: { id: unitId },
        data: input,
        select: UNIT_SELECT,
      });
      return toUnit(unit);
    } catch (error) {
      throw this.asDuplicateLabel(error, input.label ?? '');
    }
  }

  async removeUnit(
    user: RequestUser,
    propertyId: string,
    unitId: string,
  ): Promise<{ message: string }> {
    const { ability, record } = await this.loadReadable(user, propertyId);
    assertCanAccessProperty(ability, 'update', record);
    const unit = this.requireUnit(record, unitId);

    await this.db.unit.delete({ where: { id: unitId } });
    return { message: `Unit ${unit.label} was deleted` };
  }

  /**
   * Loads a property the caller is allowed to read.
   *
   * Anything outside that scope reports 404 rather than 403, so ids cannot be
   * probed for existence. Write permission is asserted separately by callers.
   */
  private async loadReadable(
    user: RequestUser,
    id: string,
  ): Promise<{ ability: AppAbility; record: PropertyRecord }> {
    const ability = this.abilities.abilityForUser(user);
    const scope = propertyScopeFor(ability, 'read');
    if (!scope) throw new NotFoundException('Property not found');

    const record = await this.db.property.findFirst({
      where: { AND: [{ id }, scope, buildingScope(user).property] },
      select: PROPERTY_SELECT,
    });
    if (!record || !canAccessProperty(ability, 'read', record)) {
      throw new NotFoundException('Property not found');
    }

    return { ability, record };
  }

  /** Units are only addressable through their parent property. */
  private requireUnit(record: PropertyRecord, unitId: string): UnitRecord {
    const unit = record.units.find((candidate) => candidate.id === unitId);
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  private async resolveOwner(organizationId: string, ownerId?: string): Promise<string | null> {
    if (!ownerId) return null;

    const owner = await this.db.user.findFirst({
      where: { id: ownerId, organizationId, role: 'OWNER', isActive: true },
      select: { id: true },
    });
    if (!owner) {
      throw new BadRequestException('Assign an active owner from your own organization');
    }
    return owner.id;
  }

  private asDuplicateLabel(error: unknown, label: string): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException(`This property already has a unit named "${label}"`);
    }
    return error instanceof Error ? error : new Error('Unit could not be saved');
  }
}

function requireOrganization(user: RequestUser): string {
  if (!user.organizationId) {
    throw new ForbiddenException('Only members of an organization can manage properties');
  }
  return user.organizationId;
}

function toUnit(unit: UnitRecord): Unit {
  return {
    id: unit.id,
    propertyId: unit.propertyId,
    label: unit.label,
    bedrooms: unit.bedrooms,
    bathrooms: unit.bathrooms,
    squareFeet: unit.squareFeet,
    marketRentCents: unit.marketRentCents,
    status: unit.status,
    createdAt: unit.createdAt.toISOString(),
    updatedAt: unit.updatedAt.toISOString(),
  };
}

function statsFor(units: readonly UnitRecord[]): PropertyStats {
  const occupiedUnits = units.filter((unit) => unit.status === 'OCCUPIED').length;
  const monthlyRentCents = units.reduce((total, unit) => total + unit.marketRentCents, 0);

  return {
    unitCount: units.length,
    occupiedUnits,
    vacantUnits: units.filter((unit) => unit.status === 'VACANT').length,
    monthlyRentCents,
    occupancyRate: percentage(occupiedUnits, units.length),
  };
}

function toProperty(record: PropertyRecord): Property {
  return {
    id: record.id,
    organizationId: record.organizationId,
    ownerId: record.ownerId,
    name: record.name,
    type: record.type,
    addressLine1: record.addressLine1,
    addressLine2: record.addressLine2,
    city: record.city,
    state: record.state,
    postalCode: record.postalCode,
    country: record.country,
    yearBuilt: record.yearBuilt,
    notes: record.notes,
    imageUrl: record.imageUrl,
    isActive: record.isActive,
    owner: record.owner,
    stats: statsFor(record.units),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toPropertyDetail(record: PropertyRecord): PropertyDetail {
  return { ...toProperty(record), units: record.units.map(toUnit) };
}

function summarize(properties: readonly Property[]): PropertyPortfolioSummary {
  const unitCount = sum(properties, (property) => property.stats.unitCount);
  const occupiedUnits = sum(properties, (property) => property.stats.occupiedUnits);

  return {
    propertyCount: properties.length,
    unitCount,
    occupiedUnits,
    monthlyRentCents: sum(properties, (property) => property.stats.monthlyRentCents),
    occupancyRate: percentage(occupiedUnits, unitCount),
  };
}

function emptySummary(): PropertyPortfolioSummary {
  return {
    propertyCount: 0,
    unitCount: 0,
    occupiedUnits: 0,
    monthlyRentCents: 0,
    occupancyRate: 0,
  };
}

function sum<T>(items: readonly T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}

function percentage(part: number, whole: number): number {
  return whole ? Math.round((part / whole) * 100) : 0;
}

export type { PropertyIdentity };
