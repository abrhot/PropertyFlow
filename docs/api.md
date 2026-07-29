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

Leases, Rent & payments (Stripe), Maintenance work orders,
Accounting/reporting, Messaging, Notifications.
