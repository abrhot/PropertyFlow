import { SetMetadata } from '@nestjs/common';
import type { AppAction, PolicySubject } from '@propertyflow/auth';

export const REQUIRED_ABILITIES_KEY = 'required_abilities';

export interface RequiredAbility {
  action: AppAction;
  subject: PolicySubject;
}

/**
 * Requires every declared CASL ability on a controller or route.
 *
 * Resource-instance checks still belong in the service after the entity has
 * been loaded; this decorator performs the fail-fast subject-type check.
 */
export const CheckAbility = (...requirements: RequiredAbility[]) =>
  SetMetadata(REQUIRED_ABILITIES_KEY, requirements);
