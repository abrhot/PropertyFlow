import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

export const organizationRoom = (organizationId: string) => `organization:${organizationId}`;
export const userRoom = (userId: string) => `user:${userId}`;

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private server: Server | null = null;

  attach(server: Server): void {
    this.server = server;
  }

  emitToOrganization<T>(organizationId: string, event: string, payload: T): void {
    if (!this.server) {
      this.logger.warn(`Dropped realtime event before gateway was ready: ${event}`);
      return;
    }
    this.server.to(organizationRoom(organizationId)).emit(event, payload);
  }

  emitToUser<T>(userId: string, event: string, payload: T): void {
    if (!this.server) {
      this.logger.warn(`Dropped realtime event before gateway was ready: ${event}`);
      return;
    }
    this.server.to(userRoom(userId)).emit(event, payload);
  }
}
