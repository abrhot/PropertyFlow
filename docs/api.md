# API

The backend is a **NestJS** REST API in `apps/api`, served under the `/api`
global prefix. Every route requires a valid JWT access token unless marked
`@Public()`.

## Run it

```bash
docker compose up -d           # Postgres + Redis
pnpm --filter @propertyflow/api dev
```

Default: `http://localhost:3001/api`.

## Auth endpoints

| Method | Path                    | Auth   | Body / Notes                                                                                                                         |
| ------ | ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/auth/register`        | public | `{ organizationName, fullName, email, password }` → creates org + `ORG_ADMIN`. Returns `{ accessToken, user }`, sets refresh cookie. |
| POST   | `/auth/login`           | public | `{ email, password }` → `{ accessToken, user }`, sets refresh cookie.                                                                |
| POST   | `/auth/refresh`         | public | Uses the httpOnly refresh cookie. Rotates the refresh token, returns a new `{ accessToken, user }`.                                  |
| POST   | `/auth/logout`          | public | Revokes the refresh token and clears the cookie.                                                                                     |
| GET    | `/auth/me`              | bearer | Returns the current `AuthUser`.                                                                                                      |
| POST   | `/auth/forgot-password` | public | `{ email }` → always `200`. In non-production the response includes `devToken` for testing.                                          |
| POST   | `/auth/reset-password`  | public | `{ token, password }` → sets a new password, revokes existing sessions.                                                              |
| GET    | `/health`               | public | Service healthcheck.                                                                                                                 |

## Invitation endpoints

| Method | Path                   | Auth                      | Body / Notes                                                               |
| ------ | ---------------------- | ------------------------- | -------------------------------------------------------------------------- |
| GET    | `/invitations`         | organization admin + CASL | Lists the current organization's invitations.                              |
| POST   | `/invitations`         | organization admin + CASL | `{ email, role }`. Role must be an invitable non-platform role.            |
| DELETE | `/invitations/:id`     | organization admin + CASL | Revokes a pending invitation in the current organization.                  |
| POST   | `/invitations/preview` | public                    | `{ token }` → assigned email, organization, role, and expiry.              |
| POST   | `/invitations/accept`  | public                    | `{ token, fullName, password }` → creates the invited account and session. |

Invitation tokens are random, single-use, expire after seven days, and are
stored only as SHA-256 hashes. The acceptance payload never contains a role or
organization identifier.

## Property endpoints

| Method | Path                            | Auth                   | Body / Notes                                                              |
| ------ | ------------------------------- | ---------------------- | ------------------------------------------------------------------------- |
| GET    | `/properties`                   | `read Property`        | Query: `search`, `type`, `includeInactive`. Returns `{ properties, summary }`. |
| GET    | `/properties/owners`            | `update Property`      | Owners in the caller's organization who can be assigned a property.       |
| GET    | `/properties/:id`               | `read Property`        | Returns the property with its units.                                      |
| POST   | `/properties`                   | `create Property`      | Address, type, optional `ownerId`, `yearBuilt`, `notes`.                  |
| PATCH  | `/properties/:id`               | `update Property`      | Partial update; `ownerId` must be an owner in the same organization.      |
| DELETE | `/properties/:id`               | `delete Property`      | Cascades to the property's units.                                         |
| POST   | `/properties/:id/units`         | `update Property`      | `{ label, bedrooms, bathrooms, squareFeet?, marketRentCents, status }`.   |
| PATCH  | `/properties/:id/units/:unitId` | `update Property`      | Partial update of a unit.                                                 |
| DELETE | `/properties/:id/units/:unitId` | `update Property`      | Removes a unit from the property.                                         |

Rent is transmitted in **cents** (`marketRentCents`) so arithmetic stays exact;
the web form converts at the edge. Units are only addressable through their
parent property and inherit its permissions. A property outside the caller's
scope returns `404` rather than `403`, so ids cannot be probed for existence.

## Lease endpoints

| Method | Path              | Auth              | Body / Notes                                                              |
| ------ | ----------------- | ----------------- | ------------------------------------------------------------------------ |
| GET    | `/leases`         | `read Lease`      | Query: `status`, `unitId`, `tenantId`, `search`. Returns `{ leases, summary }`. |
| GET    | `/leases/options` | `create Lease`    | Units and active tenants in the caller's organization, for the form.     |
| GET    | `/leases/:id`     | `read Lease`      | Returns the lease with tenant and unit/property summaries.               |
| POST   | `/leases`         | `create Lease`    | `{ unitId, tenantId, status?, startDate, endDate, rentCents, depositCents?, notes? }`. |
| PATCH  | `/leases/:id`     | `update Lease`    | Partial update; `unitId` is immutable.                                    |
| DELETE | `/leases/:id`     | `delete Lease`    | Only roles with `delete Lease` (org admin, property manager).            |

Rent and deposit are in **cents**; dates are ISO strings. Business rules: a unit
may hold only one `ACTIVE` lease at a time; activating a lease marks its unit
`OCCUPIED` and ending one (`EXPIRED`/`TERMINATED`) frees it back to `VACANT`;
the tenant must be an active `TENANT` in the same organization. Owner scoping
works through the unit's property owner. A lease outside the caller's scope
returns `404` rather than `403`.

## Payment endpoints

| Method | Path                | Auth             | Body / Notes |
| ------ | ------------------- | ---------------- | ------------ |
| GET    | `/payments`         | `read Payment`   | Query: `status`, `leaseId`, `tenantId`, `search`. Returns `{ payments, summary }`. |
| GET    | `/payments/options` | `create Payment` | Active leases in the caller's organization, for recording ledger entries. |
| POST   | `/payments`         | `create Payment` | Creates a charge or offline payment in integer cents. |
| PATCH  | `/payments/:id`     | `update Payment` | Updates status, amount, due date, method, or reference. |
| POST   | `/payments/:id/pay` | `pay Payment`    | Tenant-scoped provider boundary; currently settles through the demo ACH adapter. |

Payment queries are organization-, tenant-, and owner-scoped through CASL. The
`pay` route is intentionally provider-independent so Stripe can replace the demo
adapter without changing the frontend contract.

## Maintenance endpoints

| Method | Path                         | Auth                       | Body / Notes |
| ------ | ---------------------------- | -------------------------- | ------------ |
| GET    | `/maintenance-requests`      | `read MaintenanceRequest`  | Query: `status`, `priority`, `search`. Tenant sees own; staff see the org queue. |
| GET    | `/maintenance-requests/options` | `create MaintenanceRequest` | Leases/units and assignable technicians for the forms. |
| POST   | `/maintenance-requests`      | `create MaintenanceRequest`| Tenant or staff submits a request against a lease/unit. |
| PATCH  | `/maintenance-requests/:id`  | `update MaintenanceRequest`| Update title, description, priority, or status. |
| GET    | `/work-orders`               | `read WorkOrder`           | Query: `status`, `search`. Technician sees jobs assigned to them. |
| POST   | `/work-orders`               | `assign WorkOrder`         | Assigns a request to a technician, creating the work order. |
| PATCH  | `/work-orders/:id`           | `update WorkOrder`         | Technician updates status, due date, or notes. |

## Tenant & application endpoints

| Method | Path                    | Auth                | Body / Notes |
| ------ | ----------------------- | ------------------- | ------------ |
| GET    | `/tenants`              | `read User`         | Query: `search`, `includeInactive`. Directory of residents with active-lease placement. |
| GET    | `/applications`         | `read Application`   | Query: `status`, `search`. Returns `{ applications, summary }`. |
| GET    | `/applications/options` | `create Application` | Vacant units the applicant can be placed against. |
| POST   | `/applications`         | `create Application` | Records a rental application for a unit. |
| PATCH  | `/applications/:id`     | `update Application` | Advances status (screening → approved/denied) or edits notes. |

## Reports endpoint

| Method | Path                 | Auth          | Body / Notes |
| ------ | -------------------- | ------------- | ------------ |
| GET    | `/reports/dashboard` | `read Report` | Owner/org-scoped aggregates: collected vs. outstanding cash flow, occupancy by property, and saved reports. |

## Messaging endpoints

| Method | Path                          | Auth             | Body / Notes |
| ------ | ----------------------------- | ---------------- | ------------ |
| GET    | `/conversations`              | `read Message`   | Query: `search`. Staff see every org conversation; tenants only ones they participate in. |
| GET    | `/conversations/options`      | `read Message`   | For staff: residents they can start a thread with. Empty for tenants. |
| GET    | `/conversations/:id`          | `read Message`   | A conversation with its messages in chronological order. |
| POST   | `/conversations`              | `create Message` | Starts a thread (staff must pass `participantId`; tenants message management). |
| POST   | `/conversations/:id/messages` | `create Message` | Appends a reply and bumps the conversation's `lastMessageAt`. |

Conversations are org-scoped; `participantIds` denormalizes the tenant(s) on a
thread so a tenant's `participantIds`-scoped rule maps to a single-table query.

## Platform administration (SUPER_ADMIN)

The platform-level billing and organizations management module was removed in a
recent refactor. The `SUPER_ADMIN` role is still defined in the authorization
model and will be reintroduced when the SaaS subscription layer (Phase 7) is
implemented.

Until then, platform administration is performed directly against the database
or via future admin tooling.

## Token model

- **Access token**: short-lived JWT (default 15m), sent as `Authorization: Bearer`.
  Payload: `{ sub, orgId, role, type: 'access' }`.
- **Refresh token**: long-lived JWT (default 7d) delivered as an **httpOnly**
  cookie (`pf_refresh_token`). The server stores only a SHA-256 hash and rotates
  it on every refresh; reusing a revoked token revokes the whole family.

## Conventions

- **Validation**: shared Zod schemas from `@propertyflow/validation` via
  `ZodValidationPipe`, so the client and server enforce identical rules.
- **AuthZ**: `@CheckAbility(...)` + the global CASL `AbilitiesGuard` enforce
  action/subject policies. Services MUST also scope every query by
  `organizationId` and check loaded resources. `@Public()` opts a route out of
  authentication.
- **Passwords**: hashed with bcrypt (12 rounds).

## Planned modules

Stripe processing and rent schedules (the `pay Payment` boundary is ready),
notifications/email delivery, and the cutting-edge pillars in
[roadmap.md](./roadmap.md) (immersive media, AI workflows, live analytics,
concierge hub).
