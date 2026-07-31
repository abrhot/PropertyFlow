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
- **AbilityRule** — one CASL authorization rule per row (`action`, `subject`,
  `fields`, `conditions`, `inverted`, `reason`), keyed by `role` with a
  `sortOrder`. The API reconciles this table to the declarative defaults in
  `@propertyflow/auth` on boot; see [authorization.md](./authorization.md).

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

## Phase 2 tables (leases)

- **Lease** — a rental agreement between a tenant and the organization for one
  unit: `LeaseStatus`, term dates, and `rentCents`/`depositCents` (integers).
  `organizationId` is denormalized from the unit's property so tenant/owner
  scoping and list queries stay a single-table lookup. A unit may hold only one
  ACTIVE lease at a time, and lease activation keeps the unit's occupancy in step.

## Phase 3 tables (payments)

- **Payment** — a rent charge or settlement tied to a lease, with integer
  `amountCents`, due/paid dates, method, reference, and `PaymentStatus`.
  Organization, tenant, and owner ids are denormalized for efficient CASL-scoped
  ledger queries. Stripe processing will attach to this provider-independent record.

## Phase 3 tables (operations)

- **MaintenanceRequest** — a tenant-submitted issue against a unit/lease with
  `MaintenancePriority` and `MaintenanceRequestStatus`. Tenant, owner, and
  assignee ids are denormalized for CASL-scoped queries.
- **WorkOrder** — the assigned, trackable job for a request (`WorkOrderStatus`,
  due/started/completed dates, a unique `referenceCode`). One per request.
- **Application** — a rental application for a vacant unit with `ApplicationStatus`
  and applicant/contact/income fields.

## Phase 4 tables (messaging)

- **Conversation** — a thread between a tenant and their management company.
  `participantIds` denormalizes the tenant user ids on the thread so a tenant's
  `participantIds`-scoped CASL rule becomes a single-table query; staff are
  scoped org-wide. `lastMessageAt` drives ordering.
- **Message** — one message in a Conversation (`senderId`, `body`), with a
  denormalized `organizationId` for scoped queries.

## Planned tables (later phases)

RentSchedule, PayoutAccount, Document, Notification, OwnerStatement — plus the
SaaS billing/subscription layer (currently derived from `Organization.subscriptionTier`).

## Seed data

`pnpm --filter @propertyflow/database db:seed` creates a demo organization with
one user per role and a three-property portfolio. Two properties are assigned to
`owner@demo.test` and one deliberately is not, which makes owner scoping visible.
It also seeds leases, a rent ledger, maintenance requests/work orders,
applications, a tenant↔management conversation, and several additional
management companies (varied plans) so the SUPER_ADMIN organizations and billing
views have realistic data.

## Keeping enums in sync

Prisma enums (`UserRole`, `SubscriptionTier`, `PropertyType`, `UnitStatus`,
`LeaseStatus`, `PaymentStatus`) mirror `packages/constants`. Update both together so the API and
clients agree.
