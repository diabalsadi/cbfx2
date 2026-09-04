# CBFX

## Cloudflare Deployment (crm-backend / user-backend / crm-frontend / user-frontend)

The CRM/User split (backend and frontend) is being migrated to Cloudflare — see `plan.md` for the full phase-by-phase migration plan and status. This section is just the practical "how to deploy" reference.

### Live

- **user-frontend**: https://user-frontend.tradeversesocial.workers.dev

### Deploying a backend service (`crm-backend/` or `user-backend/`)

```bash
cd user-backend   # or crm-backend

wrangler deploy --dry-run   # validates config + builds locally, no deploy
wrangler secret bulk .env   # pushes every secret in .env at once (accepts .env format directly)
wrangler deploy              # the real deploy
```

Per-service secret lists (which vars each service actually needs, verified against real code, not assumed) are in `crm-backend/.env.example` and `user-backend/.env.example`.

### Deploying a frontend app (`crm-frontend/`, `user-frontend/`, `apps/frontend`)

Uses [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) — as of now, only `user-frontend` has this wired up; `crm-frontend` and `apps/frontend` still need the identical setup.

```bash
cd user-frontend
pnpm run cf:deploy   # builds with opennextjs-cloudflare, then deploys
```

Two non-obvious things that had to be worked around to get this building/running at all (see `plan.md` Phase 6 for the full story if replicating this for `crm-frontend`/`apps/frontend`):
- `sharp` (Next's optional image-optimizer dependency, unused since this codebase has no `next/image` usage anywhere) fails to bundle for Workers — worked around via a `pnpm.overrides` entry in the root `package.json` replacing it with a no-op stub package.
- Next.js's own middleware manifest lookup does a dynamic `require()` that Workers can't execute, crashing every route in production — worked around via `NEXT_PRIVATE_MINIMAL_MODE: "1"` in `wrangler.jsonc`'s `vars`. This is a known open upstream bug, not an app bug.

`BACKEND_URL` needs to be set as a Cloudflare var pointing at the matching deployed backend for a frontend deploy to actually reach it — this hasn't been wired up yet for `user-frontend` (currently falls back to the old Render-hosted backend, which a Cloudflare Worker's outbound fetch can't reach).

## Test Credentials
For local development, you can use the following test accounts:
- **Super Admin**: `admin@cbfx.com` / `password123`
- **Editor**: `editor@cbfx.com` / `password123`
- **Broker**: `broker@cbfx.com` / `password123`

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

## Backend

### How to run

#### With Docker (Recommended)
```bash
cd backend

# Start both services (database + backend)
docker-compose up --build

# Run in detached mode
docker-compose up -d --build

# Stop services
docker-compose down

# Stop and remove volumes (deletes database data)
docker-compose down -v

# Database Management (Adminer)
# Start Adminer service
docker-compose up -d adminer

# Run in detached mode
docker run -d -p 3000:3000 cbfx-frontend

# Access at http://localhost:8080
# Login credentials:
# - System: PostgreSQL
# - Server: db
# - Username: cbfx_user
# - Password: cbfx_password
# - Database: cbfx_db
```

#### Without Docker
```bash
cd backend

# Create virtual environment
python -m venv cbfx-backend-env

# Activate virtual environment
source cbfx-backend-env/bin/activate  # On Linux/Mac
.\cbfx-backend-env\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Run server
python -m uvicorn app.main:app --reload
```

## Frontend

### Prerequisites
Ensure you're using the correct Node.js version:
```bash
cd frontend

# If you have nvm installed
nvm use

# This will use Node.js version 20 (specified in .nvmrc)
```

### How to run

#### Local Development (Without Docker)
```bash
cd frontend

# Install dependencies (first time only)
npm install

# Run development server
npm run dev
```

#### With Docker - Development
```bash
cd frontend

# Build development image
docker build -f Dockerfile.dev -t cbfx-frontend-dev .

# Run with hot-reload
docker run -p 3000:3000 -v ${PWD}:/app -v /app/node_modules cbfx-frontend-dev
```

#### With Docker - Production
```bash
cd frontend

# Build production image (optimized, ~150MB)
docker build -t cbfx-frontend .

# Run production container
docker run -p 3000:3000 cbfx-frontend

# Look at the logs of the container
docker logs -f cbfx_backend

```

### Data seeding

```bash
docker compose exec -T backend python seed.py
```

The frontend will be available at **http://localhost:3000**
