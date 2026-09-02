# PropertyFlow mobile architecture

PropertyFlow is one pnpm/Turborepo workspace. The API, web app, and React Native
app are separate runtimes, while domain contracts and business rules live in
shared TypeScript packages.

## Runtime flow

1. `apps/mobile` renders native screens with Expo Router and React Native.
2. Screens call the singleton `ApiClient` from `@propertyflow/api-client`.
3. The client validates its TypeScript request/response contract against
   `@propertyflow/types` and sends requests to `apps/api`.
4. NestJS validates incoming data with schemas from `@propertyflow/validation`.
5. The API enforces rules built from `@propertyflow/auth`; client-side CASL
   checks only improve navigation and UX.
6. Prisma in `@propertyflow/database` is server-only and never enters the
   mobile bundle.

## Shared packages used by mobile

- `@propertyflow/api-client`: typed network methods, access-token retry, and
  mobile refresh-token transport.
- `@propertyflow/auth`: CASL ability construction and accessible sections.
- `@propertyflow/types`: API DTOs and domain models.
- `@propertyflow/validation`: Zod schemas shared with API and web forms.
- `@propertyflow/constants`: roles, statuses, labels, and section identifiers.

Mobile must not copy these rules into screen files. New domain behavior should
be added to the shared package first, then consumed by web and mobile.

## Intentionally native

`@propertyflow/ui` is web-only because it renders DOM elements with Tailwind and
Shadcn. Mobile uses `apps/mobile/src/components` and
`apps/mobile/src/theme`. These components share product color and spacing
language, but render accessible React Native controls.

## Authentication

The API uses the same access/refresh-token session model for both clients:

- Web receives the refresh token in an httpOnly cookie.
- Native mobile receives it in the response body and stores it with
  `expo-secure-store`.
- Expo web uses AsyncStorage only as a development fallback.

The access token remains in memory. On launch, `AuthProvider` calls
`api.bootstrap()`, loads `/auth/me`, then builds the user’s CASL ability from the
rules returned by the API.

## Product boundary

Mobile v1 is resident and field-worker first:

- Public home discovery and rent/buy inquiry
- Authentication and account setup
- Rent balance and payment
- Maintenance reporting and job updates
- Messaging and notifications
- Personal account/home context

Portfolio setup, team administration, reports, and bulk management remain
web-first. Managers can still use lightweight mobile summaries and urgent
actions without duplicating the complete desktop workspace.

## Commands

From the repository root:

```bash
pnpm install
pnpm --filter "./packages/*" build
pnpm dev:mobile
pnpm typecheck:mobile
pnpm build:mobile:web
```

On a physical device, set `EXPO_PUBLIC_API_URL` to the development machine’s LAN
address before starting Expo.
