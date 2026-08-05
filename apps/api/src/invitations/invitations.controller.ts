import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type {
  AuthResponse,
  CreateInvitationResponse,
  InvitationPreview,
  OrganizationInvitationSummary,
  RequestUser,
} from '@propertyflow/types';
import {
  acceptInvitationSchema,
  createInvitationSchema,
  invitationTokenSchema,
  type AcceptInvitationInput,
  type CreateInvitationInput,
  type InvitationTokenInput,
} from '@propertyflow/validation';
import type { Request, Response } from 'express';
import { SessionCookieService } from '../auth/session-cookie.service';
import { CheckAbility } from '../common/decorators/check-ability.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitations: InvitationsService,
    private readonly sessionCookies: SessionCookieService,
  ) {}

  @Get()
  @CheckAbility({ action: 'read', subject: 'Invitation' })
  list(@CurrentUser() user: RequestUser): Promise<OrganizationInvitationSummary[]> {
    return this.invitations.list(user);
  }

  @Post()
  @CheckAbility({ action: 'create', subject: 'Invitation' })
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createInvitationSchema)) input: CreateInvitationInput,
  ): Promise<CreateInvitationResponse> {
    return this.invitations.create(user, input);
  }

  @Delete(':id')
  @CheckAbility({ action: 'delete', subject: 'Invitation' })
  revoke(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<{ message: string }> {
    return this.invitations.revoke(user, id);
  }

  @Public()
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  preview(
    @Body(new ZodValidationPipe(invitationTokenSchema)) input: InvitationTokenInput,
  ): Promise<InvitationPreview> {
    return this.invitations.preview(input);
  }

  @Public()
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  async accept(
    @Body(new ZodValidationPipe(acceptInvitationSchema)) input: AcceptInvitationInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.invitations.accept(input, {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });
    return this.sessionCookies.complete(result, response, request);
  }
}
