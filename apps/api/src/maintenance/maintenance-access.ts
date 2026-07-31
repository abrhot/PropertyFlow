import { ForbiddenException } from '@nestjs/common';
import { resource, type AppAbility, type AppAction, type AppRule } from '@propertyflow/auth';

type Subject = 'MaintenanceRequest' | 'WorkOrder';

export interface MaintenanceIdentity {
  id: string;
  organizationId: string;
  tenantId: string;
  ownerId: string | null;
  assigneeId: string | null;
}

export function scopeFor(
  ability: AppAbility,
  action: AppAction,
  subject: Subject,
): Record<string, unknown> | null {
  const granting: AppRule[] = ability
    .rulesFor(action, subject)
    .filter((rule: AppRule) => !rule.inverted);
  if (!granting.length) return null;
  if (granting.some((rule) => !rule.conditions)) return {};
  return { OR: granting.map((rule) => rule.conditions as Record<string, unknown>) };
}

export function canAccess(
  ability: AppAbility,
  action: AppAction,
  subject: Subject,
  identity: MaintenanceIdentity,
): boolean {
  return ability.can(
    action,
    resource(subject, {
      ...identity,
      ownerId: identity.ownerId ?? undefined,
      assigneeId: identity.assigneeId ?? undefined,
    }),
  );
}

export function assertAccess(
  ability: AppAbility,
  action: AppAction,
  subject: Subject,
  identity: MaintenanceIdentity,
): void {
  if (!canAccess(ability, action, subject, identity)) {
    throw new ForbiddenException(`Not permitted to ${action} this ${subject.toLowerCase()}`);
  }
}
