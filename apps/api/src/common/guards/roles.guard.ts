import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { canAccess } from '@propertyflow/auth';
import type { UserRole } from '@propertyflow/constants';
import type { RequestUser } from '@propertyflow/types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Enforces @Roles(...) restrictions. Runs after JwtAuthGuard, so req.user is set.
 * Note: this checks the ROLE only — org/property scoping must be enforced in
 * services against the resource's organizationId.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    if (!user || !canAccess(user.role, required)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
