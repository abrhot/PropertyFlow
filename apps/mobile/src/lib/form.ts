import type { ZodError, ZodType } from 'zod';

export type FieldErrors = Record<string, string>;

/** Flattens a ZodError into a `{ field: firstMessage }` map for inline display. */
export function fieldErrorsFrom(error: ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/**
 * Validates form state against a schema, returning either parsed data or the
 * per-field errors the screen renders under each input.
 */
export function validate<TSchema extends ZodType>(
  schema: TSchema,
  value: unknown,
): { ok: true; data: TSchema['_output'] } | { ok: false; errors: FieldErrors } {
  const result = schema.safeParse(value);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, errors: fieldErrorsFrom(result.error) };
}

/** `yyyy-mm-dd` for date inputs; empty string when there is no date. */
export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

/** Whole-currency string for a cents amount, e.g. 185000 -> "1850". */
export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return '';
  return String(cents / 100);
}
