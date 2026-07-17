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

## Multi-tenant isolation

Every tenant-owned entity carries an `organizationId`. Authorization is scoped by
**both role and organization**. Enforce scoping in every query; for defense in
depth, consider PostgreSQL Row-Level Security as the model grows (see PRD §10).

## Planned tables (later phases)

Property, Unit, Lease, RentSchedule, Payment, MaintenanceRequest, Document,
Message, Notification, OwnerStatement — plus the SaaS billing/subscription layer.

## Keeping enums in sync

Prisma enums (`UserRole`, `SubscriptionTier`) mirror `packages/constants`. Update
both together so the API and clients agree.
