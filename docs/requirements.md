# PropertyFlow — Requirements

**PropertyFlow** is a multi-tenant **SaaS Property Management Platform**. It helps
property management companies, landlords, and owners manage portfolios end-to-end
— listings, tenant applications, leases, rent collection, maintenance, and
financial reporting — with a web app, a mobile app, and a shared backend.

It serves two connected audiences: **managers/owners** (visibility and control)
and **tenants** (pay rent, submit maintenance requests, communicate).

## User roles

| Role | Scope | Responsibilities |
| --- | --- | --- |
| Super Administrator | Platform-wide | Manage organizations, platform config, billing, analytics |
| Organization Admin | One company | Staff, properties, owners, company settings |
| Property Manager | Assigned properties | Units, leases, applications, maintenance, reports |
| Leasing Agent | Assigned properties | Listings, applications, screening, lease creation |
| Accountant | Financial data | Ledgers, statements, reconciliation |
| Maintenance / Vendor | Assigned work orders | Update status, upload photos, log time/materials |
| Owner | Own properties | View performance, occupancy, financials |
| Tenant | Own lease/unit | Pay rent, submit requests, view lease, message mgmt |

Permissions are scoped by **both role AND organization/property** to prevent
cross-tenant data leakage.

## Core modules

Auth & access control (RBAC) · Organization & portfolio · Listings & applications ·
Lease management (e-sign) · Rent collection & payments (Stripe) · Maintenance ·
Accounting & reporting · Communication · Documents · Notifications · Analytics.

## Key workflows

- **Application → lease:** apply → screen → approve → e-sign → rent schedule.
- **Rent collection:** auto-charge → remind → pay (autopay/online) → reconcile →
  late fee → owner statement.
- **Maintenance:** tenant submits (with photos) → assign → technician updates →
  complete → tenant rates → logged.

## Development phases

- **Phase 0 — Monorepo foundation:** tooling, shared packages, CI. ✅
- **Phase 1 — Auth & multi-tenancy:** organizations, RBAC, login. ✅ *(implemented)*
- **Phase 2 — Property & lease management:** properties, units ✅ *(implemented)*; leases next.
- **Phase 3 — Rent collection:** Stripe, rent schedules, autopay, tenant portal.
- **Phase 4 — Maintenance:** work orders + mobile app MVP.
- **Phase 5 — Applications & screening:** listings, screening, e-signature.
- **Phase 6 — Reporting & owner portal.**
- **Phase 7 — Billing & subscription layer** (the platform's own SaaS billing).
- **Phase 8 — Hardening & launch.**

## Non-functional requirements

Strict multi-tenant isolation · secure auth + PCI-compliant payments · responsive
web + native-feeling mobile · offline mobile support for field staff · fast
dashboards · scalable from single landlord to enterprise · regional compliance.

> This is a condensed summary. The full product guideline (executive summary,
> data model, billing model, risks, glossary, etc.) is the source of truth.
