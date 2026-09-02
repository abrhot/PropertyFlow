/**
 * Prisma client singleton for PropertyFlow.
 *
 * Run `pnpm --filter @propertyflow/database db:generate` after editing the
 * schema to (re)generate the typed client.
 *
 * The singleton guard prevents exhausting DB connections during dev hot-reload.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/** Named re-exports so Nest can import the Prisma namespace (export * skips it). */
export { Prisma, PrismaClient } from '@prisma/client';
export * from '@prisma/client';
