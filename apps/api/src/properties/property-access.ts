import { ForbiddenException } from '@nestjs/common';
import { resource, type AppAbility, type AppAction, type AppRule } from '@propertyflow/auth';
import type { Prisma } from '@propertyflow/database';

/** The Property attributes that CASL rules in `@propertyflow/auth` condition on. */
export interface PropertyIdentity {
  id: string;
  organizationId: string;
  ownerId: string | null;
}

/**
 * Narrows a Prisma query to the rows the caller's CASL rules allow, so the
 * database does the filtering instead of loading a whole organization.
 *
 * This is an optimization, not the security boundary: every row is still run
 * through `ability.can` before it leaves the service, which keeps the result
 * correct even for rule shapes this translation cannot express (inverted rules,
 * or operators beyond plain equality).
 *
 * Returns `null` when no rule grants the action, meaning "match nothing".
 */
export function propertyScopeFor(
  ability: AppAbility,
  action: AppAction,
): Prisma.PropertyWhereInput | null {
  const rules: AppRule[] = ability.rulesFor(action, 'Property');
  const granting = rules.filter((rule) => !rule.inverted);

  if (!granting.length) return null;
  if (granting.some((rule) => !rule.conditions)) return {};

  return {
    OR: granting.map((rule) => rule.conditions as unknown as Prisma.PropertyWhereInput),
  };
}

/** True when the caller may perform `action` on this specific property. */
export function canAccessProperty(
  ability: AppAbility,
  action: AppAction,
  property: PropertyIdentity,
): boolean {
  return ability.can(
    action,
    resource('Property', {
      id: property.id,
      organizationId: property.organizationId,
      ownerId: property.ownerId ?? undefined,
    }),
  );
}

/** Throws unless the caller may perform `action` on this specific property. */
export function assertCanAccessProperty(
  ability: AppAbility,
  action: AppAction,
  property: PropertyIdentity,
): void {
  if (!canAccessProperty(ability, action, property)) {
    throw new ForbiddenException(`Not permitted to ${action} this property`);
  }
}
