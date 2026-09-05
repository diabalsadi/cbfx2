# CBFX

## Cloudflare Deployment (5 services)

The CRM/User split (backend and frontend) has been migrated to Cloudflare and cut over to production — see `plan.md` for the full phase-by-phase migration history. The original monolith (`apps/frontend`, `backend/`) has been decommissioned and removed from this repo (Phase 8); its history is preserved in git prior to that removal. This section is the practical "how to deploy" reference for all five live services.

### Live

| Service | Type | Live URL | Custom domain | Worker name |
|---|---|---|---|---|
| `apps/user-frontend` | Next.js (OpenNext) | https://user-frontend.tradeversesocial.workers.dev | **www.trade-verse.com** | `user-frontend` |
| `apps/crm-frontend` | Next.js (OpenNext) | https://crm-frontend.tradeversesocial.workers.dev | **admin.trade-verse.com** | `crm-frontend` |
| `user-backend` | FastAPI (Cloudflare Container) | https://cbfx-user-backend.tradeversesocial.workers.dev | — (reached Worker-to-Worker via `user-frontend`'s `BACKEND_URL`) | `cbfx-user-backend` |
| `crm-backend` | FastAPI (Cloudflare Container) | https://cbfx-crm-backend.tradeversesocial.workers.dev | — (reached Worker-to-Worker via `crm-frontend`'s `BACKEND_URL`) | `cbfx-crm-backend` |
| `signals-service` | FastAPI (Cloudflare Container, cron-only) | https://cbfx-signals-service.tradeversesocial.workers.dev | — (no public routes into the container at all, not even token-gated) | `cbfx-signals-service` |

All five talk to the same real production Postgres. The two frontend/backend pairs are fully wired end-to-end (`BACKEND_URL` on each frontend points at its matching backend) and serve real production traffic on the custom domains above. `signals-service` has no frontend/UI — it's driven entirely by Workers Cron Triggers (`*/30` generate, `*/5` monitor, daily at 6pm America/New_York for analysis — see `signals-service/README.md`).

### Deploying a backend service (`crm-backend/`, `user-backend/`, or `signals-service/`)

```bash
cd user-backend   # or crm-backend, or signals-service

npm install                 # installs @cloudflare/containers + wrangler — standalone project, not part of the pnpm workspace
wrangler deploy --dry-run   # validates config + builds locally, no deploy
wrangler secret bulk .env   # pushes every secret in .env at once (accepts .env format directly)
wrangler deploy              # the real deploy
```

Per-service secret lists (which vars each service actually needs, verified against real code, not assumed) are in each service's `.env.example` (`crm-backend/.env.example`, `user-backend/.env.example`, `signals-service/.env.example`).

**`wrangler secret put`/`secret bulk` only sets secrets on the Worker — it does NOT automatically become the container's own process environment** (a separate Docker sandbox). Without explicitly wiring them through, the app inside crashes on startup (e.g. `DATABASE_URL environment variable is required`) and it surfaces as an opaque `Failed to start container` error, not an env-var error. Each service's `worker/index.ts`'s `Container` subclass needs an explicit constructor that sets `this.envVars` from the Worker's own `env` argument, for every secret the app needs — all three (`crm-backend/worker/index.ts`, `user-backend/worker/index.ts`, `signals-service/worker/index.ts`) are deployed and live with this fix already applied.

### Deploying a frontend app (`apps/crm-frontend/`, `apps/user-frontend/`)

Uses [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) — both apps have this wired up and deployed.

```bash
cd apps/user-frontend   # or apps/crm-frontend
pnpm run cf:deploy   # builds with opennextjs-cloudflare, then deploys
```

Two non-obvious things that had to be worked around to get this building/running at all (see `plan.md` Phase 6 for the full story):
- `sharp` (Next's optional image-optimizer dependency, unused since this codebase has no `next/image` usage anywhere) fails to bundle for Workers — worked around via a `pnpm.overrides` entry in the root `package.json` replacing it with a no-op stub package. This applies workspace-wide.
- Next.js's own middleware manifest lookup does a dynamic `require()` that Workers can't execute, crashing every route in production — worked around via `NEXT_PRIVATE_MINIMAL_MODE: "1"` in `wrangler.jsonc`'s `vars`. This is a known open upstream bug, not an app bug.

`BACKEND_URL` needs to be set as a Cloudflare var (in `wrangler.jsonc`'s `vars`) pointing at the matching deployed backend for a frontend deploy to actually reach it — done for both `user-frontend` (points at `user-backend`) and `crm-frontend` (points at `crm-backend`), Worker-to-Worker in both cases.

### reCAPTCHA

Both frontends serve a shared reCAPTCHA v2 checkbox site key (`RECAPTCHA_SITE_KEY_PUBLIC` in each frontend's `wrangler.jsonc`), verified server-side by `crm-backend`/`user-backend` (`RECAPTCHA_SECRET_KEY`). The reCAPTCHA site's allowed-domains list (Google's admin console) must include every real domain the widget is served from — `localhost`, `www.trade-verse.com`, `admin.trade-verse.com` — or verification fails even though the site/secret key pair itself is correct. If either key is ever rotated, update it in **all** of: both frontends' `.env.local` + `wrangler.jsonc` (site key, then rebuild+redeploy), and both backends' `.env` (secret key, pushed via `wrangler secret put` + redeploy) — a mismatched pair between what the widget serves and what the backend verifies against fails silently as a generic "Captcha verification failed."

## Test Credentials
For local development, you can use the following test accounts:
- **Super Admin**: `admin@cbfx.com` / `password123`
- **Editor**: `editor@cbfx.com` / `password123`
- **Broker**: `broker@cbfx.com` / `password123`
- **Client** (dual-portal: can log into both admin and user portals): `test-client@cbfx.com` / `password123`

### Stripe test card (Signals / Copy Trading subscription checkout)
Stripe is in test mode — no real charge occurs. Use:
- **Card number**: `4242 4242 4242 4242`
- **Expiry**: any future date
- **CVC**: any 3 digits
- **ZIP**: any value

## Ad Banner Image Guidelines

Recommended image dimensions and aspect ratios for each ad placement slot (configured in `/admin/ads-placements`), based on how each slot actually renders on the site — not generic ad-network defaults.

| Slot | Container behavior | Recommended size | Aspect ratio |
|---|---|---|---|
| `sticky_top_banner`, `pre_cashback_banner`, `pre_copytrading_banner`, `pre_signals_banner`, `pre_markets_banner` | Full-width, cropped to fill (`object-fit: cover`), capped at 140px tall on desktop / 90px on mobile | **1200×140px** (upload 2× — 2400×280 — for retina) | ~8.5:1 (wide leaderboard) |
| `sidebar_left_banner`, `sidebar_right_banner` | Fixed 160px-wide box, height ≈ 90% of viewport, cropped to fill (`object-fit: cover`), desktop-only | **320×1200px** (2× of the 160px box) | ~1:3.75 (tall skyscraper) |
| `featured_broker` (sign-in page) | Shown at native aspect ratio, not cropped (`width: 100%, height: auto`) | **760×760px** or similar | Square-ish (1:1 to 3:2) — whatever ratio you give it is what renders |
| `sponsor_logo` (header, next to site logo) | Shrunk to fit, never cropped (`object-fit: contain`), max 22px tall (18px on mobile), max 96px wide | **192×88px** (2× retina), logo centered, transparent background | Landscape, up to ~2.2:1 |

**Notes:**
1. **`cover` slots** (top banner, sidebar, pre-section banners) **will crop edges** if the image's aspect ratio doesn't match the box exactly — keep logos/text centered, not near the edges.
2. **`contain`/`auto` slots** (header logo, featured broker) **never crop**, but a badly-mismatched aspect ratio just looks awkward (excess empty space or an odd fit) — match the recommended ratio reasonably closely.
3. Use a **transparent PNG or SVG** for the header sponsor logo specifically — it sits directly in the nav bar with no background card, so a white/colored box background shows as a visible rectangle.
4. Upload at 2× the listed pixel size for retina screens — file size isn't a concern at these dimensions.

## Running the current services locally

The original monolith (`backend/`, `apps/frontend`) no longer exists — it was decommissioned in Phase 8 after the CRM/User split cut over to production. Each current service runs independently:

- **`crm-backend/`, `user-backend/`**: FastAPI apps — `pip install -r requirements.txt` then `uvicorn app.main:app --reload` (each needs `backend-shared` installed editable: `pip install -e ../backend-shared`).
- **`crm-frontend/`, `user-frontend/`** (under `apps/`): Next.js apps in the pnpm workspace — `pnpm --filter crm-frontend dev` / `pnpm --filter user-frontend dev` from the repo root.
- **`signals-service/`**: see `signals-service/README.md`.

See the "Cloudflare Deployment" section above for how each is deployed, and `plan.md` for the full migration history.
