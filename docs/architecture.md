# Architecture

FieldTrack is a **pnpm + Turborepo monorepo**. Everything (web, mobile, backend, and
shared code) lives in one repository so types, validation, and business rules stay in
sync and CI/CD stays simple.

## Layout

```
fieldtrack/
├── apps/
│   ├── web/        # Next.js admin portal (TypeScript, App Router)
│   ├── mobile/     # Flutter technician app (generated separately)
│   └── api/        # NestJS backend (REST)
├── packages/
│   ├── ui/         # Shared React components
│   ├── types/      # Shared TypeScript interfaces
│   ├── auth/       # Auth token shapes + RBAC helpers
│   ├── database/   # Prisma schema & client
│   ├── config/     # Shared tsconfig / prettier
│   ├── utils/      # Common helpers
│   ├── validation/ # Zod schemas (shared client + server)
│   └── constants/  # Roles, statuses, enums
└── docs/
```

## Internal packages ("just-in-time")

Shared packages export their **TypeScript source** directly (`main`/`exports` point at
`src/index.ts`) instead of a pre-built `dist/`. Consumers compile them as part of their
own build:

- The web app lists them under `transpilePackages` in `next.config.mjs`.
- The API compiles them via its own `tsc`/`nest build`.

This keeps the dev loop fast (no separate build/watch per package). If a package later
needs to ship compiled output (e.g. for external consumers), add a `build` script and
point `exports` at `dist/`.

## Technology stack

- **Web:** Next.js + TypeScript + Tailwind CSS (add Tailwind when styling begins)
- **Backend:** NestJS + PostgreSQL + Prisma
- **Mobile:** Flutter
- **Auth:** JWT + refresh tokens (RBAC)
- **Storage:** Cloudinary or AWS S3
- **Maps:** Google Maps or OpenStreetMap
- **Push notifications:** Firebase Cloud Messaging

## Dependency direction

```
apps/web  ─┐
apps/api  ─┼─▶ packages/* (types, constants, utils, validation, auth, ui, database)
           │
constants ◀── types, validation, auth   (constants is the lowest-level shared package)
config    ◀── (everything, for tsconfig)
```

Keep the arrows one-directional: apps depend on packages, never the reverse.
