/**
 * Zod validation schemas shared between the API (request validation) and the
 * web/mobile apps (form validation), so rules stay in sync (single source of truth).
 */

import { INVITABLE_ROLES, PROPERTY_TYPES, UNIT_STATUSES } from '@propertyflow/constants';
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

// ---- Portfolio: properties & units ----

const MAX_YEAR_BUILT = new Date().getFullYear() + 5;

/**
 * Treats a blank field as "not provided".
 *
 * HTML inputs always submit a string, so an untouched optional field arrives as
 * `''`. Without this it would fail the inner schema instead of being omitted.
 */
function optionalField<T extends z.ZodTypeAny>(schema: T) {
  return z
    .union([z.literal(''), schema])
    .optional()
    .transform((value) =>
      value === '' || value === undefined ? undefined : (value as z.output<T>),
    );
}

export const createPropertySchema = z.object({
  name: z.string().trim().min(2, 'Property name is too short').max(120),
  type: z.enum(PROPERTY_TYPES),
  addressLine1: z.string().trim().min(3, 'Street address is required').max(160),
  addressLine2: optionalField(z.string().trim().max(160)),
  city: z.string().trim().min(1, 'City is required').max(80),
  state: z.string().trim().min(1, 'State or region is required').max(80),
  postalCode: z.string().trim().min(1, 'Postal code is required').max(20),
  country: z.string().trim().length(2, 'Use a 2-letter country code').toUpperCase().default('US'),
  yearBuilt: optionalField(
    z.coerce
      .number()
      .int()
      .min(1800, 'Year built looks too early')
      .max(MAX_YEAR_BUILT, 'Year built is in the future'),
  ),
  notes: optionalField(z.string().trim().max(2000)),
  ownerId: optionalField(z.string().uuid('Select a valid owner')),
});
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

export const updatePropertySchema = createPropertySchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one field to update',
  });
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;

export const listPropertiesQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  type: z.enum(PROPERTY_TYPES).optional(),
  includeInactive: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((value) => value === true || value === 'true'),
});
export type ListPropertiesQuery = z.infer<typeof listPropertiesQuerySchema>;

/** Rent is stored and transmitted in cents; the UI converts at the edge. */
export const createUnitSchema = z.object({
  label: z.string().trim().min(1, 'Unit label is required').max(40),
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().min(0).max(20).multipleOf(0.5, 'Use half-bathroom increments'),
  squareFeet: optionalField(z.coerce.number().int().min(1).max(1_000_000)),
  marketRentCents: z.coerce.number().int().min(0).max(100_000_000),
  status: z.enum(UNIT_STATUSES),
});
export type CreateUnitInput = z.infer<typeof createUnitSchema>;

export const updateUnitSchema = createUnitSchema
  .partial()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one field to update',
  });
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

/**
 * Form-facing variant of {@link createUnitSchema}: people type rent in whole
 * currency units, so the dollar/cent boundary stays in one place.
 */
export const unitFormSchema = createUnitSchema
  .omit({ marketRentCents: true })
  .extend({ marketRent: z.coerce.number().min(0).max(1_000_000) });
export type UnitFormInput = z.infer<typeof unitFormSchema>;

export function unitFormToRequest(input: UnitFormInput): CreateUnitInput {
  const { marketRent, ...rest } = input;
  return { ...rest, marketRentCents: Math.round(marketRent * 100) };
}
