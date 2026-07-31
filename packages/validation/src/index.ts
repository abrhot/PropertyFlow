/**
 * Zod validation schemas shared between the API (request validation) and the
 * web/mobile apps (form validation), so rules stay in sync (single source of truth).
 */

import {
  APPLICATION_STATUSES,
  INVITABLE_ROLES,
  LEASE_STATUSES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  PAYMENT_STATUSES,
  PROPERTY_TYPES,
  SUBSCRIPTION_TIERS,
  UNIT_STATUSES,
  WORK_ORDER_STATUSES,
} from '@propertyflow/constants';
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

// ---- Leases ----

export const createLeaseSchema = z
  .object({
    unitId: z.string().uuid('Select a unit'),
    tenantId: z.string().uuid('Select a tenant'),
    status: z.enum(LEASE_STATUSES).default('DRAFT'),
    startDate: z.coerce.date({ invalid_type_error: 'Enter a valid start date' }),
    endDate: z.coerce.date({ invalid_type_error: 'Enter a valid end date' }),
    rentCents: z.coerce.number().int().min(0).max(100_000_000),
    depositCents: z.coerce.number().int().min(0).max(100_000_000).default(0),
    notes: optionalField(z.string().trim().max(2000)),
  })
  .refine((value) => value.endDate > value.startDate, {
    message: 'End date must be after the start date',
    path: ['endDate'],
  });
export type CreateLeaseInput = z.infer<typeof createLeaseSchema>;

// `unitId` is fixed once a lease exists; everything else may change.
const leaseUpdateFields = z.object({
  tenantId: z.string().uuid('Select a tenant'),
  status: z.enum(LEASE_STATUSES),
  startDate: z.coerce.date({ invalid_type_error: 'Enter a valid start date' }),
  endDate: z.coerce.date({ invalid_type_error: 'Enter a valid end date' }),
  rentCents: z.coerce.number().int().min(0).max(100_000_000),
  depositCents: z.coerce.number().int().min(0).max(100_000_000),
  notes: optionalField(z.string().trim().max(2000)),
});

export const updateLeaseSchema = leaseUpdateFields
  .partial()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one field to update',
  })
  .refine((value) => !value.startDate || !value.endDate || value.endDate > value.startDate, {
    message: 'End date must be after the start date',
    path: ['endDate'],
  });
export type UpdateLeaseInput = z.infer<typeof updateLeaseSchema>;

export const listLeasesQuerySchema = z.object({
  status: z.enum(LEASE_STATUSES).optional(),
  unitId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  search: z.string().trim().max(120).optional(),
});
export type ListLeasesQuery = z.infer<typeof listLeasesQuerySchema>;

/**
 * Form-facing variant: people type whole-currency rent and pick dates as
 * `yyyy-mm-dd` strings, so the dollar/cent and date conversions live here.
 */
export const leaseFormSchema = z
  .object({
    unitId: z.string().uuid('Select a unit'),
    tenantId: z.string().uuid('Select a tenant'),
    status: z.enum(LEASE_STATUSES),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    rent: z.coerce.number().min(0).max(1_000_000),
    deposit: z.coerce.number().min(0).max(1_000_000),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((value) => new Date(value.endDate) > new Date(value.startDate), {
    message: 'End date must be after the start date',
    path: ['endDate'],
  });
export type LeaseFormInput = z.infer<typeof leaseFormSchema>;

/** Produces the wire shape (ISO dates, cents) the API client sends as JSON. */
export function leaseFormToCreateRequest(input: LeaseFormInput) {
  return {
    unitId: input.unitId,
    tenantId: input.tenantId,
    status: input.status,
    startDate: new Date(input.startDate).toISOString(),
    endDate: new Date(input.endDate).toISOString(),
    rentCents: Math.round(input.rent * 100),
    depositCents: Math.round(input.deposit * 100),
    notes: input.notes ? input.notes : undefined,
  };
}

/** Update variant of {@link leaseFormToCreateRequest} (no immutable unitId). */
export function leaseFormToUpdateRequest(input: LeaseFormInput) {
  const { unitId: _unitId, ...request } = leaseFormToCreateRequest(input);
  return request;
}

// ---- Payments ----

export const createPaymentSchema = z.object({
  leaseId: z.string().uuid('Select a lease'),
  amountCents: z.coerce.number().int().positive().max(100_000_000),
  dueDate: z.coerce.date({ invalid_type_error: 'Enter a valid due date' }),
  description: z.string().trim().min(2).max(200),
  status: z.enum(PAYMENT_STATUSES).default('PENDING'),
  method: optionalField(z.string().trim().max(50)),
  reference: optionalField(z.string().trim().max(120)),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const updatePaymentSchema = createPaymentSchema
  .omit({ leaseId: true })
  .partial()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one field to update',
  });
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

export const listPaymentsQuerySchema = z.object({
  status: z.enum(PAYMENT_STATUSES).optional(),
  leaseId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  search: z.string().trim().max(120).optional(),
});
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;

export const paymentFormSchema = z.object({
  leaseId: z.string().uuid('Select a lease'),
  amount: z.coerce.number().positive('Amount must be greater than zero').max(1_000_000),
  dueDate: z.string().min(1, 'Due date is required'),
  description: z.string().trim().min(2).max(200),
  status: z.enum(PAYMENT_STATUSES),
  method: z.string().trim().max(50).optional(),
  reference: z.string().trim().max(120).optional(),
});
export type PaymentFormInput = z.infer<typeof paymentFormSchema>;

export function paymentFormToCreateRequest(input: PaymentFormInput) {
  return {
    leaseId: input.leaseId,
    amountCents: Math.round(input.amount * 100),
    dueDate: new Date(input.dueDate).toISOString(),
    description: input.description,
    status: input.status,
    method: input.method || undefined,
    reference: input.reference || undefined,
  };
}

// ---- Maintenance ----

export const createMaintenanceRequestSchema = z
  .object({
    leaseId: optionalField(z.string().uuid()),
    unitId: optionalField(z.string().uuid()),
    tenantId: optionalField(z.string().uuid()),
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(10).max(4000),
    priority: z.enum(MAINTENANCE_PRIORITIES).default('NORMAL'),
  })
  .refine((value) => value.leaseId || (value.unitId && value.tenantId), {
    message: 'Select a lease or a unit and tenant',
    path: ['leaseId'],
  });
export type CreateMaintenanceRequestInput = z.infer<typeof createMaintenanceRequestSchema>;

export const updateMaintenanceRequestSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().min(10).max(4000).optional(),
    priority: z.enum(MAINTENANCE_PRIORITIES).optional(),
    status: z.enum(MAINTENANCE_STATUSES).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one field to update',
  });
export type UpdateMaintenanceRequestInput = z.infer<typeof updateMaintenanceRequestSchema>;

export const listMaintenanceRequestsQuerySchema = z.object({
  status: z.enum(MAINTENANCE_STATUSES).optional(),
  priority: z.enum(MAINTENANCE_PRIORITIES).optional(),
  search: z.string().trim().max(120).optional(),
});
export type ListMaintenanceRequestsQuery = z.infer<typeof listMaintenanceRequestsQuerySchema>;

export const assignWorkOrderSchema = z.object({
  maintenanceRequestId: z.string().uuid(),
  assigneeId: z.string().uuid(),
  dueDate: optionalField(z.coerce.date()),
  notes: optionalField(z.string().trim().max(2000)),
});
export type AssignWorkOrderInput = z.infer<typeof assignWorkOrderSchema>;

export const updateWorkOrderSchema = z
  .object({
    status: z.enum(WORK_ORDER_STATUSES).optional(),
    dueDate: z.coerce.date().nullable().optional(),
    notes: optionalField(z.string().trim().max(2000)),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one field to update',
  });
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;

export const listWorkOrdersQuerySchema = z.object({
  status: z.enum(WORK_ORDER_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
});
export type ListWorkOrdersQuery = z.infer<typeof listWorkOrdersQuerySchema>;

export const listTenantsQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  includeInactive: z
    .preprocess((value) => value === 'true' || value === true, z.boolean())
    .default(false),
});
export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>;

export const createApplicationSchema = z.object({
  unitId: z.string().uuid('Select a unit'),
  applicantName: z.string().trim().min(2).max(120),
  applicantEmail: emailSchema,
  applicantPhone: optionalField(z.string().trim().max(40)),
  monthlyIncomeCents: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  desiredMoveIn: optionalField(z.coerce.date()),
  notes: optionalField(z.string().trim().max(2000)),
});
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const updateApplicationSchema = z
  .object({
    status: z.enum(APPLICATION_STATUSES).optional(),
    notes: optionalField(z.string().trim().max(2000)),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one field to update',
  });
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;

export const listApplicationsQuerySchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
});
export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;

// ---- Messaging ----

const messageBodySchema = z.string().trim().min(1, 'Write a message').max(4000);

export const createConversationSchema = z.object({
  subject: z.string().trim().min(3, 'Add a short subject').max(160),
  body: messageBodySchema,
  participantId: optionalField(z.string().uuid('Select a resident')),
});
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const createMessageSchema = z.object({
  body: messageBodySchema,
});
export type CreateMessageInput = z.infer<typeof createMessageSchema>;

export const listConversationsQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
});
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;

// ---- Platform administration ----

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(2, 'Organization name is too short').max(120).optional(),
    subscriptionTier: z.enum(SUBSCRIPTION_TIERS).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one field to update',
  });
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const listOrganizationsQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
});
export type ListOrganizationsQuery = z.infer<typeof listOrganizationsQuerySchema>;

// ---- Settings ----

/** Optional free-text field that treats an empty input as "cleared" (null). */
const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max, `Must be ${max} characters or fewer`), z.null()])
    .transform((value) => (value && value.length ? value : null))
    .optional();

const optionalEmail = z
  .union([z.string().trim().toLowerCase(), z.null()])
  .transform((value) => (value && value.length ? value : null))
  .refine((value) => value === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value), {
    message: 'Enter a valid email address',
  })
  .optional();

export const updateOrganizationProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'Organization name is too short').max(120).optional(),
    contactEmail: optionalEmail,
    contactPhone: optionalText(40),
    addressLine1: optionalText(160),
    addressLine2: optionalText(160),
    city: optionalText(120),
    state: optionalText(120),
    postalCode: optionalText(20),
    websiteUrl: optionalText(200),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one field to update',
  });
export type UpdateOrganizationProfileInput = z.infer<typeof updateOrganizationProfileSchema>;

export const updateNotificationPreferencesSchema = z
  .object({
    notifyByEmail: z.boolean().optional(),
    notifyPayments: z.boolean().optional(),
    notifyMaintenance: z.boolean().optional(),
    notifyMessages: z.boolean().optional(),
    notifyAnnouncements: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one preference to update',
  });
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Name is too short').max(120),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
