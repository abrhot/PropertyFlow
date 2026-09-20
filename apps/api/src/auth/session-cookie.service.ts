import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REFRESH_TOKEN_COOKIE, SESSION_HINT_COOKIE } from '@propertyflow/constants';
import type { AuthResponse } from '@propertyflow/types';
import type { Request, Response } from 'express';
import { AbilityService } from '../authorization/ability.service';
import type { Env } from '../config/env.validation';
import type { AuthResult } from './auth.service';

/** Owns the browser session cookie contract shared by all authentication flows. */
@Injectable()
export class SessionCookieService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly abilities: AbilityService,
  ) {}

  complete(result: AuthResult, response: Response, request?: Request): AuthResponse {
    const mobile = this.isMobileClient(request);
    // Web keeps the refresh token in an httpOnly cookie. Mobile has no cookie
    // jar, so it receives the refresh token in the body and stores it securely.
    if (!mobile) {
      response.cookie(
        REFRESH_TOKEN_COOKIE,
        result.refreshToken,
        this.refreshOptions(result.refreshMaxAgeMs),
      );
      response.cookie(SESSION_HINT_COOKIE, '1', this.hintOptions(result.refreshMaxAgeMs));
    }
    return {
      accessToken: result.accessToken,
      user: result.user,
      abilityRules: this.abilities.rulesForUser(result.user),
      ...(mobile ? { refreshToken: result.refreshToken } : {}),
    };
  }

  clear(response: Response): void {
    response.clearCookie(REFRESH_TOKEN_COOKIE, this.refreshOptions(0));
    response.clearCookie(SESSION_HINT_COOKIE, this.hintOptions(0));
  }

  /** Reads the refresh token from the cookie (web) or the request body (mobile). */
  readRefreshToken(request: Request): string | undefined {
    const fromCookie = (request.cookies as Record<string, string> | undefined)?.[
      REFRESH_TOKEN_COOKIE
    ];
    if (fromCookie) return fromCookie;
    const fromBody = (request.body as { refreshToken?: unknown } | undefined)?.refreshToken;
    return typeof fromBody === 'string' && fromBody.length > 0 ? fromBody : undefined;
  }

  isMobileClient(request?: Request): boolean {
    const header = request?.headers['x-client-type'];
    const value = Array.isArray(header) ? header[0] : header;
    return value?.toLowerCase() === 'mobile';
  }

  private refreshOptions(maxAge: number) {
    return {
      httpOnly: true,
      secure: this.secure(),
      sameSite: this.sameSite(),
      domain: this.cookieDomain(),
      path: '/api/auth',
      maxAge,
    };
  }

  private hintOptions(maxAge: number) {
    return {
      httpOnly: false,
      secure: this.secure(),
      sameSite: this.sameSite(),
      domain: this.cookieDomain(),
      path: '/',
      maxAge,
    };
  }

  private secure(): boolean {
    return this.config.get('COOKIE_SECURE', { infer: true });
  }

  /**
   * `lax` while the web app and the API share a site (local dev, or both behind
   * one domain). When they don't — a Vercel web app calling a Railway API, say —
   * the browser treats every API call as cross-site and withholds a `lax` cookie,
   * so `/auth/refresh` would never see it and sessions would die at the access
   * token's TTL. `none` is the only value that survives that, and browsers only
   * accept it on a `Secure` cookie, so it follows COOKIE_SECURE rather than
   * being configured on its own.
   */
  private sameSite(): 'none' | 'lax' {
    return this.secure() ? 'none' : 'lax';
  }

  /**
   * Omitted when COOKIE_DOMAIN is blank, which scopes the cookie to the API host
   * alone. Shared platform domains (`.vercel.app`, `.railway.app`) are on the
   * Public Suffix List and cannot be set as a cookie domain anyway.
   */
  private cookieDomain(): string | undefined {
    return this.config.get('COOKIE_DOMAIN', { infer: true }) || undefined;
  }
}
