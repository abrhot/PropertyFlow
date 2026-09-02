# PropertyFlow Mobile (React Native + Expo)

The user-facing mobile app for **tenants**, **owners**, and on-the-go
**maintenance** / **managers**. It reuses the monorepo's shared packages so the
authentication, authorization (CASL), API contracts, and validation are exactly
the same as the web app — only the UI layer is native.

## What it reuses from the monorepo

- `@propertyflow/api-client` — typed SDK for the backend (mobile transport)
- `@propertyflow/auth` — CASL ability model + rules (`buildAbility`, `accessibleSectionsFor`)
- `@propertyflow/types` — API contracts (DTOs)
- `@propertyflow/validation` — Zod form validation
- `@propertyflow/constants` — roles, statuses, labels

The web UI package (`@propertyflow/ui`) is **not** reused — it's DOM/Tailwind.
The mobile app has its own native components in `src/components` and shares the
"cream + deep navy" look through `src/theme`.

## Auth on mobile

React Native has no httpOnly cookie jar, so the app uses the API client's
**token transport**: the refresh token is returned in the login/refresh body and
stored in the device keychain via `expo-secure-store`. The web app is unchanged
and keeps using the httpOnly refresh cookie.

On the first installation, `app/(auth)/welcome.tsx` shows the animated welcome
flow and stores a non-sensitive completion flag. Later unauthenticated launches
go directly to sign in. Reinstalling or clearing app storage shows onboarding
again.

## Run it

From the repo root, first build the shared packages (Metro consumes their
compiled `dist/`):

```bash
pnpm install
pnpm --filter "./packages/*" build
```

Start the API + database (see the root README), then start Expo:

```bash
pnpm --filter @propertyflow/mobile start
```

Open it in Expo Go (scan the QR) or an emulator (press `a` / `i`).

### API URL on a physical device

`localhost` on a phone points at the phone itself. Set your machine's LAN IP:

```bash
# PowerShell
$env:EXPO_PUBLIC_API_URL="http://192.168.1.20:3001"; pnpm --filter @propertyflow/mobile start
```

Or edit `expo.extra.apiUrl` in `app.json`. Make sure the API's CORS allows the
Expo web origin (`MOBILE_WEB_ORIGIN`, default `http://localhost:8081`).

## Demo accounts

Same as web — one password for all: `Password123`

- `tenant@demo.test` · `owner@demo.test` · `maintenance@demo.test`
- `manager@demo.test` · `orgadmin@demo.test`

## Screens

Role-aware tab navigation (tabs hide based on CASL sections):

- **Homes** — public discovery, listing details, and rent/buy inquiry
- **Sign in / invitation** — secure login, workspace signup, and invite activation
- **Home** — resident rent and open-request summary; technician jobs
- **Rent** — next payment due + history, pay in one tap
- **Help** — residents report and track requests; technicians update work orders
- **Chat** — message the property team
- **Me** — account, current home/lease, role, and sign out
- **Notifications** — bell in the header, deep-links to the right screen

The detailed package/runtime map is in `docs/mobile-architecture.md`.
