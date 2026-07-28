import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { defineAbilityFor } from '@propertyflow/auth';
import type { RequestUser } from '@propertyflow/types';
import {
  REQUIRED_ABILITIES_KEY,
  type RequiredAbility,
} from '../decorators/check-ability.decorator';

/** Enforces action/subject policies after JwtAuthGuard has authenticated the request. */
@Injectable()
export class AbilitiesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirements = this.reflector.getAllAndOverride<RequiredAbility[] | undefined>(
      REQUIRED_ABILITIES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requirements?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    if (!user) throw new ForbiddenException('Authentication is required');

    const ability = defineAbilityFor(user);
    const denied = requirements.find(({ action, subject }) => !ability.can(action, subject));

    if (denied) {
      throw new ForbiddenException(`Not permitted to ${denied.action} ${String(denied.subject)}`);
    }

    return true;
  }
}
