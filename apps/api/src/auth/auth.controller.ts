import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REFRESH_TOKEN_COOKIE } from '@propertyflow/constants';
import type { AuthResponse, AuthUser, RequestUser } from '@propertyflow/types';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
} from '@propertyflow/validation';
import type { Request, Response } from 'express';
import type { Env } from '../config/env.validation';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService, type AuthResult } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.register(dto, this.ctx(req));
    return this.completeSession(result, res);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.login(dto, this.ctx(req));
    return this.completeSession(result, res);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const token = this.readRefreshCookie(req);
    const result = await this.authService.refresh(token, this.ctx(req));
    return this.completeSession(result, res);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(this.readRefreshCookie(req));
    res.clearCookie(REFRESH_TOKEN_COOKIE, this.cookieOptions(0));
    return { message: 'Logged out' };
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser): Promise<AuthUser> {
    return this.authService.me(user.id);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) dto: ForgotPasswordInput,
  ): Promise<{ message: string; devToken?: string }> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordInput,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  // --------------------------------------------------------------- internals

  private completeSession(result: AuthResult, res: Response): AuthResponse {
    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, this.cookieOptions(result.refreshMaxAgeMs));
    return { accessToken: result.accessToken, user: result.user };
  }

  private readRefreshCookie(req: Request): string | undefined {
    return (req.cookies as Record<string, string> | undefined)?.[REFRESH_TOKEN_COOKIE];
  }

  private cookieOptions(maxAgeMs: number) {
    return {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      sameSite: 'lax' as const,
      domain: this.config.get('COOKIE_DOMAIN', { infer: true }),
      path: '/api/auth',
      maxAge: maxAgeMs,
    };
  }

  private ctx(req: Request) {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  }
}
