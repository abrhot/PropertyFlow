import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { INVITABLE_ROLES, type InvitableRole } from '@propertyflow/constants';
import type {
  AuthUser,
  CreateInvitationResponse,
  InvitationPreview,
  InvitationStatus,
  OrganizationInvitationSummary,
  RequestUser,
} from '@propertyflow/types';
import type {
  AcceptInvitationInput,
  CreateInvitationInput,
  InvitationTokenInput,
} from '@propertyflow/validation';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { AuthService, type AuthResult, type RequestContext } from '../auth/auth.service';
import type { Env } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

interface InvitationRecord {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async create(
    inviter: RequestUser,
    input: CreateInvitationInput,
  ): Promise<CreateInvitationResponse> {
    const organizationId = this.requireOrganizationAdmin(inviter);

    const [organization, existingUser] = await Promise.all([
      this.prisma.client.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, isActive: true },
      }),
      this.prisma.client.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      }),
    ]);

    if (!organization?.isActive) throw new ForbiddenException('Organization is inactive');
    if (existingUser) throw new ConflictException('An account with this email already exists');

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
    const invitation = await this.prisma.client.$transaction(async (tx) => {
      await tx.organizationInvitation.updateMany({
        where: {
          organizationId,
          email: input.email,
          acceptedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      return tx.organizationInvitation.create({
        data: {
          organizationId,
          invitedById: inviter.id,
          email: input.email,
          role: input.role,
          tokenHash: this.sha256(rawToken),
          expiresAt,
        },
      });
    });

    const acceptUrl = `${this.config.get('WEB_ORIGIN', { infer: true })}/accept-invite?token=${encodeURIComponent(rawToken)}`;
    // Replace this logger with a transactional email provider in production.
    this.logger.log(
      `Invitation for ${input.email} to join ${organization.name} as ${input.role}: ${acceptUrl}`,
    );

    const response: CreateInvitationResponse = {
      invitation: this.toSummary(invitation),
    };
    if (this.config.get('NODE_ENV', { infer: true }) !== 'production') {
      response.devAcceptUrl = acceptUrl;
    }
    return response;
  }

  async list(inviter: RequestUser): Promise<OrganizationInvitationSummary[]> {
    const organizationId = this.requireOrganizationAdmin(inviter);
    const invitations = await this.prisma.client.organizationInvitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return invitations.map((invitation) => this.toSummary(invitation));
  }

  async revoke(inviter: RequestUser, invitationId: string): Promise<{ message: string }> {
    const organizationId = this.requireOrganizationAdmin(inviter);
    const result = await this.prisma.client.organizationInvitation.updateMany({
      where: {
        id: invitationId,
        organizationId,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('Pending invitation not found');
    return { message: 'Invitation revoked' };
  }

  async preview(input: InvitationTokenInput): Promise<InvitationPreview> {
    const invitation = await this.prisma.client.organizationInvitation.findUnique({
      where: { tokenHash: this.sha256(input.token) },
      include: { organization: { select: { name: true, isActive: true } } },
    });
    this.assertUsable(invitation);

    return {
      email: invitation.email,
      organizationName: invitation.organization.name,
      role: this.toInvitableRole(invitation.role),
      expiresAt: invitation.expiresAt.toISOString(),
    };
  }

  async accept(input: AcceptInvitationInput, ctx: RequestContext): Promise<AuthResult> {
    const tokenHash = this.sha256(input.token);
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const user = await this.prisma.client.$transaction(async (tx) => {
      const invitation = await tx.organizationInvitation.findUnique({
        where: { tokenHash },
        include: { organization: { select: { isActive: true } } },
      });
      this.assertUsable(invitation);

      const existing = await tx.user.findUnique({
        where: { email: invitation.email },
        select: { id: true },
      });
      if (existing) throw new ConflictException('An account with this email already exists');

      const claimed = await tx.organizationInvitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { acceptedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new UnauthorizedException('This invitation is invalid or has expired');
      }

      return tx.user.create({
        data: {
          organizationId: invitation.organizationId,
          email: invitation.email,
          fullName: input.fullName,
          passwordHash,
          role: this.toInvitableRole(invitation.role),
          emailVerifiedAt: new Date(),
        },
      });
    });

    const authUser: AuthUser = {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
    return this.auth.createSession(authUser, ctx);
  }

  private requireOrganizationAdmin(user: RequestUser): string {
    if (user.role !== 'ORG_ADMIN' || !user.organizationId) {
      throw new ForbiddenException('Only organization administrators can manage invitations');
    }
    return user.organizationId;
  }

  private assertUsable<T extends InvitationRecord & { organization: { isActive: boolean } }>(
    invitation: T | null,
  ): asserts invitation is T {
    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt <= new Date() ||
      !invitation.organization.isActive
    ) {
      throw new UnauthorizedException('This invitation is invalid or has expired');
    }
    this.toInvitableRole(invitation.role);
  }

  private toInvitableRole(role: string): InvitableRole {
    if (!INVITABLE_ROLES.includes(role as InvitableRole)) {
      throw new UnauthorizedException('This invitation has an invalid role');
    }
    return role as InvitableRole;
  }

  private toSummary(invitation: InvitationRecord): OrganizationInvitationSummary {
    return {
      id: invitation.id,
      email: invitation.email,
      role: this.toInvitableRole(invitation.role),
      status: this.statusOf(invitation),
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
    };
  }

  private statusOf(invitation: InvitationRecord): InvitationStatus {
    if (invitation.acceptedAt) return 'ACCEPTED';
    if (invitation.revokedAt) return 'REVOKED';
    if (invitation.expiresAt <= new Date()) return 'EXPIRED';
    return 'PENDING';
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
