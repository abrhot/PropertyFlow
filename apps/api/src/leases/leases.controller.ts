import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { Lease, LeaseFormOptions, LeaseListResponse, RequestUser } from '@propertyflow/types';
import {
  createLeaseSchema,
  listLeasesQuerySchema,
  updateLeaseSchema,
  type CreateLeaseInput,
  type ListLeasesQuery,
  type UpdateLeaseInput,
} from '@propertyflow/validation';
import { CheckAbility } from '../common/decorators/check-ability.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { LeasesService } from './leases.service';

/**
 * Two-layer authorization: `@CheckAbility` rejects roles that can never touch a
 * Lease, then the service re-checks the loaded record so organization, owner,
 * and tenant scoping is enforced against real data.
 */
@Controller('leases')
export class LeasesController {
  constructor(private readonly leases: LeasesService) {}

  @Get()
  @CheckAbility({ action: 'read', subject: 'Lease' })
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listLeasesQuerySchema)) query: ListLeasesQuery,
  ): Promise<LeaseListResponse> {
    return this.leases.list(user, query);
  }

  /** Declared before `:id` so the literal path wins the route match. */
  @Get('options')
  @CheckAbility({ action: 'create', subject: 'Lease' })
  formOptions(@CurrentUser() user: RequestUser): Promise<LeaseFormOptions> {
    return this.leases.formOptions(user);
  }

  @Get(':id')
  @CheckAbility({ action: 'read', subject: 'Lease' })
  findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<Lease> {
    return this.leases.findOne(user, id);
  }

  @Post()
  @CheckAbility({ action: 'create', subject: 'Lease' })
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createLeaseSchema)) input: CreateLeaseInput,
  ): Promise<Lease> {
    return this.leases.create(user, input);
  }

  @Patch(':id')
  @CheckAbility({ action: 'update', subject: 'Lease' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateLeaseSchema)) input: UpdateLeaseInput,
  ): Promise<Lease> {
    return this.leases.update(user, id, input);
  }

  @Delete(':id')
  @CheckAbility({ action: 'delete', subject: 'Lease' })
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<{ message: string }> {
    return this.leases.remove(user, id);
  }
}
