import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type PrismaClient } from '@propertyflow/database';
import type {
  MaintenanceFormOptions,
  MaintenanceRequest,
  MaintenanceRequestListResponse,
  RequestUser,
  WorkOrder,
  WorkOrderListResponse,
} from '@propertyflow/types';
import type {
  AssignWorkOrderInput,
  CreateMaintenanceRequestInput,
  ListMaintenanceRequestsQuery,
  ListWorkOrdersQuery,
  UpdateMaintenanceRequestInput,
  UpdateWorkOrderInput,
} from '@propertyflow/validation';
import { AbilityService } from '../authorization/ability.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertAccess, canAccess, scopeFor, type MaintenanceIdentity } from './maintenance-access';

const REQUEST_SELECT = {
  id: true,
  organizationId: true,
  unitId: true,
  leaseId: true,
  tenantId: true,
  ownerId: true,
  assigneeId: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  submittedAt: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  tenant: { select: { id: true, fullName: true, email: true } },
  assignee: { select: { id: true, fullName: true, email: true } },
  unit: {
    select: {
      id: true,
      label: true,
      property: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.MaintenanceRequestSelect;

const WORK_ORDER_SELECT = {
  id: true,
  organizationId: true,
  maintenanceRequestId: true,
  assigneeId: true,
  tenantId: true,
  ownerId: true,
  status: true,
  dueDate: true,
  startedAt: true,
  completedAt: true,
  notes: true,
  referenceCode: true,
  createdAt: true,
  updatedAt: true,
  assignee: { select: { id: true, fullName: true, email: true } },
  maintenanceRequest: {
    select: {
      id: true,
      title: true,
      priority: true,
      tenant: { select: { id: true, fullName: true, email: true } },
      unit: {
        select: {
          id: true,
          label: true,
          property: { select: { id: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.WorkOrderSelect;

type RequestRecord = Prisma.MaintenanceRequestGetPayload<{ select: typeof REQUEST_SELECT }>;
type WorkOrderRecord = Prisma.WorkOrderGetPayload<{ select: typeof WORK_ORDER_SELECT }>;

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilities: AbilityService,
  ) {}

  private get db(): PrismaClient {
    return this.prisma.client;
  }

  async listRequests(
    user: RequestUser,
    query: ListMaintenanceRequestsQuery,
  ): Promise<MaintenanceRequestListResponse> {
    const ability = this.abilities.abilityForUser(user);
    const scope = scopeFor(ability, 'read', 'MaintenanceRequest');
    if (!scope) return { requests: [], summary: emptyRequestSummary() };
    const filters: Prisma.MaintenanceRequestWhereInput[] = [
      scope as Prisma.MaintenanceRequestWhereInput,
    ];
    if (query.status) filters.push({ status: query.status });
    if (query.priority) filters.push({ priority: query.priority });
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' } as const;
      filters.push({
        OR: [
          { title: contains },
          { description: contains },
          { tenant: { fullName: contains } },
          { unit: { label: contains } },
          { unit: { property: { name: contains } } },
        ],
      });
    }
    const records = await this.db.maintenanceRequest.findMany({
      where: { AND: filters },
      select: REQUEST_SELECT,
      orderBy: [{ status: 'asc' }, { submittedAt: 'desc' }],
    });
    const requests = records
      .filter((record) => canAccess(ability, 'read', 'MaintenanceRequest', identityOf(record)))
      .map(toRequest);
    return {
      requests,
      summary: {
        requestCount: requests.length,
        openCount: requests.filter((request) => !['COMPLETED', 'CANCELLED'].includes(request.status))
          .length,
        inProgressCount: requests.filter((request) => request.status === 'IN_PROGRESS').length,
        urgentCount: requests.filter(
          (request) =>
            request.priority === 'URGENT' && !['COMPLETED', 'CANCELLED'].includes(request.status),
        ).length,
      },
    };
  }

  async options(user: RequestUser): Promise<MaintenanceFormOptions> {
    const organizationId = requireOrganization(user);
    const leaseWhere: Prisma.LeaseWhereInput = {
      organizationId,
      status: 'ACTIVE',
      ...(user.role === 'TENANT' ? { tenantId: user.id } : {}),
    };
    const [leases, assignees] = await Promise.all([
      this.db.lease.findMany({
        where: leaseWhere,
        select: {
          id: true,
          tenant: { select: { id: true, fullName: true, email: true } },
          unit: {
            select: {
              id: true,
              label: true,
              property: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.db.user.findMany({
        where: {
          organizationId,
          role: { in: ['ORG_ADMIN', 'PROPERTY_MANAGER'] },
          isActive: true,
        },
        select: { id: true, fullName: true, email: true },
      }),
    ]);
    return {
      leases: leases.map((lease) => ({
        id: lease.id,
        label: lease.unit.label,
        propertyId: lease.unit.property.id,
        propertyName: lease.unit.property.name,
        tenant: lease.tenant,
      })),
      assignees,
    };
  }

  async createRequest(
    user: RequestUser,
    input: CreateMaintenanceRequestInput,
  ): Promise<MaintenanceRequest> {
    const organizationId = requireOrganization(user);
    const ability = this.abilities.abilityForUser(user);
    let lease: {
      id: string;
      tenantId: string;
      unitId: string;
      unit: { property: { ownerId: string | null } };
    } | null = null;
    if (input.leaseId) {
      lease = await this.db.lease.findFirst({
        where: {
          id: input.leaseId,
          organizationId,
          ...(user.role === 'TENANT' ? { tenantId: user.id, status: 'ACTIVE' } : {}),
        },
        select: {
          id: true,
          tenantId: true,
          unitId: true,
          unit: { select: { property: { select: { ownerId: true } } } },
        },
      });
    }
    if (!lease && input.unitId && input.tenantId && user.role !== 'TENANT') {
      lease = await this.db.lease.findFirst({
        where: { organizationId, unitId: input.unitId, tenantId: input.tenantId },
        select: {
          id: true,
          tenantId: true,
          unitId: true,
          unit: { select: { property: { select: { ownerId: true } } } },
        },
      });
    }
    if (!lease) throw new BadRequestException('Select an active lease in your organization');
    const identity = {
      id: '',
      organizationId,
      tenantId: lease.tenantId,
      ownerId: lease.unit.property.ownerId,
      assigneeId: null,
    };
    assertAccess(ability, 'create', 'MaintenanceRequest', identity);
    const created = await this.db.maintenanceRequest.create({
      data: {
        organizationId,
        leaseId: lease.id,
        unitId: lease.unitId,
        tenantId: lease.tenantId,
        ownerId: lease.unit.property.ownerId,
        title: input.title,
        description: input.description,
        priority: input.priority ?? 'NORMAL',
      },
      select: REQUEST_SELECT,
    });
    return toRequest(created);
  }

  async updateRequest(
    user: RequestUser,
    id: string,
    input: UpdateMaintenanceRequestInput,
  ): Promise<MaintenanceRequest> {
    const ability = this.abilities.abilityForUser(user);
    const record = await this.loadRequest(ability, id);
    assertAccess(ability, 'update', 'MaintenanceRequest', identityOf(record));
    if (user.role === 'TENANT') {
      if (record.status !== 'SUBMITTED') {
        throw new ConflictException('Assigned requests can no longer be edited');
      }
      if (input.status && input.status !== 'CANCELLED') {
        throw new ForbiddenException('Tenants may only cancel submitted requests');
      }
    }
    const updated = await this.db.maintenanceRequest.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority,
        status: input.status,
        completedAt: input.status === 'COMPLETED' ? new Date() : undefined,
        cancelledAt: input.status === 'CANCELLED' ? new Date() : undefined,
      },
      select: REQUEST_SELECT,
    });
    return toRequest(updated);
  }

  async assign(user: RequestUser, input: AssignWorkOrderInput): Promise<WorkOrder> {
    const organizationId = requireOrganization(user);
    const ability = this.abilities.abilityForUser(user);
    const request = await this.db.maintenanceRequest.findFirst({
      where: { id: input.maintenanceRequestId, organizationId },
      select: { id: true, tenantId: true, ownerId: true, status: true, workOrder: { select: { id: true } } },
    });
    if (!request) throw new NotFoundException('Maintenance request not found');
    assertAccess(ability, 'assign', 'WorkOrder', {
      id: '',
      organizationId,
      tenantId: request.tenantId,
      ownerId: request.ownerId,
      assigneeId: input.assigneeId,
    });
    if (request.workOrder) throw new ConflictException('This request already has a work order');
    if (['COMPLETED', 'CANCELLED'].includes(request.status)) {
      throw new ConflictException('Closed requests cannot be assigned');
    }
    const assignee = await this.db.user.findFirst({
      where: {
        id: input.assigneeId,
        organizationId,
        role: { in: ['ORG_ADMIN', 'PROPERTY_MANAGER'] },
        isActive: true,
      },
      select: { id: true },
    });
    if (!assignee) throw new BadRequestException('Select an active staff member to assign');
    const referenceCode = `WO-${Date.now().toString(36).slice(-6).toUpperCase()}`;
    const created = await this.db.$transaction(async (tx) => {
      const order = await tx.workOrder.create({
        data: {
          organizationId,
          maintenanceRequestId: request.id,
          assigneeId: input.assigneeId,
          tenantId: request.tenantId,
          ownerId: request.ownerId,
          dueDate: input.dueDate,
          notes: input.notes ?? null,
          referenceCode,
        },
        select: WORK_ORDER_SELECT,
      });
      await tx.maintenanceRequest.update({
        where: { id: request.id },
        data: { status: 'ASSIGNED', assigneeId: input.assigneeId },
      });
      return order;
    });
    return toWorkOrder(created);
  }

  async listWorkOrders(
    user: RequestUser,
    query: ListWorkOrdersQuery,
  ): Promise<WorkOrderListResponse> {
    const ability = this.abilities.abilityForUser(user);
    const scope = scopeFor(ability, 'read', 'WorkOrder');
    if (!scope) return { workOrders: [], summary: emptyWorkOrderSummary() };
    const filters: Prisma.WorkOrderWhereInput[] = [scope as Prisma.WorkOrderWhereInput];
    if (query.status) filters.push({ status: query.status });
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' } as const;
      filters.push({
        OR: [
          { referenceCode: contains },
          { maintenanceRequest: { title: contains } },
          { maintenanceRequest: { unit: { property: { name: contains } } } },
        ],
      });
    }
    const records = await this.db.workOrder.findMany({
      where: { AND: filters },
      select: WORK_ORDER_SELECT,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });
    const workOrders = records
      .filter((record) => canAccess(ability, 'read', 'WorkOrder', workOrderIdentity(record)))
      .map(toWorkOrder);
    return {
      workOrders,
      summary: {
        workOrderCount: workOrders.length,
        assignedCount: workOrders.filter((order) => order.status === 'ASSIGNED').length,
        inProgressCount: workOrders.filter((order) => order.status === 'IN_PROGRESS').length,
        completedCount: workOrders.filter((order) => order.status === 'COMPLETED').length,
      },
    };
  }

  async updateWorkOrder(
    user: RequestUser,
    id: string,
    input: UpdateWorkOrderInput,
  ): Promise<WorkOrder> {
    const ability = this.abilities.abilityForUser(user);
    const scope = scopeFor(ability, 'read', 'WorkOrder');
    if (!scope) throw new NotFoundException('Work order not found');
    const record = await this.db.workOrder.findFirst({
      where: { AND: [{ id }, scope as Prisma.WorkOrderWhereInput] },
      select: WORK_ORDER_SELECT,
    });
    if (!record) throw new NotFoundException('Work order not found');
    assertAccess(ability, 'update', 'WorkOrder', workOrderIdentity(record));
    const status = input.status ?? record.status;
    const updated = await this.db.$transaction(async (tx) => {
      const order = await tx.workOrder.update({
        where: { id },
        data: {
          status: input.status,
          dueDate: input.dueDate,
          notes: input.notes,
          startedAt: input.status === 'IN_PROGRESS' ? record.startedAt ?? new Date() : undefined,
          completedAt: input.status === 'COMPLETED' ? new Date() : undefined,
        },
        select: WORK_ORDER_SELECT,
      });
      await tx.maintenanceRequest.update({
        where: { id: record.maintenanceRequestId },
        data: {
          status,
          completedAt: status === 'COMPLETED' ? new Date() : undefined,
          cancelledAt: status === 'CANCELLED' ? new Date() : undefined,
        },
      });
      return order;
    });
    return toWorkOrder(updated);
  }

  private async loadRequest(
    ability: ReturnType<AbilityService['abilityForUser']>,
    id: string,
  ): Promise<RequestRecord> {
    const scope = scopeFor(ability, 'read', 'MaintenanceRequest');
    if (!scope) throw new NotFoundException('Maintenance request not found');
    const record = await this.db.maintenanceRequest.findFirst({
      where: { AND: [{ id }, scope as Prisma.MaintenanceRequestWhereInput] },
      select: REQUEST_SELECT,
    });
    if (!record || !canAccess(ability, 'read', 'MaintenanceRequest', identityOf(record))) {
      throw new NotFoundException('Maintenance request not found');
    }
    return record;
  }
}

function requireOrganization(user: RequestUser): string {
  if (!user.organizationId) throw new ForbiddenException('Organization membership is required');
  return user.organizationId;
}

function identityOf(record: RequestRecord): MaintenanceIdentity {
  return {
    id: record.id,
    organizationId: record.organizationId,
    tenantId: record.tenantId,
    ownerId: record.ownerId,
    assigneeId: record.assigneeId,
  };
}

function workOrderIdentity(record: WorkOrderRecord): MaintenanceIdentity {
  return {
    id: record.id,
    organizationId: record.organizationId,
    tenantId: record.tenantId,
    ownerId: record.ownerId,
    assigneeId: record.assigneeId,
  };
}

function unitSummary(unit: RequestRecord['unit']) {
  return {
    id: unit.id,
    label: unit.label,
    propertyId: unit.property.id,
    propertyName: unit.property.name,
  };
}

function toRequest(record: RequestRecord): MaintenanceRequest {
  return {
    ...record,
    unit: unitSummary(record.unit),
    submittedAt: record.submittedAt.toISOString(),
    completedAt: record.completedAt?.toISOString() ?? null,
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toWorkOrder(record: WorkOrderRecord): WorkOrder {
  return {
    id: record.id,
    organizationId: record.organizationId,
    maintenanceRequestId: record.maintenanceRequestId,
    assigneeId: record.assigneeId,
    tenantId: record.tenantId,
    ownerId: record.ownerId,
    status: record.status,
    dueDate: record.dueDate?.toISOString() ?? null,
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    notes: record.notes,
    referenceCode: record.referenceCode,
    assignee: record.assignee,
    request: {
      id: record.maintenanceRequest.id,
      title: record.maintenanceRequest.title,
      priority: record.maintenanceRequest.priority,
      tenant: record.maintenanceRequest.tenant,
      unit: unitSummary(record.maintenanceRequest.unit),
    },
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function emptyRequestSummary() {
  return { requestCount: 0, openCount: 0, inProgressCount: 0, urgentCount: 0 };
}

function emptyWorkOrderSummary() {
  return { workOrderCount: 0, assignedCount: 0, inProgressCount: 0, completedCount: 0 };
}
