# Database

PostgreSQL, accessed through **Prisma**. The schema lives at
`packages/database/prisma/schema.prisma`.

## Getting started

1. Copy env: `cp packages/database/.env.example packages/database/.env` and set `DATABASE_URL`.
2. Generate the client: `pnpm --filter @fieldtrack/database db:generate`
3. Create the first migration: `pnpm --filter @fieldtrack/database db:migrate`
4. Inspect data: `pnpm --filter @fieldtrack/database db:studio`

## Core tables (initial)

- **Company** — tenant / organization.
- **User** — staff accounts with a `UserRole` (SUPER_ADMIN → CUSTOMER).
- **Customer** — clients who request work.
- **WorkOrder** — the central job entity with `WorkOrderStatus` and `WorkOrderPriority`.

## Planned tables (from requirements)

Roles, Permissions, Employees, Teams, Addresses, WorkOrderTasks, Appointments, Assets,
Vehicles, InventoryItems, Photos, Attachments, Notifications, Messages, ActivityLogs,
Reports.

## Keeping enums in sync

The Prisma enums (`UserRole`, `WorkOrderStatus`, `WorkOrderPriority`) mirror the values in
`packages/constants`. When you change one, update the other so the API and clients agree.
