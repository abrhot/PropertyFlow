# Database

PostgreSQL, accessed through **Prisma**. Schema:
`packages/database/prisma/schema.prisma`.

## Getting started

```bash
docker compose up -d                                   # start Postgres (host port 5433)
cp packages/database/.env.example packages/database/.env
pnpm --filter @propertyflow/database db:generate       # generate the typed client
pnpm --filter @propertyflow/database db:migrate        # create/apply migrations
pnpm --filter @propertyflow/database db:studio         # inspect data
```

## Phase 1 tables (auth & multi-tenancy)

- **Organization** — the SaaS tenant (a management company). Has `subscriptionTier`.
- **User** — belongs to an Organization (null for `SUPER_ADMIN`); has a `UserRole`
  and a bcrypt `passwordHash`. Email is globally unique.
- **RefreshToken** — server-side record of issued refresh tokens (SHA-256 hash,
  expiry, revocation) enabling rotation + reuse detection.
- **PasswordResetToken** — hashed, single-use, expiring reset tokens.
- **OrganizationInvitation** — organization-scoped role invitation with a
  hashed, single-use, expiring token and acceptance/revocation audit fields.

## Phase 2 tables (portfolio)

- **Property** — a building in an organization's portfolio: address, `PropertyType`,
  optional `yearBuilt`/`notes`, and a nullable `ownerId`. That `ownerId` is what
  scopes the `OWNER` role, so it is set to null (not cascaded) if the owner is removed.
- **Unit** — a rentable space inside a Property. Rent is stored as
  `marketRentCents` (an integer) so money arithmetic stays exact. Labels are
  unique per property, and units are scoped to an organization through their
  property rather than a duplicated `organizationId`.

## Multi-tenant isolation

Every tenant-owned entity carries an `organizationId`. Authorization is scoped by
**both role and organization**. Enforce scoping in every query; for defense in
depth, consider PostgreSQL Row-Level Security as the model grows (see PRD §10).

## Planned tables (later phases)

Lease, RentSchedule, Payment, MaintenanceRequest, Document, Message,
Notification, OwnerStatement — plus the SaaS billing/subscription layer.

## Seed data

`pnpm --filter @propertyflow/database db:seed` creates a demo organization with
one user per role and a three-property portfolio. Two properties are assigned to
`owner@demo.test` and one deliberately is not, which makes owner scoping visible.

## Keeping enums in sync

Prisma enums (`UserRole`, `SubscriptionTier`, `PropertyType`, `UnitStatus`)
mirror `packages/constants`. Update both together so the API and clients agree.
