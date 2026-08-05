# Product roadmap & feature backlog

Near-term focus: **a fast, admin-first web app** with a clear public rent/buy path,
then **React Native mobile**. Cutting-edge pillars stay queued until core ops are solid.

## Guiding quality bar

- Fast, accessible, responsive UI; lean navigation.
- Multi-tenant safe + database-driven CASL ([authorization.md](./authorization.md)).
- Typed end to end: `@propertyflow/types` + one API client (web and future mobile).

## Core experience — done / tightened

Admin-focused workspace (Leases hidden from nav; leasing still works via tenants + units):

- **Properties, Tenants, Inquiries** — portfolio, residents, rent/buy requests.
- **Payments** — staff ledger + tenant Pay rent.
- **Maintenance & Work Orders** — request → approve → assign → complete → verify.
- **Reports, Messages, Team, Settings** — analytics, chat, staff, org profile.
- **Public Available Homes** (`/homes`) — browse vacant units; Rent/Buy inquiry
  lands in admin **Inquiries** (no login required).

### Roles

- **Organization Admin** — company, staff, all sites, Team, Reports.
- **Property Manager** — day-to-day on assigned buildings.
- **Maintenance** — assigned jobs + field issue reports.
- **Owner** — read-only owned properties.
- **Tenant** — pay rent, my requests, my lease, messages.

### Delivery

- Installable PWA, notifications bell, manager↔building scope.

## Before React Native (now)

1. **Speed** — query cache (`staleTime`), lighter nav, less polling.
2. **Essential admin flows** — search, tenants, payments, maintenance, inquiries.
3. **Public rent/buy** — `/homes` + inquiry inbox (done).
4. **Hardening** — smoke-test every role; fix broken search/empty states.
5. Then **React Native** sharing `@propertyflow/api-client` + auth rules.

## Shared infrastructure (later)

- Media service (uploads/CDN) · BullMQ jobs · WebSocket gateway · Stripe Connect.

## Pillars (queued)

1. Immersive Virtual Property Hub (3D/VR, IoT)
2. AI workflows (inspection video → work order, lease AI)
3. FinTech (split payments, market intel)
4. Concierge / white-label portals

## Sequencing

Finish admin essentials + public listings → RN mobile → Payments provider / Pillar 3
→ Media + Queue / Pillar 2 → Real-time / Pillar 4 → Pillar 1.
