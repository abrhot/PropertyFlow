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
import type {
  Property,
  PropertyDetail,
  PropertyListResponse,
  PropertyOwnerSummary,
  RequestUser,
  Unit,
} from '@propertyflow/types';
import {
  createPropertySchema,
  createUnitSchema,
  listPropertiesQuerySchema,
  updatePropertySchema,
  updateUnitSchema,
  type CreatePropertyInput,
  type CreateUnitInput,
  type ListPropertiesQuery,
  type UpdatePropertyInput,
  type UpdateUnitInput,
} from '@propertyflow/validation';
import { CheckAbility } from '../common/decorators/check-ability.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PropertiesService } from './properties.service';

/**
 * Authorization happens in two layers: `@CheckAbility` rejects roles that can
 * never touch a Property, then the service re-checks the loaded record so
 * organization and owner scoping is enforced on the real data.
 */
@Controller('properties')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  @CheckAbility({ action: 'read', subject: 'Property' })
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listPropertiesQuerySchema)) query: ListPropertiesQuery,
  ): Promise<PropertyListResponse> {
    return this.properties.list(user, query);
  }

  /** Declared before `:id` so the literal path wins the route match. */
  @Get('owners')
  @CheckAbility({ action: 'update', subject: 'Property' })
  listOwners(@CurrentUser() user: RequestUser): Promise<PropertyOwnerSummary[]> {
    return this.properties.listAssignableOwners(user);
  }

  @Get(':id')
  @CheckAbility({ action: 'read', subject: 'Property' })
  findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PropertyDetail> {
    return this.properties.findOne(user, id);
  }

  @Post()
  @CheckAbility({ action: 'create', subject: 'Property' })
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createPropertySchema)) input: CreatePropertyInput,
  ): Promise<Property> {
    return this.properties.create(user, input);
  }

  @Patch(':id')
  @CheckAbility({ action: 'update', subject: 'Property' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updatePropertySchema)) input: UpdatePropertyInput,
  ): Promise<Property> {
    return this.properties.update(user, id, input);
  }

  @Delete(':id')
  @CheckAbility({ action: 'delete', subject: 'Property' })
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<{ message: string }> {
    return this.properties.remove(user, id);
  }

  // Units are part of the property aggregate, so they inherit its permissions.

  @Post(':id/units')
  @CheckAbility({ action: 'update', subject: 'Property' })
  addUnit(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(createUnitSchema)) input: CreateUnitInput,
  ): Promise<Unit> {
    return this.properties.addUnit(user, id, input);
  }

  @Patch(':id/units/:unitId')
  @CheckAbility({ action: 'update', subject: 'Property' })
  updateUnit(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('unitId', new ParseUUIDPipe()) unitId: string,
    @Body(new ZodValidationPipe(updateUnitSchema)) input: UpdateUnitInput,
  ): Promise<Unit> {
    return this.properties.updateUnit(user, id, unitId, input);
  }

  @Delete(':id/units/:unitId')
  @CheckAbility({ action: 'update', subject: 'Property' })
  removeUnit(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('unitId', new ParseUUIDPipe()) unitId: string,
  ): Promise<{ message: string }> {
    return this.properties.removeUnit(user, id, unitId);
  }
}
