import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import {
  DEFAULT_ABILITY_RULES,
  buildAbility,
  interpolateRules,
  type AbilityUser,
  type AppAbility,
} from '@propertyflow/auth';
import type { UserRole } from '@propertyflow/constants';
import { Prisma } from '@propertyflow/database';
import type { AbilityRule } from '@propertyflow/types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The API's single source of authorization at runtime.
 *
 * Rules live in the `AbilityRule` table (see the Prisma schema). On boot this
 * service reconciles that table to the declarative defaults in
 * `@propertyflow/auth`, then caches the rows in memory so building an ability
 * for a request never touches the database. Callers get either the raw,
 * user-scoped rules (to send to a client) or a ready-to-check {@link AppAbility}.
 */
@Injectable()
export class AbilityService implements OnModuleInit {
  private readonly logger = new Logger(AbilityService.name);
  private rulesByRole = new Map<UserRole, AbilityRule[]>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.syncFromDefaults();
    await this.reload();
  }

  /** The caller's rules with placeholders resolved — safe to send to a client. */
  rulesForUser(user: AbilityUser): AbilityRule[] {
    const roleRules = this.rulesByRole.get(user.role) ?? [];
    return interpolateRules(roleRules, user);
  }

  /** A CASL ability for the caller, used to authorize API requests. */
  abilityForUser(user: AbilityUser): AppAbility {
    return buildAbility(this.rulesForUser(user));
  }

  /** Loads the stored rules into the in-memory cache, grouped by role. */
  private async reload(): Promise<void> {
    const rows = await this.prisma.client.abilityRule.findMany({
      orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }],
    });

    const grouped = new Map<UserRole, AbilityRule[]>();
    for (const row of rows) {
      const role = row.role as UserRole;
      const list = grouped.get(role) ?? [];
      list.push(toAbilityRule(row));
      grouped.set(role, list);
    }
    this.rulesByRole = grouped;
  }

  /**
   * Reconciles the `AbilityRule` table with the declarative source of truth so
   * the stored policy always matches the shipped code. A future admin UI can
   * layer edits on top of these rows; for now the code stays authoritative.
   */
  private async syncFromDefaults(): Promise<void> {
    const rows = flattenDefaults();
    await this.prisma.client.$transaction([
      this.prisma.client.abilityRule.deleteMany(),
      this.prisma.client.abilityRule.createMany({ data: rows }),
    ]);
    this.logger.log(`Synced ${rows.length} ability rules to the database`);
  }
}

/** Maps a stored row to the wire/shared {@link AbilityRule} shape. */
function toAbilityRule(row: {
  action: Prisma.JsonValue;
  subject: Prisma.JsonValue | null;
  fields: string[];
  conditions: Prisma.JsonValue | null;
  inverted: boolean;
  reason: string | null;
}): AbilityRule {
  const rule: AbilityRule = { action: row.action as AbilityRule['action'] };
  if (row.subject != null) rule.subject = row.subject as AbilityRule['subject'];
  if (row.fields.length) rule.fields = row.fields;
  if (row.conditions != null) rule.conditions = row.conditions as Record<string, unknown>;
  if (row.inverted) rule.inverted = true;
  if (row.reason != null) rule.reason = row.reason;
  return rule;
}

/** Flattens the per-role defaults into insertable rows, preserving order. */
function flattenDefaults(): Prisma.AbilityRuleCreateManyInput[] {
  const rows: Prisma.AbilityRuleCreateManyInput[] = [];

  for (const [role, rules] of Object.entries(DEFAULT_ABILITY_RULES)) {
    rules.forEach((rule, index) => {
      const row: Prisma.AbilityRuleCreateManyInput = {
        role: role as UserRole,
        sortOrder: index,
        action: rule.action as Prisma.InputJsonValue,
        fields: rule.fields ?? [],
        inverted: rule.inverted ?? false,
      };
      if (rule.subject !== undefined) row.subject = rule.subject as Prisma.InputJsonValue;
      if (rule.conditions !== undefined) {
        row.conditions = rule.conditions as Prisma.InputJsonValue;
      }
      if (rule.reason !== undefined) row.reason = rule.reason;
      rows.push(row);
    });
  }

  return rows;
}
