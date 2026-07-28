import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AccessTokenPayload, RefreshTokenPayload } from '@propertyflow/auth';
import type { AuthUser } from '@propertyflow/types';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@propertyflow/validation';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Env } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';

const BCRYPT_ROUNDS = 12;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  refreshMaxAgeMs: number;
  user: AuthUser;
}

export interface RequestContext {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // ---------------------------------------------------------------- register

  async register(input: RegisterInput, ctx: RequestContext): Promise<AuthResult> {
    const existing = await this.prisma.client.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const slug = await this.generateUniqueSlug(input.organizationName);

    // Create the organization and its first admin atomically.
    const user = await this.prisma.client.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: input.organizationName, slug },
      });
      return tx.user.create({
        data: {
          organizationId: org.id,
          email: input.email,
          passwordHash,
          fullName: input.fullName,
          role: 'ORG_ADMIN',
        },
      });
    });

    return this.createSession(this.toAuthUser(user), ctx);
  }

  // ------------------------------------------------------------------- login

  async login(input: LoginInput, ctx: RequestContext): Promise<AuthResult> {
    const user = await this.prisma.client.user.findUnique({ where: { email: input.email } });

    // Constant-ish behavior: always run a hash compare to reduce user enumeration.
    const valid = user
      ? await bcrypt.compare(input.password, user.passwordHash)
      : await bcrypt.compare(
          input.password,
          '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidin',
        );

    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('This account is disabled');
    }

    return this.createSession(this.toAuthUser(user), ctx);
  }

  // ----------------------------------------------------------------- refresh

  async refresh(rawRefreshToken: string | undefined, ctx: RequestContext): Promise<AuthResult> {
    if (!rawRefreshToken) throw new UnauthorizedException('Missing refresh token');

    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(rawRefreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid token type');

    const stored = await this.prisma.client.refreshToken.findUnique({
      where: { id: payload.jti },
      include: { user: true },
    });

    const tokenHash = this.sha256(rawRefreshToken);
    const isValid =
      stored &&
      !stored.revokedAt &&
      stored.expiresAt > new Date() &&
      stored.tokenHash === tokenHash;

    if (!isValid) {
      // Possible token reuse/theft: revoke the whole family for this user.
      if (stored) {
        await this.prisma.client.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        this.logger.warn(`Refresh token reuse detected for user ${stored.userId}`);
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!stored.user.isActive) throw new UnauthorizedException('This account is disabled');

    // Rotate: revoke the used token, issue a fresh pair.
    await this.prisma.client.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.createSession(this.toAuthUser(stored.user), ctx);
  }

  // ------------------------------------------------------------------ logout

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(rawRefreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
      await this.prisma.client.refreshToken.updateMany({
        where: { id: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Nothing to revoke for an invalid/expired token.
    }
  }

  // ---------------------------------------------------------------------- me

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException();
    return this.toAuthUser(user);
  }

  // ------------------------------------------------------- forgot / reset pw

  async forgotPassword(
    input: ForgotPasswordInput,
  ): Promise<{ message: string; devToken?: string }> {
    const genericMessage =
      'If an account exists for that email, a password reset link has been sent.';
    const user = await this.prisma.client.user.findUnique({ where: { email: input.email } });
    if (!user) return { message: genericMessage };

    const rawToken = randomBytes(32).toString('hex');
    await this.prisma.client.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.sha256(rawToken),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });

    // TODO: send via email provider (SendGrid/Postmark). For dev we log + return it.
    this.logger.log(`Password reset token for ${user.email}: ${rawToken}`);
    const isProd = this.config.get('NODE_ENV', { infer: true }) === 'production';
    return isProd ? { message: genericMessage } : { message: genericMessage, devToken: rawToken };
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const record = await this.prisma.client.passwordResetToken.findUnique({
      where: { tokenHash: this.sha256(input.token) },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('This reset link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    await this.prisma.client.$transaction([
      this.prisma.client.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.client.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Force re-login everywhere by revoking existing refresh tokens.
      this.prisma.client.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Your password has been reset. You can now sign in.' };
  }

  // --------------------------------------------------------------- internals

  /** Issues the same access/refresh session for login and invitation acceptance. */
  async createSession(user: AuthUser, ctx: RequestContext): Promise<AuthResult> {
    const accessToken = await this.signAccessToken(user);
    const { token: refreshToken, expiresAt, jti } = await this.signRefreshToken(user.id);

    await this.prisma.client.refreshToken.create({
      data: {
        id: jti,
        userId: user.id,
        tokenHash: this.sha256(refreshToken),
        expiresAt,
        userAgent: ctx.userAgent?.slice(0, 255),
        ipAddress: ctx.ipAddress?.slice(0, 64),
      },
    });

    return {
      accessToken,
      refreshToken,
      refreshMaxAgeMs: expiresAt.getTime() - Date.now(),
      user,
    };
  }

  private signAccessToken(user: AuthUser): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      orgId: user.organizationId,
      role: user.role,
      type: 'access',
    };
    return this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
    });
  }

  private async signRefreshToken(
    userId: string,
  ): Promise<{ token: string; expiresAt: Date; jti: string }> {
    const jti = randomUUID();
    const payload: RefreshTokenPayload = { sub: userId, jti, type: 'refresh' };
    const token = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_REFRESH_TTL', { infer: true }),
    });
    const decoded = this.jwt.decode(token) as { exp: number };
    return { token, expiresAt: new Date(decoded.exp * 1000), jti };
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'org';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = attempt === 0 ? base : `${base}-${randomBytes(2).toString('hex')}`;
      const exists = await this.prisma.client.organization.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    return `${base}-${randomBytes(4).toString('hex')}`;
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private toAuthUser(user: {
    id: string;
    organizationId: string | null;
    email: string;
    fullName: string;
    role: AuthUser['role'];
  }): AuthUser {
    return {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }
}
