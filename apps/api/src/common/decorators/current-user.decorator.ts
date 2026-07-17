import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { RequestUser } from '@propertyflow/types';

/** Injects the authenticated principal (populated by JwtStrategy) into a handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return request.user;
  },
);
