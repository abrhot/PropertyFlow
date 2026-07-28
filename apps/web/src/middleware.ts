import { SESSION_HINT_COOKIE } from '@propertyflow/constants';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge route guard. Redirects unauthenticated users away from protected routes
 * before any protected HTML is rendered (no flash of protected content).
 *
 * This checks a non-secret "hint" cookie for UX only — the API still enforces
 * real authorization via JWT on every request, and the client's RequireAuth
 * re-validates the session against `/auth/me`.
 */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has(SESSION_HINT_COOKIE);
  const { pathname } = req.nextUrl;

  if (!hasSession) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Protected areas (extend as new authenticated sections are added).
  matcher: ['/dashboard/:path*'],
};
