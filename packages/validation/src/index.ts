/**
 * Zod validation schemas shared between the API (request validation)
 * and the web/mobile apps (form validation), so rules stay in sync.
 */

import { z } from 'zod';
import { USER_ROLES, WORK_ORDER_STATUSES, WORK_ORDER_PRIORITIES } from '@fieldtrack/constants';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(USER_ROLES),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const createWorkOrderSchema = z.object({
  customerId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(WORK_ORDER_PRIORITIES).default('MEDIUM'),
  status: z.enum(WORK_ORDER_STATUSES).default('DRAFT'),
  scheduledFor: z.string().datetime().optional(),
});
export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
