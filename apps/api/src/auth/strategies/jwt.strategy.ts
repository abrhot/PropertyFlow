import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { AccessTokenPayload } from '@propertyflow/auth';
import type { RequestUser } from '@propertyflow/types';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Env } from '../../config/env.validation';

/**
 * Validates the short-lived access token from the Authorization: Bearer header
 * and turns its payload into the `RequestUser` attached to the request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService<Env, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  validate(payload: AccessTokenPayload): RequestUser {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
    return {
      id: payload.sub,
      organizationId: payload.orgId,
      role: payload.role,
    };
  }
}
