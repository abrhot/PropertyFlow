# PropertyFlow Mobile (React Native + Expo)

The mobile app for tenants, maintenance staff/vendors, and on-the-go managers.
This folder is a placeholder — the Expo project hasn't been generated yet.

React Native (Expo) is used (instead of Flutter) so the app can share
TypeScript types, validation, and business logic with the web app via the
monorepo `packages/*` (see the PRD's technology-stack note).

## Generate the app

Install the Expo tooling, then from the repo root:

```bash
cd apps
npx create-expo-app@latest mobile --template
```

Then wire it into the workspace and reuse the shared packages:

- `@propertyflow/types` — API contracts (DTOs)
- `@propertyflow/validation` — Zod form validation
- `@propertyflow/api-client` — typed SDK for the backend
- `@propertyflow/constants` — roles, statuses, enums

## Planned scope

Role-aware login (tenant / staff / manager), rent payment, lease view,
maintenance requests with photos, work-order updates, push notifications,
and offline support with sync-on-reconnect.
