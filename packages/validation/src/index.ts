/**
 * Zod validation schemas shared between the API (request validation) and the
 * web/mobile apps (form validation), so rules stay in sync (single source of truth).
 */

import { INVITABLE_ROLES } from '@propertyflow/constants';
import { z } from 'zod';

/** Reused password policy. Adjust here to change it everywhere. */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters') // bcrypt hard limit
  .regex(/[a-z]/, 'Include at least one lowercase letter')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[0-9]/, 'Include at least one number');

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');

export const registerSchema = z.object({
  organizationName: z.string().trim().min(2, 'Organization name is too short').max(120),
  fullName: z.string().trim().min(2, 'Full name is too short').max(120),
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const createInvitationSchema = z.object({
  email: emailSchema,
  role: z.enum(INVITABLE_ROLES),
});
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const invitationTokenSchema = z.object({
  token: z.string().trim().min(32, 'Invitation token is invalid').max(256),
});
export type InvitationTokenInput = z.infer<typeof invitationTokenSchema>;

export const acceptInvitationSchema = invitationTokenSchema.extend({
  fullName: z.string().trim().min(2, 'Full name is too short').max(120),
  password: passwordSchema,
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
