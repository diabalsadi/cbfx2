# CRM/User Split — Frontend + Backend Migration Sequence

> Checked into the repo so this survives across sessions (previously only lived
> in `~/.claude/plans/swift-wishing-ritchie.md`, outside the repo, and got
> temporarily lost). This is the authoritative, currently-active migration plan.
> See also `docs/architecture/tradeverse_architecture.png` (target-state diagram)
> and `docs/architecture/cloudflare-split-plan.md` (earlier draft — superseded by
> this document; kept only as background reading, not a second source of truth).

## Context

The target Cloudflare architecture (already diagrammed and priced) calls for a CRM Backend and User Backend running as separate services instead of one shared FastAPI monolith, mirroring `signals-service/`, which is already split out. This plan extends that same split to the frontend (separate CRM/admin app vs user-facing app) and finishes the backend split, while preserving identical functionality and UI/UX — this is a pure architectural separation, not a rewrite.

Two decisions were locked in with the user before this plan was written:
- **Backend hosting**: both new backend services follow the exact `signals-service/` pattern — Cloudflare Container + Durable Object wrapper around an unchanged FastAPI app in a Docker container — not native Python Workers (native Workers can't hold a real psycopg2/SQLAlchemy TCP connection, and this pattern isn't proven anywhere in the repo).
- **Repo layout**: a formal pnpm workspace monorepo for the frontend (`apps/`, `packages/`); Python backend services remain plain sibling folders (Python has no pnpm equivalent) alongside the existing `signals-service/`.

Current state, verified by reading the code (not assumed):
- **Frontend** (`frontend/`, Next.js 16 App Router, npm) is *already* route-separated: `app/[locale]/admin/` (25 pages, own RBAC-guarded layout), `app/[locale]/(user)/` (16 pages), `app/[locale]/(auth)/` (user portal's login/register/forgot-password — `admin/login` is its own separate page, not shared with `(auth)`). Everything talks to one backend through one proxy route (`app/api/proxy/[...path]/route.ts` → `helpers/backendUrl.ts`).
- **Backend** (`backend/app/`, FastAPI, SQLAlchemy, no Alembic — ~90 idempotent `ALTER TABLE` statements run inline at import time in `main.py`) has 28 routers. Most are cleanly admin-only or user-only; five are mixed (`mt5_accounts.py`, `referrals.py`, `withdrawal_requests.py`, `forum.py`, `brokers.py`) and need splitting within the file. `require_roles()` is copy-pasted in 19 router files. `auth.py`'s `/login` already has the split's real seam: a `portal` field, verified in code (`backend/app/routers/auth.py:320-352`) — admin-role accounts can only log in on `portal="admin"`, plain users only on `portal="user"`, and `role="client"` accounts can use **either** (this cross-portal case is the one place the split can silently change behavior — flagged for explicit testing below).
- **`signals-service/worker/index.ts`** is cron-only today — its `fetch()` handler is a static placeholder (verified: lines 59-64 return a fixed string). CRM/User backends need real HTTP proxying, which is new code, not a copy of this file.

Goal of this plan: strangler-fig migration — working software at every step, old monolith and new split running in parallel, cutover only after verified parity, and every phase individually revertable until the final decommission.

## Phase 0 — Safety net (no code changes) — ✅ DONE

- Tag `main` as `pre-split-baseline` for rollback. — **done, tag exists.**
- Build a parity fixture: script every one of the ~132 backend endpoints against seeded data and snapshot responses (`backend/tests/` currently only covers 3 files, so this fixture — not the existing suite — is the real regression oracle for the rest of the plan). Store outside any deploy path — **done: `tools/parity/backend_snapshot.py`.**
- Smoke-script the 44 frontend pages (25 admin + 16 user + 3 auth) — one render + one write action each. — **done: `tools/parity/frontend_smoke_checklist.md`** (checklist form, not yet run).

## Phase 1 — Monorepo scaffolding, zero behavior change — IN PROGRESS

- `git mv frontend apps/frontend`; add root `pnpm-workspace.yaml` (`packages: ["apps/*", "packages/*"]`) and root `package.json`. — **staged/created, not yet committed.**
- Convert `apps/frontend` from npm to pnpm (`package-lock.json` → `pnpm-lock.yaml`); verify `pnpm --filter frontend dev` behaves identically on port 5000. — **remaining.**
- Create empty skeletons only: `crm-backend/app/`, `user-backend/app/`, `backend-shared/backend_shared/` — not wired into anything yet. — **remaining.**

## Phase 2 — Extract `backend-shared/`, backend still single-deployed
Prove the shared-code boundary by making the *existing* monolith consume it first.
- Move into `backend-shared/backend_shared/`: `database.py`, all 28 model files, all 25 schema files, the 9 service files (`r2_storage.py`, `cloudflare_kv.py`, `stripe_client.py`, `metaapi_*`, `copyfactory_*`, `rebate_calculation.py`, `withdrawal.py`), the 14 util files.
- New `backend_shared/auth/rbac.py`: single `require_roles()` replacing all 19 copies.
- New `backend_shared/auth/login_service.py`: the portal-aware authenticate logic extracted from `auth.py:320-352` as plain functions (routers stay per-service in Phase 3).
- New `backend_shared/migrations.py`: the entire inline `ALTER TABLE` block from `main.py`, wrapped in a Postgres advisory lock (`pg_advisory_lock`). This is required, not optional — once both new services call it independently at cold start, concurrent DDL against the same shared Postgres can race. Prove the wrapped version is behaviorally identical here, before two callers exist.
- `backend/` imports from `backend_shared` instead of its local copies; `requirements.txt` gets a `-e ../backend-shared` path dependency.
- **Verify**: rerun the Phase 0 parity fixture — must match byte-for-byte. Run `run_startup_migrations()` twice against a scratch DB to confirm the lock wrap didn't break idempotency.

## Phase 3 — Stand up `crm-backend/` and `user-backend/` (staging DB only, no prod traffic)
- Scaffold both from the `signals-service/` template (`app/`, `worker/`, `wrangler.toml`, `Dockerfile`, `requirements.txt` = backend's deps + `-e ../backend-shared`).
- Move (git mv) unambiguous routers:
  - **crm-backend**: `clients.py, campaigns.py, articles.py, analysis.py, ad_banners.py, broker_placements.py, seo_meta.py, symbol_categories.py, rebate_payouts.py, media.py, market_prices.py, broker_reports.py, plays.py, copy_traders.py, visits.py, users.py`
  - **user-backend**: `copy_subscriptions.py, notifications.py, billing.py`
  - `public.py`, `geo.py` → duplicated into both (anonymous, consumed by both portals).
  - `internal.py` → `/purge-cache` duplicated into both; `/sync-metaapi`, `/keep-alive-copytrading`, `/sync-subscriptions` → user-backend only (all touch mt5/copyfactory/stripe).
- Split the 5 mixed files (grep `@router\.` in each first to get authoritative endpoint lists before moving):
  - `mt5_accounts.py`: `/me*` → user-backend; `/admin`, `/active-count` (read-only) → duplicated into crm-backend.
  - `referrals.py`: `/me*` → user-backend; `/admin/stats` → crm-backend.
  - `withdrawal_requests.py`: `/me` create/list → user-backend; review/approve/reject → crm-backend.
  - `forum.py`: full CRUD → user-backend; moderation-only endpoints → duplicated into crm-backend.
  - `brokers.py`: full CRUD → crm-backend; read-only list/detail + rating submission → duplicated into user-backend.
- `auth.py` becomes two thin routers calling `backend_shared.auth.login_service`: crm-backend gets `/login` (admin), `/forgot-password`, `/reset-password`, `/change-password` — no `/register` (self-registration always creates `role="user"`). user-backend gets the full set including `/register` and OTP. Both must share the same JWT secret so a token minted by either is valid on both (needed for the `role="client"` dual-portal case).
- Deploy both to a **staging** environment against a staging Postgres — production DB is untouched through this phase.
- **Verify**: parity fixture against staging for each service's routes; explicitly test an admin JWT rejected by user-backend's admin-only endpoints (same 403 shape as today), and a `role="client"` JWT working against both services' `/login`; run both services' migration function back-to-back against a fresh staging DB to confirm the advisory lock holds under near-simultaneous cold start.

## Phase 4 — Cloudflare wiring per service
- `wrangler.toml` for each, modeled on `signals-service/wrangler.toml` (`[[containers]]`, `[[durable_objects.bindings]]`, `[[migrations]] new_sqlite_classes`) — no `[triggers]` cron block, these are request-driven.
- `worker/index.ts` for each: **new** `fetch()` handler forwarding arbitrary method/path/body into the container via `getContainer(env.X_CONTAINER).fetch(request)` — unlike `signals-service`'s cron-only placeholder. Verify the exact `@cloudflare/containers` forwarding API at implementation time (the signals-service file's own comment flags this SDK as still-evolving).
- `Dockerfile` for each: copy `signals-service/Dockerfile`'s structure, with the real backend dependency set; resolve the `backend-shared` sibling-folder build-context question once, apply identically to both.
- Secrets: `DATABASE_URL` (shared Postgres, same as today), JWT secret on both, MetaApi/Stripe sync keys on user-backend only.
- Still pointed at staging DB.
- **Verify**: `wrangler deploy --dry-run`, then real staging deploy, rerun the parity fixture against the live staging URLs (catches container/DO-specific issues — header stripping, file-upload streaming for `media.py`/R2).

## Phase 5 — Extract `packages/frontend-shared`, frontend still single-deployed
Mirror of Phase 2 for the frontend.
- Move the 51 live components (of 59 total — 8 are dead code: `Table, Form, Pagination, StatusLabel, DateFilter, SearchInput, DropownFilter, Icon`; confirm dead-ness with a final grep before deleting, don't just trust the earlier scan), `contexts/`, `helpers/`, `i18n/`, `messages/`, `styles/` into `packages/frontend-shared/src/`.
- Prefer package export subpaths that match the existing `@/` alias shape so `apps/frontend`'s import statements don't need to change — minimizes the diff on the app still serving 100% of traffic.
- **Verify**: rerun the Phase 0 frontend smoke script against `apps/frontend`, confirm build output is equivalent.

## Phase 6 — Stand up `apps/crm-frontend` and `apps/user-frontend` (staging backends, not yet prod)
- `apps/crm-frontend`: git mv `app/[locale]/admin/` (25 pages) + its own `app/api/proxy/[...path]/route.ts` pointed at crm-backend.
- `apps/user-frontend`: git mv `app/[locale]/(user)/` (16 pages) + `app/[locale]/(auth)/` (login/register/forgot-password) + its own proxy route pointed at user-backend.
- Auth routing needs no new abstraction: `admin/login` is already its own self-contained page (doesn't reuse `(auth)/login`), so this is a clean move, not a shared-wrapper redesign. Confirm `LoginModal` (in frontend-shared) is never imported from admin pages before assuming it's user-only.
- `backendUrl.ts` already reads `BACKEND_URL` from env with no hardcoding — per-app env var is enough, no code change needed there.
- Read `apps/frontend/app/[locale]/layout.tsx` (the true root layout, above both `admin/` and `(user)/`) before duplicating it, to confirm which chrome is shared vs sub-layout-owned.
- **Verify**: split smoke script (25 admin pages against crm-frontend, 16 user + 3 auth pages against user-frontend), both against staging backends. Explicitly test the `role="client"` cross-portal case end-to-end, and flag to the user: physically separating the apps may turn what was previously an in-app view into a cross-origin navigation for that one user type, depending on final domain strategy — this is the one place "identical UI/UX" needs a conscious decision rather than an assumption.

## Phase 7 — Cutover (staging → production, per-service, independently reversible)
1. **Backend first**: point crm-backend/user-backend wrangler configs at the *production* Postgres (safe — same schema/data, just two more clients), deploy to production Cloudflare, soak-monitor before proceeding. Prefer letting the new frontends (Phase 6, already single-backend by design) do the actual traffic cutover rather than bridging the old monolith's proxy route to dual-route by path prefix — avoids writing throwaway bridge code.
2. **Frontend, per portal, independently**: cut the admin route/subdomain to `apps/crm-frontend` first (lower volume, easier rollback), soak, then cut the user portal to `apps/user-frontend`.
3. Leave `apps/frontend` and `backend/` deployed but receiving zero traffic for a bake period — rollback at this stage is a routing revert, not a code revert, and there's zero data-loss risk since both old and new point at the same DB throughout.

## Phase 8 — Decommission
- Remove old deploy pipelines first (infra-only), confirm clean, *then* in a separate change `git rm -r apps/frontend backend/` (history is preserved either way).
- Update `README.md`/`AGENTS.md`/`CLAUDE.md`/`docs/` references.
- Treat this phase as effectively irreversible — gate it on an explicit go-ahead after the bake period, not just "no errors yet."

## Key non-obvious calls this plan makes explicit
- Migration-block race risk solved with a Postgres advisory lock, not a "one service owns migrations" convention (avoids a hidden deploy-order dependency).
- `require_roles()`: 19 copies → 1 shared dependency.
- `auth.py` split: shared functions, duplicated thin routers; crm-backend drops `/register` entirely.
- Mixed-file splits move the user-owned half, duplicate the admin-owned read/moderation half — same DB, same models, no behavior change, only which process serves it.
- `worker/index.ts`'s `fetch()` handler is new code for both services — the one place this plan isn't a lift-and-shift from `signals-service`.
- The `role="client"` dual-portal case and the frontend's cross-origin-navigation seam are called out explicitly rather than silently assumed away.

## Verification approach throughout
Given `backend/tests/` only covers 3 of ~132 endpoints, the Phase 0 parity fixture (response-shape snapshots against seeded data) is the real regression oracle for every phase — not the existing test suite. Frontend parity uses a scripted smoke pass over all 44 pages. Every phase has a stated rollback point; nothing is one-way until Phase 8.

### Critical files referenced
- `backend/app/main.py` — inline migration block to extract
- `backend/app/routers/auth.py` — portal-aware login logic (lines ~320-352)
- `signals-service/worker/index.ts` — hosting precedent (cron-only today, needs a new fetch handler for the two new services)
- `signals-service/wrangler.toml` — Cloudflare Container/DO config precedent
- `frontend/app/api/proxy/[...path]/route.ts`, `frontend/helpers/backendUrl.ts` — API routing, already split-ready
- `frontend/helpers/roles.ts` — RBAC source of truth, must stay in sync with backend

## Progress log

- 2026-09-03: Discovered this plan had drifted out of sync with a separate,
  less-detailed plan drafted earlier the same session before this file was
  found. Resumed from here per user's explicit choice. Checked this copy into
  the repo (this file) so it stops living only in `~/.claude/plans/`.
