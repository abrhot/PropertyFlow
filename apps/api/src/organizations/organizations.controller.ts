import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import type {
  OrganizationListResponse,
  PlatformOrganization,
  RequestUser,
} from '@propertyflow/types';
import {
  listOrganizationsQuerySchema,
  updateOrganizationSchema,
  type ListOrganizationsQuery,
  type UpdateOrganizationInput,
} from '@propertyflow/validation';
import { CheckAbility } from '../common/decorators/check-ability.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  @CheckAbility({ action: 'read', subject: 'Organization' })
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listOrganizationsQuerySchema)) query: ListOrganizationsQuery,
  ): Promise<OrganizationListResponse> {
    return this.organizations.list(user, query);
  }

  @Patch(':id')
  @CheckAbility({ action: 'update', subject: 'Organization' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateOrganizationSchema)) input: UpdateOrganizationInput,
  ): Promise<PlatformOrganization> {
    return this.organizations.update(user, id, input);
  }
}
