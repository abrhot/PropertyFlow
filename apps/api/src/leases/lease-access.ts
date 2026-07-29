import { ForbiddenException } from '@nestjs/common';
import { resource, type AppAbility, type AppAction, type AppRule } from '@propertyflow/auth';
import type { Prisma } from '@propertyflow/database';

/** The Lease attributes that CASL rules in `@propertyflow/auth` condition on. */
export interface LeaseIdentity {
  id: string;
  organizationId: string;
  tenantId: string;
  /** Owner of the leased unit's property; drives the OWNER role's scope. */
  ownerId: string | null;
}

/**
 * Translates one CASL rule's conditions into a Prisma filter.
 *
 * `organizationId`, `tenantId`, and `id` are columns on Lease, but `ownerId`
 * lives on the related property, so it maps to a nested relation filter.
 */
function ruleToWhere(conditions: Record<string, unknown>): Prisma.LeaseWhereInput {
  const where: Prisma.LeaseWhereInput = {};

  for (const [key, value] of Object.entries(conditions)) {
    if (key === 'ownerId') {
      where.unit = { property: { ownerId: value as string } };
    } else {
      (where as Record<string, unknown>)[key] = value;
    }
  }

  return where;
}

/**
 * Narrows a lease query to the rows the caller's CASL rules allow.
 *
 * Like the property equivalent this is an optimization, not the security
 * boundary: every row is still checked with `ability.can` before it leaves the
 * service. Returns `null` when no rule grants the action ("match nothing").
 */
export function leaseScopeFor(
  ability: AppAbility,
  action: AppAction,
): Prisma.LeaseWhereInput | null {
  const rules: AppRule[] = ability.rulesFor(action, 'Lease');
  const granting = rules.filter((rule) => !rule.inverted);

  if (!granting.length) return null;
  if (granting.some((rule) => !rule.conditions)) return {};

  return {
    OR: granting.map((rule) => ruleToWhere(rule.conditions as Record<string, unknown>)),
  };
}

/** True when the caller may perform `action` on this specific lease. */
export function canAccessLease(
  ability: AppAbility,
  action: AppAction,
  lease: LeaseIdentity,
): boolean {
  return ability.can(
    action,
    resource('Lease', {
      id: lease.id,
      organizationId: lease.organizationId,
      tenantId: lease.tenantId,
      ownerId: lease.ownerId ?? undefined,
    }),
  );
}

/** Throws unless the caller may perform `action` on this specific lease. */
export function assertCanAccessLease(
  ability: AppAbility,
  action: AppAction,
  lease: LeaseIdentity,
): void {
  if (!canAccessLease(ability, action, lease)) {
    throw new ForbiddenException(`Not permitted to ${action} this lease`);
  }
}
