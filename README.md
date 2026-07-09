# FieldTrack — Field Operations Management Platform

A monorepo for FieldTrack: a platform that centralizes and automates how companies dispatch
technicians to customer sites (work orders, scheduling, tracking, reporting).

> Internship project. See [`docs/requirements.md`](docs/requirements.md) for the full
> product spec and [`docs/architecture.md`](docs/architecture.md) for how it's built.

## Tech stack

Next.js · NestJS · Flutter · PostgreSQL + Prisma · Turborepo · pnpm · TypeScript · Zod

## Structure

```
apps/       web (Next.js) · api (NestJS) · mobile (Flutter placeholder)
packages/   ui · types · auth · database · config · utils · validation · constants
docs/       requirements · architecture · database · api
```

## Prerequisites

- Node.js **v20+**
- pnpm (`npm install -g pnpm`)
- (Later) PostgreSQL and Flutter

## Getting started

```bash
pnpm install          # install all workspace dependencies
pnpm dev              # run all apps in dev (via Turborepo)
pnpm build            # build everything
pnpm lint             # lint everything
pnpm typecheck        # type-check everything
```

Run a single app:

```bash
pnpm --filter @fieldtrack/web dev     # http://localhost:3000
pnpm --filter @fieldtrack/api dev     # http://localhost:3001/api
```

## Contributing

Commit messages follow **Conventional Commits** — see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Development phases

Phase 1 (this scaffold): monorepo, auth, database, user & role management.
See [`docs/requirements.md`](docs/requirements.md#development-phases) for the full roadmap.
