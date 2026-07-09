# API

The backend is a **NestJS** REST API in `apps/api`. All routes are served under the
`/api` global prefix (see `src/main.ts`).

## Run it

```bash
pnpm --filter @fieldtrack/api dev
```

Default: `http://localhost:3001/api`.

## Endpoints (initial)

| Method | Path          | Description        |
| ------ | ------------- | ------------------ |
| GET    | `/api/health` | Service healthcheck |

## Conventions

- **Validation:** use the Zod schemas in `packages/validation` for request bodies so the
  same rules apply on the client and server.
- **Auth:** JWT access + refresh tokens. Token payload shape and RBAC helpers live in
  `packages/auth`. The signing secret stays in the API only (see `.env.example`).
- **Shared types:** response/entity shapes come from `packages/types`.

## Planned modules

Auth, Users, Roles/Permissions, Customers, Work Orders, Scheduling, Teams, Assets,
Notifications, Chat, Reports, Audit Logs.
