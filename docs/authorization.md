# Authorization and roles

PropertyFlow uses **CASL** for role-based and attribute-based access control.
Authentication proves who the user is; CASL decides what that authenticated user
may do. The API is always the security boundary. Client-side checks only improve
the user experience.

Permissions are **data, not code**. Every rule is a plain
[`AbilityRule`](../packages/types/src/index.ts) (a CASL "RawRule": `action`,
`subject`, `fields`, `conditions`, `inverted`, `reason`) stored in the
`AbilityRule` database table. The API and the web app both build their CASL
ability from these rows, so they evaluate exactly the same policy.

## Where rules live

- **Source of truth (declarative):** `DEFAULT_ABILITY_RULES` in
  [`packages/auth/src/rules.ts`](../packages/auth/src/rules.ts) reads like a
  table of one rule per line. To change what a role can do, edit this list.
- **Runtime store:** the API's `AbilityService`
  ([`apps/api/src/authorization/`](../apps/api/src/authorization/)) reconciles
  the `AbilityRule` table to that list on boot, then caches the rows in memory.
- **Per-user scope:** conditions use interpolation tokens — `{{userId}}` and
  `{{organizationId}}` — that resolve to the caller before a rule is applied. A
  rule whose scope can't be resolved is dropped, so authorization fails closed.
- **Shared with clients:** `POST /auth/login`, `/auth/refresh`, and
  `GET /auth/me` return the caller's already-scoped rules. The web
  `AbilityProvider` feeds them straight into `buildAbility`.

## Account and role assignment

Public registration creates a new organization and its first `ORG_ADMIN`.
Public users cannot choose a role, and roles are never inferred from email
addresses.

Additional accounts use secure invitations:

1. An `ORG_ADMIN` creates an invitation and selects a role.
2. The API stores the role with a SHA-256 hash of a random, single-use token.
3. The invitee sees the assigned organization and role before accepting.
4. Acceptance creates the user using the role and organization from the database
   record—not from browser input.
5. `SUPER_ADMIN` cannot be invited. It is provisioned operationally.

## Roles

- `SUPER_ADMIN`: platform organizations, subscriptions, analytics, and platform settings.
- `ORG_ADMIN`: organization staff, properties, leases, payments, maintenance, and settings.
- `PROPERTY_MANAGER`: assigned properties, leases, applications, maintenance, and reports.
- `LEASING_AGENT`: applications, tenant screening, listings, and lease creation.
- `ACCOUNTANT`: payments, ledgers, reconciliation, statements, and reports.
- `MAINTENANCE`: assigned work orders and their progress.
- `OWNER`: read-only performance and financial access for owned properties.
- `TENANT`: own lease, payments, maintenance requests, and messages.

The per-role rules that grant these capabilities live in
`DEFAULT_ABILITY_RULES` (`packages/auth/src/rules.ts`).

## Protecting an API route

Use `@CheckAbility` for an early action/subject check:

```ts
@Post()
@CheckAbility({ action: 'create', subject: 'Invitation' })
create(@CurrentUser() user: RequestUser, @Body() input: CreateInvitationInput) {
  return this.invitations.create(user, input);
}
```

The global `AbilitiesGuard` builds the ability from the authenticated request
user. Unknown actions and subjects are denied by default.

## Checking a loaded resource

A controller check answers “may this user update some Property?” Services must
also check the actual loaded record to enforce organization, owner, tenant, and
assignment conditions:

```ts
const ability = this.abilities.abilityForUser(user); // injected AbilityService
const propertySubject = resource('Property', property);

if (!ability.can('update', propertySubject)) {
  throw new ForbiddenException('You cannot update this property');
}
```

Database queries must still include `organizationId`. CASL is defense in depth,
not a replacement for tenant-scoped queries.

## Filtering a list by the caller's rules

Listing endpoints must not load a whole organization and filter afterwards.
`apps/api/src/properties/property-access.ts` shows the pattern: read the
caller's own CASL rules for the subject and turn them into a Prisma filter, so
the query and the permission check cannot drift apart.

```ts
const scope = propertyScopeFor(ability, 'read'); // null means "match nothing"
const records = await this.db.property.findMany({ where: { AND: [scope, ...filters] } });
const visible = records.filter((record) => canAccessProperty(ability, 'read', record));
```

The translation is only an optimization. Every row still goes through
`ability.can` before it leaves the service, which keeps the result correct even
for rule shapes the translation cannot express, such as inverted rules. This is
what limits an `OWNER` to properties whose `ownerId` matches them.

Properties are the reference implementation of this pattern: see
`apps/api/src/properties/` for a full module, and `docs/api.md` for its routes.

## Protecting a web page

Use the same shared ability for navigation and page-level UX:

```tsx
<RequireAbility action="manage" subject="Invitation">
  <TeamSettingsPage />
</RequireAbility>
```

For individual controls:

```tsx
const ability = useAbility();

return ability.can('create', 'Invitation') ? <InviteButton /> : null;
```

Never rely on a hidden button or client redirect for security. The matching API
endpoint must enforce the same permission.

## Adding a new feature

1. Add its subject to `DomainSubject` (`packages/auth/src/ability.ts`).
2. Add role rules to `DEFAULT_ABILITY_RULES` (`packages/auth/src/rules.ts`) and
   restart the API so it reconciles them into the `AbilityRule` table.
3. Add `@CheckAbility` to controller routes.
4. Scope database queries by organization and check loaded resources with
   `resource(...)` plus the injected `AbilityService`.
5. Reuse `useAbility` or `RequireAbility` in the web app.
6. Test both an allowed case and a cross-organization/ownership denial.
