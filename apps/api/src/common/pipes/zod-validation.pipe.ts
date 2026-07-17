import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/**
 * Validates and parses request payloads with a Zod schema (shared from
 * @propertyflow/validation), so the API and clients enforce identical rules.
 *
 * Usage: `@Body(new ZodValidationPipe(loginSchema)) dto: LoginInput`
 */
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    return result.data;
  }
}
