import { ForbiddenException } from '@nestjs/common';
import { resource, type AppAbility, type AppAction, type AppRule } from '@propertyflow/auth';
import type { Prisma } from '@propertyflow/database';

export interface PaymentIdentity {
  id: string;
  organizationId: string;
  tenantId: string;
  ownerId: string | null;
}

function ruleToWhere(conditions: Record<string, unknown>): Prisma.PaymentWhereInput {
  return { ...conditions } as Prisma.PaymentWhereInput;
}

export function paymentScopeFor(
  ability: AppAbility,
  action: AppAction,
): Prisma.PaymentWhereInput | null {
  const rules: AppRule[] = ability.rulesFor(action, 'Payment');
  const granting = rules.filter((rule) => !rule.inverted);
  if (!granting.length) return null;
  if (granting.some((rule) => !rule.conditions)) return {};
  return {
    OR: granting.map((rule) => ruleToWhere(rule.conditions as Record<string, unknown>)),
  };
}

export function canAccessPayment(
  ability: AppAbility,
  action: AppAction,
  payment: PaymentIdentity,
): boolean {
  return ability.can(
    action,
    resource('Payment', {
      id: payment.id,
      organizationId: payment.organizationId,
      tenantId: payment.tenantId,
      ownerId: payment.ownerId ?? undefined,
    }),
  );
}

export function assertCanAccessPayment(
  ability: AppAbility,
  action: AppAction,
  payment: PaymentIdentity,
): void {
  if (!canAccessPayment(ability, action, payment)) {
    throw new ForbiddenException(`Not permitted to ${action} this payment`);
  }
}
