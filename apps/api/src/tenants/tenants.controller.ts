import { Controller, Get, Query } from '@nestjs/common';
import type { RequestUser, TenantDirectoryResponse } from '@propertyflow/types';
import { listTenantsQuerySchema, type ListTenantsQuery } from '@propertyflow/validation';
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
}
