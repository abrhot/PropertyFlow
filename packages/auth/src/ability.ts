/**
 * The CASL ability model for PropertyFlow.
 *
 * Rules are *data* (see {@link AbilityRule}) so the exact same policy can be
 * stored in the database, enforced by the API, and mirrored in the UI. This
 * module only knows how to *type*, *scope*, and *build* an ability from that
 * data — it never hardcodes who-can-do-what. That declarative list lives in
 * `./rules` and, at runtime, in the `AbilityRule` database table.
 */

import {
  createMongoAbility,
  subject,
  type ForcedSubject,
  type MongoAbility,
  type RawRuleOf,
  type RuleOf,
} from '@casl/ability';
import { APP_SECTIONS, type AppSection, type UserRole } from '@propertyflow/constants';
import type { AbilityRule } from '@propertyflow/types';

export type AppAction =
  | 'manage'
  | 'access'
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'assign'
  | 'pay';

export type DomainSubject =
  | 'Organization'
  | 'Subscription'
  | 'User'
  | 'Invitation'
  | 'Property'
  | 'Lease'
  | 'Application'
  | 'Payment'
  | 'MaintenanceRequest'
  | 'WorkOrder'
  | 'Report'
  | 'Message';

export type PolicySubject = AppSection | DomainSubject | 'all';

/** Attributes a rule's `conditions` can match against on a concrete resource. */
export interface ResourceAttributes {
  id?: string;
  organizationId?: string | null;
  ownerId?: string;
  tenantId?: string;
  assigneeId?: string;
  participantIds?: string[];
  [attribute: string]: unknown;
}

export type ResourceSubject = {
  [Subject in DomainSubject]: ForcedSubject<Subject> & ResourceAttributes;
}[DomainSubject];

export type AppSubject = PolicySubject | ResourceSubject;
export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

/** A single rule of an {@link AppAbility}, as returned by `ability.rulesFor`. */
export type AppRule = RuleOf<AppAbility>;

/** Minimum identity needed to scope rules to a specific user. */
export interface AbilityUser {
  id: string;
  organizationId: string | null;
  role: UserRole;
}

/**
 * Interpolation tokens allowed inside a stored rule's `conditions`. They are
 * replaced with the current user's values when the rule is loaded, so a single
 * stored rule scopes correctly to whoever is asking.
 */
export const RULE_PLACEHOLDERS = {
  /** Replaced with the current user's id. */
  USER_ID: '{{userId}}',
  /** Replaced with the current user's organization id. */
  ORGANIZATION_ID: '{{organizationId}}',
} as const;

/** Tags plain API/Prisma data with a CASL subject type for instance-level checks. */
export function resource(
  subjectType: DomainSubject,
  attributes: ResourceAttributes,
): ResourceSubject {
  return subject(subjectType, attributes) as ResourceSubject;
}

/**
 * Resolves the placeholder tokens in a set of rules against a concrete user.
 *
 * A rule whose scope cannot be resolved — e.g. it needs an organization id but
 * the user has none — is dropped, so authorization always fails closed instead
 * of leaking data through an unscoped condition.
 */
export function interpolateRules(
  rules: readonly AbilityRule[],
  user: AbilityUser,
): AbilityRule[] {
  const tokens: Record<string, string | null> = {
    [RULE_PLACEHOLDERS.USER_ID]: user.id,
    [RULE_PLACEHOLDERS.ORGANIZATION_ID]: user.organizationId,
  };

  const resolved: AbilityRule[] = [];
  for (const rule of rules) {
    if (!rule.conditions) {
      resolved.push(rule);
      continue;
    }

    const conditions = resolveConditions(rule.conditions, tokens);
    if (!conditions) continue; // unresolved scope → drop the rule
    resolved.push({ ...rule, conditions });
  }
  return resolved;
}

function resolveConditions(
  conditions: Record<string, unknown>,
  tokens: Record<string, string | null>,
): Record<string, unknown> | null {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(conditions)) {
    if (typeof value === 'string' && value in tokens) {
      const resolved = tokens[value];
      if (resolved == null) return null;
      result[key] = resolved;
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Builds a CASL ability from already-scoped rules (tokens resolved).
 *
 * Both the API and the web app call this with the same rules, so a client's
 * `can(...)` checks match what the API will enforce.
 */
export function buildAbility(rules: readonly AbilityRule[]): AppAbility {
  return createMongoAbility<AppAbility>(rules as RawRuleOf<AppAbility>[]);
}

/** Convenience: scope a role's rules to a user and build their ability in one step. */
export function buildAbilityForUser(
  rules: readonly AbilityRule[],
  user: AbilityUser,
): AppAbility {
  return buildAbility(interpolateRules(rules, user));
}

/**
 * Returns navigable sections in the product-defined order.
 *
 * Navigation is driven by *explicit* `access <section>` grants only. We
 * deliberately do **not** use `ability.can('access', section)` here: a
 * wildcard rule like `manage all` (held by the platform admin) satisfies
 * `can('access', <anything>)` and would light up every section — including
 * org-scoped pages the platform admin can't meaningfully use. Reading the
 * granted rules directly keeps each role's sidebar scoped to what it owns.
 */
export function accessibleSectionsFor(ability: AppAbility): AppSection[] {
  const granted = new Set<string>();

  for (const rule of ability.rules) {
    if (rule.inverted) continue;
    const actions = Array.isArray(rule.action) ? rule.action : [rule.action];
    if (!actions.includes('access')) continue;
    const subjects = Array.isArray(rule.subject) ? rule.subject : [rule.subject];
    for (const subjectName of subjects) {
      if (subjectName) granted.add(String(subjectName));
    }
  }

  return APP_SECTIONS.filter((section) => granted.has(section));
}
