import { Global, Module } from '@nestjs/common';
import { AbilityService } from './ability.service';

/**
 * Provides the {@link AbilityService} everywhere. Global because authorization
 * is cross-cutting: guards, controllers, and feature services all resolve
 * abilities from the same cached, database-backed rule set.
 */
@Global()
@Module({
  providers: [AbilityService],
  exports: [AbilityService],
})
export class AuthorizationModule {}
