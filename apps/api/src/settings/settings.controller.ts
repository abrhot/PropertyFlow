import { Body, Controller, Get, Patch } from '@nestjs/common';
import type {
  AccountProfile,
  NotificationPreferences,
  OrganizationProfile,
  RequestUser,
  SettingsResponse,
} from '@propertyflow/types';
import {
  updateNotificationPreferencesSchema,
  updateOrganizationProfileSchema,
  updateProfileSchema,
  type UpdateNotificationPreferencesInput,
  type UpdateOrganizationProfileInput,
  type UpdateProfileInput,
} from '@propertyflow/validation';
import { CheckAbility } from '../common/decorators/check-ability.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @CheckAbility({ action: 'access', subject: 'settings' })
  get(@CurrentUser() user: RequestUser): Promise<SettingsResponse> {
    return this.settings.get(user);
  }

  @Patch('organization')
  @CheckAbility({ action: 'update', subject: 'Organization' })
  updateOrganization(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateOrganizationProfileSchema))
    input: UpdateOrganizationProfileInput,
  ): Promise<OrganizationProfile> {
    return this.settings.updateOrganizationProfile(user, input);
  }

  @Patch('notifications')
  @CheckAbility({ action: 'access', subject: 'settings' })
  updateNotifications(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateNotificationPreferencesSchema))
    input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferences> {
    return this.settings.updateNotifications(user, input);
  }

  @Patch('profile')
  @CheckAbility({ action: 'access', subject: 'settings' })
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) input: UpdateProfileInput,
  ): Promise<AccountProfile> {
    return this.settings.updateProfile(user, input);
  }
}
