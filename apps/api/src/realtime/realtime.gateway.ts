import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { AccessTokenPayload } from '@propertyflow/auth';
import type { Env } from '../config/env.validation';
import { RealtimeService, organizationRoom, userRoom } from './realtime.service';
import type { Socket, Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(): void {
    this.realtime.attach(this.server);
  }

  async handleConnection(socket: Socket): Promise<void> {
    const token = this.readToken(socket);
    if (!token) {
      socket.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      if (payload.type !== 'access' || !payload.sub || !payload.orgId) {
        throw new Error('Invalid access token');
      }

      await socket.join([organizationRoom(payload.orgId), userRoom(payload.sub)]);
      socket.data.userId = payload.sub;
      socket.data.organizationId = payload.orgId;
      this.logger.debug(`Realtime client connected: ${socket.id}`);
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void {
    this.logger.debug(`Realtime client disconnected: ${socket.id}`);
  }

  private readToken(socket: Socket): string | undefined {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string') return authToken.replace(/^Bearer\s+/i, '');

    const header = socket.handshake.headers.authorization;
    return typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : undefined;
  }
}
