# Deployment & delivery guide

PropertyFlow ships as an installable **PWA** (web app) that can also be
published to the **Google Play Store** through a Trusted Web Activity (TWA)
wrapper. This guide covers the recommended production setup and the Play Store
path.

## Architecture

| Piece | Tech | Notes |
| --- | --- | --- |
| Web | Next.js 15 (App Router) | Installable PWA (manifest + service worker) |
| API | NestJS 11 | REST under the `/api` prefix |
| Database | PostgreSQL | Prisma migrations |
| Cache/queue | Redis (optional) | Only needed for later background-job features |

## Recommended hosting (best, simplest reliable)

Split the frontend and backend across two managed platforms with generous free
tiers and zero server maintenance:

- **Web → [Vercel](https://vercel.com)** — first-class Next.js support, builds
  the PWA automatically.
- **API + Postgres (+ Redis) → [Railway](https://railway.app)** (or
  [Render](https://render.com)) — one-click Postgres/Redis and a simple Node
  service deploy.

> Use one custom domain with subdomains so the auth cookie works cleanly:
> `app.example.com` (web) and `api.example.com` (API). This keeps the refresh
> cookie **same-site** (it is set with `SameSite=Lax`), so no code change is
> needed. Hosting on unrelated domains (e.g. `*.vercel.app` + `*.railway.app`)
> is cross-site and would break the refresh cookie.

### 1. Provision the database

On Railway, add a **PostgreSQL** plugin. Copy its connection string — you'll use
it as `DATABASE_URL`. (Add a **Redis** plugin too if/when background jobs land.)

### 2. Deploy the API (Railway)

- Root directory: repository root (monorepo).
- Build: `pnpm install --frozen-lockfile && pnpm --filter @propertyflow/api... build`
- Start: `node apps/api/dist/main.js`
- Run migrations on release: `pnpm --filter @propertyflow/database db:deploy`
- Point `api.example.com` at the service.

Environment variables (API):

```bash
NODE_ENV=production
PORT=3001                      # Railway injects PORT; the app reads it
WEB_ORIGIN=https://app.example.com
DATABASE_URL=postgresql://...  # from the Postgres plugin
JWT_ACCESS_SECRET=<32+ random chars>
JWT_REFRESH_SECRET=<32+ random chars, different>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
COOKIE_SECURE=true
COOKIE_DOMAIN=.example.com     # leading dot → shared across subdomains
REDIS_URL=redis://...          # optional
```

Generate secrets with `openssl rand -hex 32` (or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

### 3. Deploy the web app (Vercel)

- Framework preset: Next.js. Root directory: `apps/web`.
- Install command: `pnpm install --frozen-lockfile` (run from repo root; set
  the project root to the monorepo and the app to `apps/web`).
- Point `app.example.com` at the project.

Environment variables (Web):

```bash
NEXT_PUBLIC_API_URL=https://api.example.com   # no trailing /api — the client adds it
```

### 4. First release

After the first deploy, apply the schema and (optionally) seed demo data:

```bash
pnpm --filter @propertyflow/database db:deploy   # applies migrations
pnpm --filter @propertyflow/database db:seed     # demo accounts (optional)
```

## Alternative: single VPS with Docker

For one box instead of managed services, run everything with `docker-compose`
(Postgres + Redis already defined in `docker-compose.yml`) and add containers
for the API and web built from their `Dockerfile`s behind a reverse proxy
(Caddy/nginx) that terminates TLS. Use the same env vars as above with
`COOKIE_DOMAIN=.example.com`. This is more flexible but you own the ops.

## PWA — already built in

The web app is installable out of the box:

- `app/manifest.ts` → `/manifest.webmanifest` (name, theme color, icons).
- Generated icons: `/icons/192`, `/icons/512`, `/icons/maskable` (via `next/og`).
- `public/sw.js` → service worker: network-first navigations with an `/offline`
  fallback, stale-while-revalidate for static assets, and it never touches API
  traffic. Registered only in production by `components/service-worker.tsx`.

Verify after deploy: open the site in Chrome → DevTools → **Application** →
Manifest/Service Workers, or run **Lighthouse → PWA**. You should see the
install prompt (⊕ in the address bar).

## Publishing to the Google Play Store (TWA)

Once the PWA is live over HTTPS, wrap it with Google's
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap):

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://app.example.com/manifest.webmanifest
bubblewrap build        # produces app-release-bundle.aab + a signing key
```

Then:

1. **Digital Asset Links** — Bubblewrap prints a SHA-256 fingerprint. Publish it
   so Android trusts the site (removes the browser URL bar). Serve it at
   `https://app.example.com/.well-known/assetlinks.json`:

   ```json
   [
     {
       "relation": ["delegate_permission/common.handle_all_urls"],
       "target": {
         "namespace": "android_app",
         "package_name": "com.example.propertyflow",
         "sha256_cert_fingerprints": ["<FINGERPRINT FROM BUBBLEWRAP>"]
       }
     }
   ]
   ```

   (Add this file under `apps/web/public/.well-known/assetlinks.json` and
   redeploy.)

2. **Play Console** — create a Google Play Developer account ($25 one-time),
   create the app, and upload the `.aab`. Fill in the store listing (icon,
   screenshots, description, privacy policy URL).

3. **Review & release** — submit for review; first review typically takes a few
   days.

Keep the signing key (`android.keystore`) safe — it's required for every future
update.
