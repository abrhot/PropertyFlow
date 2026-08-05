import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type {
  CreateTenantResponse,
  RequestUser,
  TenantDirectoryResponse,
} from '@propertyflow/types';
import {
  createTenantSchema,
  listTenantsQuerySchema,
  type CreateTenantInput,
  type ListTenantsQuery,
} from '@propertyflow/validation';
import { CheckAbility } from '../common/decorators/check-ability.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  @CheckAbility({ action: 'read', subject: 'User' })
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listTenantsQuerySchema)) query: ListTenantsQuery,
  ): Promise<TenantDirectoryResponse> {
    return this.tenants.list(user, query);
  }

  @Post()
  @CheckAbility({ action: 'create', subject: 'User' })
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createTenantSchema)) input: CreateTenantInput,
  ): Promise<CreateTenantResponse> {
    return this.tenants.create(user, input);
  }
}
