import { type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { isObservable, lastValueFrom } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global authentication guard. Requires a valid access token on every route
 * except those marked with @Public(). Public routes still load the user when a
 * valid token is sent, so the assistant can see a signed-in session.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    try {
      const result = super.canActivate(context);
      const allowed = isObservable(result) ? await lastValueFrom(result) : await result;
      return Boolean(allowed);
    } catch (error) {
      if (isPublic) return true;
      throw error;
    }
  }
}
