import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { prisma, type PrismaClient } from '@propertyflow/database';

/**
 * Wraps the shared Prisma singleton so it participates in Nest's lifecycle
 * (connect on boot, disconnect on shutdown) and can be injected anywhere.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient = prisma;

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
