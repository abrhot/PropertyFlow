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

| Method | Path                    | Auth   | Body / Notes |
| ------ | ----------------------- | ------ | ------------ |
| POST   | `/auth/register`        | public | `{ organizationName, fullName, email, password }` → creates org + `ORG_ADMIN`. Returns `{ accessToken, user }`, sets refresh cookie. |
| POST   | `/auth/login`           | public | `{ email, password }` → `{ accessToken, user }`, sets refresh cookie. |
| POST   | `/auth/refresh`         | public | Uses the httpOnly refresh cookie. Rotates the refresh token, returns a new `{ accessToken, user }`. |
| POST   | `/auth/logout`          | public | Revokes the refresh token and clears the cookie. |
| GET    | `/auth/me`              | bearer | Returns the current `AuthUser`. |
| POST   | `/auth/forgot-password` | public | `{ email }` → always `200`. In non-production the response includes `devToken` for testing. |
| POST   | `/auth/reset-password`  | public | `{ token, password }` → sets a new password, revokes existing sessions. |
| GET    | `/health`               | public | Service healthcheck. |

## Token model

- **Access token**: short-lived JWT (default 15m), sent as `Authorization: Bearer`.
  Payload: `{ sub, orgId, role, type: 'access' }`.
- **Refresh token**: long-lived JWT (default 7d) delivered as an **httpOnly**
  cookie (`pf_refresh_token`). The server stores only a SHA-256 hash and rotates
  it on every refresh; reusing a revoked token revokes the whole family.

## Conventions

- **Validation**: shared Zod schemas from `@propertyflow/validation` via
  `ZodValidationPipe`, so the client and server enforce identical rules.
- **AuthZ**: `@Roles(...)` + `RolesGuard` check the role; services MUST also scope
  every query by `organizationId` (multi-tenant isolation). `@Public()` opts a
  route out of authentication.
- **Passwords**: hashed with bcrypt (12 rounds).

## Planned modules

Organizations & portfolio, Properties/Units, Leases, Rent & payments (Stripe),
Maintenance work orders, Accounting/reporting, Messaging, Notifications.
