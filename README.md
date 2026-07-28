# PropertyFlow — SaaS Property Management Platform

A multi-tenant monorepo for PropertyFlow: a platform that helps property
management companies, landlords, and owners manage their portfolios end-to-end —
listings, tenant applications, leases, rent collection, maintenance, and
financial reporting.

> See [`docs/requirements.md`](docs/requirements.md) for the product spec and
> [`docs/architecture.md`](docs/architecture.md) for how it's built.

## Tech stack

Next.js · NestJS · React Native (Expo, planned) · PostgreSQL + Prisma · Redis ·
Turborepo · pnpm · TypeScript · Zod · Tailwind CSS + shadcn/ui · TanStack Query

## Structure

```
apps/
  web/        Next.js admin/tenant/owner web app (Tailwind + shadcn/ui)
  api/        NestJS backend (auth, multi-tenant, RBAC)
  mobile/     React Native (Expo) placeholder
packages/
  ui · types · auth · database · config · utils · validation · constants · api-client
docs/         requirements · architecture · database · api
```

## Prerequisites

- Node.js **v20+**
- pnpm (`npm install -g pnpm`)
- Docker Desktop (for local Postgres + Redis)

## Getting started

```bash
pnpm install

# 1. Start Postgres + Redis
docker compose up -d

# 2. Configure env (copy the examples)
cp apps/api/.env.example apps/api/.env
cp packages/database/.env.example packages/database/.env
cp apps/web/.env.example apps/web/.env.local   # optional (defaults are fine)

# 3. Create the database schema
pnpm --filter @propertyflow/database db:generate
pnpm --filter @propertyflow/database db:migrate

# 4. Run everything (web + api)
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001/api (health: `/api/health`)

> Note: the Docker Postgres is published on host port **5433** (5432 is often
> taken by a local Postgres install). The example env files already point there.

## Authentication (Phase 1 — implemented)

Full auth is built and tested end-to-end:

- **Register** a management company (creates the Organization + first `ORG_ADMIN`)
- **Login / logout** with JWT **access tokens** (in-memory) + **refresh tokens**
  (rotated, httpOnly cookie, reuse-detection)
- **Refresh** and **/me**
- **Forgot / reset password** (hashed, single-use, expiring tokens)
- **Secure role invitations** with hashed, single-use tokens
- **CASL authorization** via `@CheckAbility(...)`, scoped by organization and resource attributes
- Passwords hashed with bcrypt; request bodies validated with shared **Zod** schemas

Web UI (shadcn/ui): `/login`, `/register`, `/forgot-password`, `/reset-password`,
and a protected `/dashboard`.

See [`docs/api.md`](docs/api.md) for endpoints.
See [`docs/authorization.md`](docs/authorization.md) for roles and CASL usage.

## Common scripts

```bash
pnpm dev         # run all apps (Turborepo)
pnpm build       # build everything
pnpm typecheck   # type-check everything
pnpm lint        # lint everything
```

## Contributing

Commits follow **Conventional Commits** — see [`CONTRIBUTING.md`](CONTRIBUTING.md).
