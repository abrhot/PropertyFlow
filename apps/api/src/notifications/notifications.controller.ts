import { Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type {
  AppNotification,
  NotificationListResponse,
  RequestUser,
  UnreadCountResponse,
} from '@propertyflow/types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser): Promise<NotificationListResponse> {
    return this.notifications.list(user);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: RequestUser): Promise<UnreadCountResponse> {
    return this.notifications.unreadCount(user);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<AppNotification> {
    return this.notifications.markRead(user, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: RequestUser): Promise<UnreadCountResponse> {
    return this.notifications.markAllRead(user);
  }
}
