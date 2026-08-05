import { Injectable, NotFoundException } from '@nestjs/common';
import type { NotificationType, Prisma, PrismaClient } from '@propertyflow/database';
import type {
  AppNotification,
  NotificationListResponse,
  RequestUser,
  UnreadCountResponse,
} from '@propertyflow/types';
import { PrismaService } from '../prisma/prisma.service';

const LIST_LIMIT = 30;

interface NotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  linkPath?: string | null;
}

/**
 * Creates and reads in-app notifications. Feature services (maintenance,
 * payments) call the `notify*` helpers to fan a domain event out to the right
 * recipients; the web app polls {@link unreadCount} to drive the header bell.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): PrismaClient {
    return this.prisma.client;
  }

  /** Create one notification for a single recipient. */
  async notifyUser(
    organizationId: string,
    userId: string,
    input: NotificationInput,
  ): Promise<void> {
    await this.db.notification.create({
      data: {
        organizationId,
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        linkPath: input.linkPath ?? null,
      },
    });
  }

  /** Create the same notification for many recipients (skips empty ids). */
  async notifyUsers(
    organizationId: string,
    userIds: string[],
    input: NotificationInput,
  ): Promise<void> {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (!unique.length) return;
    await this.db.notification.createMany({
      data: unique.map((userId) => ({
        organizationId,
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        linkPath: input.linkPath ?? null,
      })),
    });
  }

  /**
   * Notify every staff member who can act on a request for the given property:
   * all org admins, plus property managers who either run that building or are
   * unrestricted (no building assignments).
   */
  async notifyPropertyStaff(
    organizationId: string,
    propertyId: string,
    input: NotificationInput,
    excludeUserId?: string,
  ): Promise<void> {
    // Never notify tenants, owners, or field techs here — only people who run
    // the building (admins + scoped managers).
    const staff = await this.db.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: { in: ['ORG_ADMIN', 'PROPERTY_MANAGER'] },
        OR: [
          { role: 'ORG_ADMIN' },
          { role: 'PROPERTY_MANAGER', managedProperties: { none: {} } },
          { role: 'PROPERTY_MANAGER', managedProperties: { some: { id: propertyId } } },
        ],
      },
      select: { id: true },
    });
    await this.notifyUsers(
      organizationId,
      staff.map((member) => member.id).filter((id) => id !== excludeUserId),
      input,
    );
  }

  async list(user: RequestUser): Promise<NotificationListResponse> {
    const [records, unreadCount] = await Promise.all([
      this.db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: LIST_LIMIT,
      }),
      this.db.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);
    return { notifications: records.map(toNotification), unreadCount };
  }

  async unreadCount(user: RequestUser): Promise<UnreadCountResponse> {
    const unreadCount = await this.db.notification.count({
      where: { userId: user.id, isRead: false },
    });
    return { unreadCount };
  }

  async markRead(user: RequestUser, id: string): Promise<AppNotification> {
    const existing = await this.db.notification.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) throw new NotFoundException('Notification not found');
    const updated = await this.db.notification.update({
      where: { id },
      data: { isRead: true, readAt: existing.readAt ?? new Date() },
    });
    return toNotification(updated);
  }

  async markAllRead(user: RequestUser): Promise<UnreadCountResponse> {
    await this.db.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { unreadCount: 0 };
  }
}

type NotificationRecord = Prisma.NotificationGetPayload<Record<string, never>>;

function toNotification(record: NotificationRecord): AppNotification {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    body: record.body,
    linkPath: record.linkPath,
    isRead: record.isRead,
    createdAt: record.createdAt.toISOString(),
  };
}
