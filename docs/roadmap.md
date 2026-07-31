# Product roadmap & feature backlog

The near-term focus is **finishing the core experience and elevating the UI to a
luxury-grade standard**. The cutting-edge differentiators below are **queued** and
will be implemented in steps, each on top of shared infrastructure we introduce
as we go. This file is the single backlog of record — pull the next item from
here when a phase is ready.

## Guiding quality bar

- Luxury, restrained visual design; fast, accessible, responsive.
- Every feature is multi-tenant safe and enforced by the database-driven CASL
  rules (see [authorization.md](./authorization.md)).
- Typed end to end: shared contracts in `@propertyflow/types`, one API client.

## Core experience — done

Every navigable section is now backed by a real, CASL-scoped domain API (no more
"preview" placeholders). The generic `[section]` preview router has been removed;
each area has a dedicated route:

- **Properties, Leases, Applications, Tenants** — full CRUD / directory views.
- **Payments** — staff ledger + tenant "Pay rent".
- **Maintenance & Work Orders** — tenant requests, staff queue, technician jobs.
- **Reports** — owner/org-scoped aggregates with charts and a sortable table.
- **Messages** — tenant ↔ staff conversations (org-wide for staff, participant
  scoped for tenants).
- **Organizations & Billing** — SUPER_ADMIN platform administration: per-org
  plan/portfolio management and subscription MRR analytics.
- **Settings** — real API for the account profile, per-user notification
  preferences, and the organization profile (contact + address), alongside the
  existing team-invitation management for admins.

## Delivery — done

- **Installable PWA** — web app manifest, generated icons (any + maskable),
  a production service worker with an offline fallback, and install metadata.
  See [deployment.md](./deployment.md) for hosting and the Google Play Store
  (TWA) path.

## Now (in progress)

- **Design system elevation** — premium palette, typography, surfaces, and
  component polish across the dashboard, auth, and all domain pages.

## Shared infrastructure (unlocks multiple pillars)

These are prerequisites; schedule them just before the first pillar that needs them.

- **Media service** — S3-compatible object storage with presigned uploads + CDN,
  and an `Asset` model linked to `Property`/`Unit`/`MaintenanceRequest`.
  (Unlocks: 3D/VR media, inspection video, lease documents.)
- **Async job queue** — BullMQ on the existing Redis, for long-running/AI work
  off the request path. (Unlocks: AI pipelines, report generation, valuations.)
- **Real-time gateway** — WebSocket layer for live updates and messaging.
  (Unlocks: concierge hub, IoT telemetry, live analytics.)
- **Payments provider** — Stripe (Connect for split/escrow) + `Payment`,
  `RentSchedule`, `PayoutAccount` models. (Unlocks: FinTech pillar.)

## Pillar 1 — Immersive Virtual Property Hub

- [ ] Interactive 3D floor plans + VR walkthroughs embedded in owner/tenant
      portals (asset viewer, media service).
- [ ] IoT smart-home integration: `Device` + `Telemetry` models, provider
      webhooks, real-time mobile controls for locks/meters/climate/cameras.

## Pillar 2 — Advanced AI & Automated Workflows

- [ ] Automated inspection pipeline: tenant uploads a phone video → vision/LLM
      extracts the issue → auto-generates a `WorkOrder` (media service + queue).
- [ ] Predictive asset lifecycle: forecast HVAC/plumbing/roofing maintenance
      from age + usage telemetry.
- [ ] Smart Lease AI: parse contracts into interactive summaries (renewals,
      clauses, rent increases).

## Pillar 3 — Enterprise FinTech & Analytics

- [ ] Split & automated payments: roommate/multi-owner settlement via Stripe
      Connect; autopay and instant payouts.
- [ ] Live market intelligence: valuation tracking, dynamic local rent rates,
      and regional yield comparisons in the investor view.

## Pillar 4 — High-End Communication Portals

- [ ] White-label portal styling: per-organization branding (logo, colors,
      domain) for premium firms.
- [ ] Unified concierge hub: real-time channel bridging residents, maintenance
      staff, and localized concierge services.

## Sequencing note

Recommended order once the core UI is done: **Payments provider → Pillar 3**
(clear ROI, self-contained) → **Media service + Queue → Pillar 2** (high "wow",
reuses the same infra) → **Real-time gateway → Pillar 4** → **Pillar 1** (most
hardware/vendor dependent). Adjust to business priorities.
