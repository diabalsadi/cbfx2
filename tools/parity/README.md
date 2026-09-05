# Phase 0 parity tooling

Regression oracle for the CRM/User split (see `.claude/plans` split plan).
`backend/tests/` only covers 3 files out of ~132 endpoints, so this is the
real safety net for every later phase — not the existing test suite.

## Backend: `backend_snapshot.py`

Auto-snapshots every safe, parameter-free GET endpoint via the running
app's OpenAPI schema. Deliberately does **not** touch:
- Write endpoints (POST/PUT/PATCH/DELETE) — need curated payloads, listed
  under `skipped_needs_params` in its output for you to fill in by hand.
- Anything touching Stripe, MetaApi/CopyFactory, or outbound email — listed
  under `skipped_external`. Auto-invoking these with synthetic data risks
  real charges, real MT5 connections, or real emails to real users. Verify
  these manually or against mocked external services instead.

You run the backend and seed the DB yourself; the script only makes HTTP
GET calls to whatever's already running.

```
python tools/parity/backend_snapshot.py --base-url http://localhost:8000 \
    --admin-token <jwt> --user-token <jwt> --out snapshot_before.json
```

Rerun with a new `--out` after each phase and diff against the previous
snapshot — every safe route must match byte-for-byte.

## Frontend: `frontend_smoke_checklist.md`

Manual/scriptable checklist of all 44 pages (25 admin + 16 user + 3 auth)
plus the one cross-portal case (`role="client"`) the split plan flags as
the place "identical UI/UX" needs a conscious decision, not an assumption.
