import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { AccessTokenPayload } from '@propertyflow/auth';
import type { RequestUser } from '@propertyflow/types';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Env } from '../../config/env.validation';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Validates the short-lived access token from the Authorization: Bearer header
 * and turns its payload into the `RequestUser` attached to the request.
 *
 * For property managers it also loads the set of buildings assigned to them, so
 * services can scope every query to that manager's portfolio.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<RequestUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
    const user: RequestUser = {
      id: payload.sub,
      organizationId: payload.orgId,
      role: payload.role,
    };
    if (payload.role === 'PROPERTY_MANAGER') {
      const managed = await this.prisma.client.property.findMany({
        where: { managers: { some: { id: payload.sub } } },
        select: { id: true },
      });
      user.managedPropertyIds = managed.map((property) => property.id);
    }
    return user;
  }
}
