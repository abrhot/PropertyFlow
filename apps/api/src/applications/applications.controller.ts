import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type { ApplicationFormOptions, ApplicationListResponse, RentalApplication, RequestUser } from '@propertyflow/types';
import {
  createApplicationSchema, listApplicationsQuerySchema, updateApplicationSchema,
  type CreateApplicationInput, type ListApplicationsQuery, type UpdateApplicationInput,
} from '@propertyflow/validation';
import { CheckAbility } from '../common/decorators/check-ability.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApplicationsService } from './applications.service';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  @CheckAbility({ action: 'read', subject: 'Application' })
  list(@CurrentUser() user: RequestUser, @Query(new ZodValidationPipe(listApplicationsQuerySchema)) query: ListApplicationsQuery): Promise<ApplicationListResponse> {
    return this.applications.list(user, query);
  }
  @Get('options')
  @CheckAbility({ action: 'create', subject: 'Application' })
  options(@CurrentUser() user: RequestUser): Promise<ApplicationFormOptions> {
    return this.applications.options(user);
  }
  @Post()
  @CheckAbility({ action: 'create', subject: 'Application' })
  create(@CurrentUser() user: RequestUser, @Body(new ZodValidationPipe(createApplicationSchema)) input: CreateApplicationInput): Promise<RentalApplication> {
    return this.applications.create(user, input);
  }
  @Patch(':id')
  @CheckAbility({ action: 'update', subject: 'Application' })
  update(@CurrentUser() user: RequestUser, @Param('id', new ParseUUIDPipe()) id: string, @Body(new ZodValidationPipe(updateApplicationSchema)) input: UpdateApplicationInput): Promise<RentalApplication> {
    return this.applications.update(user, id, input);
  }
}
