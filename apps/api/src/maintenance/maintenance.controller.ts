import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type {
  MaintenanceFormOptions,
  MaintenanceRequest,
  MaintenanceRequestListResponse,
  RequestUser,
  WorkOrder,
  WorkOrderListResponse,
} from '@propertyflow/types';
import {
  assignWorkOrderSchema,
  createMaintenanceRequestSchema,
  listMaintenanceRequestsQuerySchema,
  listWorkOrdersQuerySchema,
  updateMaintenanceRequestSchema,
  updateWorkOrderSchema,
  type AssignWorkOrderInput,
  type CreateMaintenanceRequestInput,
  type ListMaintenanceRequestsQuery,
  type ListWorkOrdersQuery,
  type UpdateMaintenanceRequestInput,
  type UpdateWorkOrderInput,
} from '@propertyflow/validation';
import { CheckAbility } from '../common/decorators/check-ability.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { MaintenanceService } from './maintenance.service';

@Controller('maintenance-requests')
export class MaintenanceRequestsController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get()
  @CheckAbility({ action: 'read', subject: 'MaintenanceRequest' })
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listMaintenanceRequestsQuerySchema))
    query: ListMaintenanceRequestsQuery,
  ): Promise<MaintenanceRequestListResponse> {
    return this.maintenance.listRequests(user, query);
  }

  @Get('options')
  @CheckAbility({ action: 'create', subject: 'MaintenanceRequest' })
  options(@CurrentUser() user: RequestUser): Promise<MaintenanceFormOptions> {
    return this.maintenance.options(user);
  }

  @Post()
  @CheckAbility({ action: 'create', subject: 'MaintenanceRequest' })
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createMaintenanceRequestSchema))
    input: CreateMaintenanceRequestInput,
  ): Promise<MaintenanceRequest> {
    return this.maintenance.createRequest(user, input);
  }

  @Patch(':id')
  @CheckAbility({ action: 'update', subject: 'MaintenanceRequest' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateMaintenanceRequestSchema))
    input: UpdateMaintenanceRequestInput,
  ): Promise<MaintenanceRequest> {
    return this.maintenance.updateRequest(user, id, input);
  }
}

@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get()
  @CheckAbility({ action: 'read', subject: 'WorkOrder' })
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listWorkOrdersQuerySchema)) query: ListWorkOrdersQuery,
  ): Promise<WorkOrderListResponse> {
    return this.maintenance.listWorkOrders(user, query);
  }

  @Post()
  @CheckAbility({ action: 'assign', subject: 'WorkOrder' })
  assign(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(assignWorkOrderSchema)) input: AssignWorkOrderInput,
  ): Promise<WorkOrder> {
    return this.maintenance.assign(user, input);
  }

  @Patch(':id')
  @CheckAbility({ action: 'update', subject: 'WorkOrder' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateWorkOrderSchema)) input: UpdateWorkOrderInput,
  ): Promise<WorkOrder> {
    return this.maintenance.updateWorkOrder(user, id, input);
  }
}
