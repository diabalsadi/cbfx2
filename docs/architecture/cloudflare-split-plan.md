# CBFX — Backend & Frontend Split → Cloudflare Architecture

Companion plan to `docs/architecture/tradeverse_architecture.png` (target-state diagram).
This document is the implementation roadmap to get from the current monolith to that
target state. Nothing in this plan has been executed yet — it is a proposal to review
before any code changes start.

## 1. Current state (as of 2026-09-03)

**Monorepo scaffold: started, not finished.**
- Root `pnpm-workspace.yaml` already declares `apps/*` + `packages/*`.
- `frontend/` → `apps/frontend/` move is staged in git (252 renames, uncommitted).
- No `packages/*` directory exists yet.
- No `apps/backend*` exists yet — `backend/` is still at repo root, deployed via
  `Dockerfile`/`docker-compose.yaml` (not Cloudflare Workers).

**Signal Server: already done — use it as the reference pattern.**
`signals-service/` is a fully isolated FastAPI app with its own `wrangler.toml` and
`worker/index.ts` entrypoint, deployed as a Cloudflare Python Worker independent of
the main backend. It's the only piece of the target diagram that already exists as-built.

**Backend: one monolith, two domains interleaved.**
`backend/app/` has 112 files (routers/models/schemas/services) registered as a single
FastAPI app (`backend/app/main.py`). Roles split the domains logically but not
physically:
- **CRM/admin roles**: `super_admin`, `broker`, `editor`, `affiliate`
- **User role**: `client`

Router audit (from `main.py` registrations + spot checks):

| Router | Domain | Notes |
|---|---|---|
| `clients.py` | CRM only | `super_admin` only, advertiser CRM contacts |
| `campaigns.py`, `ad_banners.py`, `broker_placements.py`, `seo_meta.py`, `symbol_categories.py`, `rebate_payouts.py`, `media.py` | CRM only | admin-managed content/ops |
| `articles.py` | Mixed | admin write, public read |
| `brokers.py` | Mixed | `super_admin`/`broker` write, public read |
| `users.py` | Mixed | admin manages all accounts incl. `client` role |
| `withdrawal_requests.py` | Mixed | user creates, admin approves |
| `copy_traders.py`, `copy_subscriptions.py` | Mixed | public list, user subscribes, admin curates |
| `mt5_accounts.py` | Mixed | user links account, admin oversight |
| `auth.py` | Shared | single login endpoint issues JWTs for every role today |
| `market_prices.py`, `analysis.py`, `forum.py`, `plays.py`, `geo.py`, `referrals.py`, `visits.py`, `notifications.py`, `billing.py`, `public.py` | User-facing | not yet role-audited line-by-line |
| `broker_reports.py`, `internal.py` | Likely CRM | not yet role-audited line-by-line |

The **mixed-domain routers are the real complexity** in this split — they need
endpoint-level separation, not file-level.

**Frontend: already physically separated at the route level.**
- `apps/frontend/app/[locale]/admin/**` — 24 admin-only pages (clients, articles,
  ads-campaigns, media, reports, symbol-categories, overview, rebate-payouts, seo,
  users, referral-clients, mt5-accounts, copy-traders, brokers, withdrawal-requests,
  ads-placements, referrals, account, login, change-password, contact-us).
- `apps/frontend/app/[locale]/(auth)/**` + `(user)/**` — public/user pages (login,
  register, forgot-password, account, analysis, brokers, calendar, cashback,
  copy-trading, forum, markets, ...).
- Shared: `HomeClient.tsx`, root `layout.tsx`, `globals.css`, `api/proxy`, and a
  flat `helpers/` directory (`api.ts`, `roles.ts`, `backendUrl.ts`, etc.) used by both.

This existing split is a strong head start for "App A / App B" — the page-level
boundary already exists. What's missing is a **shared package** so both apps ship
identical components/styles/helpers instead of diverging copies.

## 2. Target state (per diagram)

- **App A** (CRM) + **App B** (User) — separate Next.js deployments on Cloudflare
  Pages/Workers, visually and functionally identical to what exists today, just split
  by deployment target.
- **CRM Backend** + **User Backend** — separate FastAPI apps, each a Cloudflare Python
  Worker (same pattern as `signals-service`).
- **Signal Server** — unchanged, already correct.
- **Cloudflare Edge Cache API** (`caches.default`) in front of all three backends,
  checked before Hyperdrive, for hot reads at ~10k req/s.
- **Hyperdrive** — pooled connection to Postgres for the cache-miss path.
- **KV Cache** — 30-min write cadence, purge on invalidation; explicitly *not* the
  hot-read path.
- **R2** — object storage for reports/exports, zero egress.
- **Postgres (Neon)** — single shared DB across CRM + User + Signal, min 0.25 CU,
  max capped to p97 burst, with independently-sized read replica(s).
- **Cloudflare Cron** — triggers Signal Server only (unchanged).

## 3. Open decisions (need your input before Phase 2)

1. **Auth model across two backends.** Keep a single shared `User` table + JWT
   secret (both backends verify the same token, just enforce different role sets),
   or split into two token scopes/issuers? Shared DB in the diagram implies the
   former is intended — confirm.
2. **Mixed-router split strategy.** For files like `brokers.py`/`users.py`, split
   by endpoint into `crm_backend/routers/brokers.py` (admin CRUD) and
   `user_backend/routers/brokers.py` (public read), or keep one router mounted on
   both apps behind different role checks? Endpoint-level split is cleaner for the
   "two independently deployable Workers" goal but is more surgery up front.
3. **Shared backend code.** Models/schemas/db session/mailer/auth utils are used by
   both domains. Proposal: a `packages/backend-shared` (or a plain shared Python
   package) holding models + db + common utils, imported by both `apps/crm-backend`
   and `apps/user-backend`. Needs a decision on packaging (path dependency vs. a
   proper installable package) given Cloudflare Python Workers' constraints.
4. **Frontend shared package scope.** A `packages/ui` (or `packages/shared`) for
   design-system components + `helpers/*` + SCSS — how much of today's
   `apps/frontend` moves there vs. stays app-local? Needs an inventory pass of
   `components/` (not yet done in this plan) before scoping.

## 4. Phased plan

### Phase 0 — Finish the monorepo scaffold
- Commit the in-progress `frontend/` → `apps/frontend/` rename.
- Create empty `packages/` structure per the decisions above.
- No behavior change; purely structural.

### Phase 1 — Backend domain audit (completes what this doc started)
- Finish the router-by-router classification table above for every router file
  (the ones marked "not yet role-audited").
- For each mixed router, list its endpoints individually with CRM/User/Shared tag.
- Output: a definitive endpoint-level split map — the actual spec for Phase 2.
- **No code changes in this phase.**

### Phase 2 — Backend split into two services
- Scaffold `apps/crm-backend` and `apps/user-backend` (FastAPI, following
  `signals-service`'s structure as the template).
- Move CRM-only routers/models/schemas into `apps/crm-backend`; User-only into
  `apps/user-backend`; split mixed routers per the Phase 1 map.
- Shared code extracted per decision #3.
- Both apps point at the same Postgres (Neon) — no schema changes needed since
  models are shared, not duplicated.
- Per CLAUDE.md: run `impact()` on every router/model/service before moving it,
  and `detect_changes()` before each commit, since this phase touches call graphs
  extensively.

### Phase 3 — Cloudflare Workers deployment for both backends
- Add `wrangler.toml` + Python Worker entrypoint to each, mirroring
  `signals-service/wrangler.toml` and `signals-service/worker/index.ts`.
- Wire Hyperdrive binding for the pooled Postgres connection.
- Retire the Docker-based deploy for the split services once Workers deploy is
  verified (keep `docker-compose.yaml` for local dev if useful).

### Phase 4 — Edge caching layer
- Add Cloudflare Edge Cache API (`caches.default`) read-through in front of the
  identified hot endpoints in both backends.
- Add KV-based cache for the 30-min-refresh data (distinct from the edge cache;
  don't conflate the two per the diagram's explicit note).
- Wire cache invalidation/purge hooks where admin actions in CRM Backend should
  invalidate cached reads in User Backend (e.g., broker/article edits).

### Phase 5 — R2 for reports/exports
- Move report/export generation (`broker_reports.py`, rebate payout exports, etc.)
  to write into R2 instead of local/DB storage.

### Phase 6 — Frontend split into two apps
- Inventory `apps/frontend/components/**` and `helpers/**` for what's genuinely
  shared vs. admin-only vs. user-only.
- Extract the shared design system + helpers into `packages/ui` (or equivalent).
- Split `apps/frontend` into `apps/crm-frontend` (mounts today's `admin/**` routes)
  and `apps/user-frontend` (mounts `(auth)/**` + `(user)/**`), both consuming the
  shared package so UI/functionality stays identical to today.
- Two separate Cloudflare Pages/Workers deployments, each pointed at its
  respective backend.

### Phase 7 — Postgres/Neon tuning
- Configure min/max Compute Units per the diagram's sizing note (min 0.25 CU, max
  capped to p97 burst, no padding).
- Provision read replica(s), sized independently from primary.

## 5. Sequencing & risk

1. Phase 0 → 1 are safe/reversible (no runtime behavior change) — do these first.
2. Phase 2 is the highest-risk phase: it touches nearly every router/model in the
   codebase. Do it incrementally, one domain group at a time (start with CRM-only
   files, which need no endpoint splitting, before tackling mixed routers), and run
   full impact analysis + `detect_changes({scope: "compare", base_ref: "main"})`
   after each group.
3. Phase 6 (frontend split) can happen in parallel with Phase 2/3 once the shared
   package boundary is agreed — it doesn't depend on the backend split completing.
4. Phases 3-5 and 7 are additive infra work and can be sequenced after 2 (or 6)
   land, in any order, since they don't change application logic.
5. Cutover: run old monolith and new split services side by side (same DB) behind a
   router/DNS switch per app, verify parity, then decommission the monolith
   deployment. Do not decommission until both new backends have been observed
   serving real traffic without regressions.

## 6. Explicitly out of scope for this doc

- Mobile App (marked "planned — not built yet" in the diagram) — not addressed here.
- Actual endpoint-level classification for the "not yet role-audited" routers in
  the table above — that's Phase 1's deliverable, not this plan's.
