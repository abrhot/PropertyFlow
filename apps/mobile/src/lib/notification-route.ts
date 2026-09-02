import type { Href } from 'expo-router';
import type { AppNotification } from '@propertyflow/types';

/**
 * Maps a notification to the screen where the user can act on it.
 * The API stores web paths; we translate by type first, then path.
 */
export function resolveNotificationRoute(notification: Pick<AppNotification, 'type' | 'linkPath'>): Href {
  switch (notification.type) {
    case 'PAYMENT_DUE':
    case 'PAYMENT_RECEIVED':
      return '/(tabs)/payments';
    case 'MAINTENANCE_SUBMITTED':
    case 'MAINTENANCE_APPROVED':
    case 'MAINTENANCE_REJECTED':
    case 'MAINTENANCE_ASSIGNED':
    case 'MAINTENANCE_COMPLETED':
    case 'MAINTENANCE_VERIFIED':
      return '/(tabs)/maintenance';
    default:
      break;
  }

  const path = (notification.linkPath ?? '').toLowerCase();
  if (!path) return '/notifications';

  const conversationMatch = path.match(/conversations?\/([^/?]+)/);
  if (conversationMatch) return `/conversation/${conversationMatch[1]}` as Href;

  if (path.includes('message') || path.includes('conversation')) return '/(tabs)/messages';
  if (path.includes('payment')) return '/(tabs)/payments';
  if (path.includes('work-order') || path.includes('maintenance')) return '/(tabs)/maintenance';
  if (path.includes('application') || path.includes('inquir')) return '/applications';
  if (path.includes('lease')) return '/lease';
  if (path.includes('report')) return '/reports';
  if (path.includes('setting')) return '/settings';
  if (path.includes('propert')) return '/properties';
  if (path.includes('tenant')) return '/tenants';

  return '/notifications';
}
