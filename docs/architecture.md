# Architecture

PropertyFlow is a **pnpm + Turborepo monorepo**. Web, mobile, and backend share
types, validation, and business logic so all clients stay in sync, while each app
still deploys independently.

## Layout

```
propertyflow/
├── apps/
│   ├── web/        # Next.js (App Router) + Tailwind + shadcn/ui + TanStack Query
│   ├── mobile/     # React Native (Expo) + Expo Router + native components
│   └── api/        # NestJS backend (REST) + Socket.IO realtime gateway
├── packages/
│   ├── ui/         # Shared React primitives
│   ├── types/      # Shared TypeScript types & API contracts (DTOs)
│   ├── api-client/ # Typed SDK for calling the backend (web + mobile)
│   ├── auth/       # Token shapes + RBAC helpers (framework-agnostic)
│   ├── database/   # Prisma schema & client singleton
│   ├── validation/ # Zod schemas (shared client + server)
│   ├── constants/  # Roles, statuses, enums
│   ├── config/     # Shared tsconfig / prettier
│   └── utils/      # Common helpers
├── docs/
└── docker-compose.yml   # Postgres + Redis for local dev
```

## Compiled internal packages

Shared packages compile to `dist/` (`tsc`) and expose `main`/`types` there. This
is required so the NestJS API (compiled + run with `node`) can import them at
runtime, and it gives clean, portable types to every consumer. Turborepo builds
packages before apps via `dependsOn: ["^build"]`.

## Auth architecture

- **Access token** (short-lived JWT) is held in memory by the web client.
- **Refresh token** (long-lived JWT) lives in an **httpOnly cookie**; the server
  stores only a hash and rotates it on refresh (with reuse detection).
- `@propertyflow/api-client` transparently retries once via `/auth/refresh` on a
  `401`, so UI code rarely deals with token expiry.
- The API uses a **global JWT guard** (`@Public()` opts out) + a **RolesGuard**
  (`@Roles(...)`). Multi-tenant isolation is enforced by scoping queries on
  `organizationId`.

## Technology stack

- **Web:** Next.js + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query
- **Backend:** NestJS + PostgreSQL + Prisma + Socket.IO + (Redis for jobs, later)
- **Mobile:** React Native (Expo) + Expo Router — shares types/validation/api-client
- **Auth:** JWT access + refresh (rotation), bcrypt, RBAC scoped by organization
- **Payments (later):** Stripe · **Storage:** S3/Cloudinary · **Push:** FCM

## Dependency direction

Apps depend on packages, never the reverse. `constants` is the lowest-level
shared package; `config` provides the shared tsconfig to everything.

## Monorepo conventions (keep us aligned)

- **Cross-package imports go through the package name** (`@propertyflow/*`), never
  relative paths like `../../packages/...`.
- **Share aggressively:** types, validation, business logic, and constants live in
  `packages/*`; apps only compose UI, routing, and app-specific wiring.
- **Internal deps use the `workspace:*` protocol** and are built before dependents
  via Turborepo `dependsOn: ["^build"]`.
- **One version per shared tool** across the repo (TypeScript, Zod, React, etc.) —
  no per-package drift.
- **Shared config is centralized:** TS via `@propertyflow/config`, **ESLint** via the
  root `eslint.config.mjs` (one flat config for all workspaces), Prettier via the
  root `.prettierrc`.
- **Run tasks from the root:** `pnpm typecheck`, `pnpm lint`, `pnpm build`,
  `pnpm dev` (or `pnpm dev:apps` for just web + api).
- **One lockfile** (`pnpm-lock.yaml`) at the root; a single `docker-compose.yml`
  for local infra.
