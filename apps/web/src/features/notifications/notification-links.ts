import type { UserRole } from '@propertyflow/constants';

/**
 * Resolves a notification deep-link for the signed-in role so a tenant never
 * lands on staff pages (and vice versa) even if a row was seeded incorrectly.
 */
export function resolveNotificationPath(
  linkPath: string | null | undefined,
  role: UserRole,
): string | null {
  if (!linkPath) return null;
  const path = linkPath.startsWith('/') ? linkPath : `/${linkPath}`;

  if (role === 'TENANT') {
    if (
      path.startsWith('/dashboard/my-') ||
      path === '/dashboard/messages' ||
      path === '/dashboard/settings' ||
      path === '/dashboard'
    ) {
      return path;
    }
    if (path.includes('maintenance') || path.includes('work-order')) return '/dashboard/my-requests';
    if (path.includes('payment')) return '/dashboard/my-payments';
    if (path.includes('lease')) return '/dashboard/my-lease';
    if (path.includes('message')) return '/dashboard/messages';
    return '/dashboard';
  }

  if (role === 'MAINTENANCE') {
    if (
      path.startsWith('/dashboard/work-orders') ||
      path === '/dashboard/settings' ||
      path === '/dashboard'
    ) {
      return path;
    }
    if (path.includes('maintenance') || path.includes('work-order')) return '/dashboard/work-orders';
    return '/dashboard/work-orders';
  }

  if (role === 'OWNER') {
    if (
      path.startsWith('/dashboard/properties') ||
      path.startsWith('/dashboard/reports') ||
      path === '/dashboard/settings' ||
      path === '/dashboard'
    ) {
      return path;
    }
    return '/dashboard';
  }

  // ORG_ADMIN + PROPERTY_MANAGER — remapped away from tenant-only routes.
  if (path.startsWith('/dashboard/my-payments')) return '/dashboard/payments';
  if (path.startsWith('/dashboard/my-requests')) return '/dashboard/maintenance';
  if (path.startsWith('/dashboard/my-lease')) return '/dashboard/tenants';
  if (role === 'PROPERTY_MANAGER' && path.startsWith('/dashboard/reports')) return '/dashboard';
  if (role === 'PROPERTY_MANAGER' && path.startsWith('/dashboard/team')) return '/dashboard';
  return path;
}
