# Gold (XAU/USD) AI Signals Service — Architecture

**Goal:** a standalone service that automatically generates AI-analyzed trading signals for gold (XAU/USD) across three strategies (Scalp/Swing/Long-term), inserts high-confidence ones into the same `plays` table the main app already shows on `/plays` and the homepage, and automatically closes them (hit/miss/cancelled) as price moves or the underlying thesis breaks down.

**Status:** built (2026-09-02), not yet deployed. This is a superseding, single-symbol, Twelve-Data-based redesign of the stashed BTC/MetaTrader5 "ai signals" pipeline (`git stash show -p stash@{0}` — never merged) — same core concept (Gemini-analyzed candles → `Play` rows), different data source and deployment shape.

---

## 1. Why a separate service, not part of the main backend

The main `backend/` FastAPI app has no built-in scheduler and isn't meant to run background jobs on its own request cycle. This is a genuinely independent workload — its own data source (Twelve Data, not MetaApi/MT5), its own schedule (30-min/10-min cron), its own failure domain (a bad Gemini call shouldn't affect the main app) — so it's a separate Python project (`signals-service/`) that happens to write into the same database.

It **shares the `plays` table** with the main app rather than using its own table, per explicit decision: AI-generated GOLD signals should appear in the same public-facing feed as human-curated plays (EUR/USD, GBP/JPY, etc.), distinguished by `author_email` and the new `confidence`/`close_reason` columns, not siloed elsewhere.

---

## 2. High-level flow

```
Cloudflare Worker Cron Trigger (*/30 and */10 * * * *, see §5)
        │
        ├─ every 30 min ──► POST /tasks/generate  (signals-service/app/pipeline/generate.py)
        │                        │
        │                        ▼
        │                   For each of Scalp/Swing/Long-term, if under today's
        │                   daily target (3/1/1):
        │                     Twelve Data time_series (1h/4h/1day) ──► Gemini
        │                     analysis ──► signal (or null) + confidence
        │                        │
        │                        ▼
        │                   confidence == "High" AND not a duplicate of an
        │                   already-open signal of the same strategy?
        │                        │ yes
        │                        ▼
        │                   INSERT Play(status="open", confidence, author_email=
        │                   ai-gold-signals@cbfx.com) into the SAME plays table
        │                   the main app reads
        │
        └─ every 10 min ──► POST /tasks/monitor  (signals-service/app/pipeline/monitor.py)
                                 │
                                 ▼
                            SELECT open plays where pair=XAU/USD AND
                            author_email=ai-gold-signals@cbfx.com
                                 │
                                 ▼
                            Twelve Data /price (1 call, shared across all
                            open signals) ──► has price hit take_profit or
                            stop_loss?
                                 │ no                      │ yes
                                 ▼                          ▼
                            Gemini: does the        UPDATE status="closed",
                            original thesis          close_reason="hit"|"miss",
                            still hold given          closed_at=now
                            fresh candles?
                                 │ no
                                 ▼
                            UPDATE status="cancelled",
                            close_reason="market_shift", closed_at=now
```

---

## 3. Data model changes (on the main app's existing `plays` table)

Two new nullable columns, added via the main backend's existing no-migration-runner convention (`backend/app/main.py`'s idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` block — see `backend/app/models/play.py` for the SQLAlchemy side):

```python
close_reason = Column(String, nullable=True)  # "hit" | "miss" | "market_shift" | null
confidence = Column(String, nullable=True)    # "High" | "Medium" | "Low" | null
```

**No `status` vocabulary change** — `open`/`closed`/`cancelled` stays exactly as the main app already uses it (explicit decision: keep this additive, don't touch the main app's existing plays router/schema/seed data/Plays page UI). `close_reason` is the new "why," orthogonal to `status`. A manually-created play has both columns `null`.

**No new timestamp column** — `Play` already has `created_at`, `opened_at`, and `updated_at` (all auto-set); nothing new was needed there once that was checked against the actual model.

`signals-service/app/models.py` keeps its own minimal SQLAlchemy mirror of `plays`, `users`, `analysis`, and `articles` (just the columns it touches) — it's a separate Python project that can't import `backend/app`, and it never creates or alters tables itself; the main backend owns that.

### 3.1 Daily market analysis (restored, 2026-09-02)

Originally scoped out (§8 used to list this as out-of-scope), then added back on request. Once per `ARTICLE_DEDUPE_WINDOW_HOURS` (24h) window — checked *before* calling Gemini, not after, since `run_generate_job` runs every 30 min and calling Gemini on the other 47 runs/day just to discard the result would be wasted cost — the generate job also:
1. Fetches `1day` XAU/USD candles (same interval Long-term already uses).
2. Asks Gemini for a market-commentary piece (`generate_daily_analysis`, SMC-framed like the signal prompts, but explicitly no trade signal/entry-exit levels).
3. Inserts one `Analysis` row (`pair`, `timeframe`, `bias`, `summary`) and one published `Article` row (`article_type="analysis"`, `market_category="metals"`, `symbol="XAU/USD"`) — the same `Article` feed that powers `/analysis` and the homepage's latest-news section for every other article in the app.

This differs from the stashed BTC pipeline's version, which called Gemini for this on every run (harmless there since that pipeline ran once/day) and only deduped the `Article` publish, not the Gemini call itself.

---

## 4. Strategy configuration

| Strategy | Candle interval (Twelve Data) | Signals/day target | Concurrency |
|---|---|---|---|
| Scalp | `1h` | 3 | Multiple can be open at once, up to the daily count |
| Swing | `4h` | 1 | " |
| Long-term | `1day` | 1 | " |

- **Daily target** resets on the UTC calendar day, counted from `Play.created_at` (not a separate counter table).
- **Duplicate rejection**: a new candidate signal for a strategy is rejected if its direction matches, and its entry_price is within **0.5%** of, an already-**open** signal of the same strategy — this is what lets 3 concurrent Scalp signals coexist without 2 of them being near-identical bets.
- **Confidence gate (revised 2026-09-02, twice)**: `confidence` was originally a `"High"|"Medium"|"Low"` label (only `"High"` inserted); it's now an **integer 0-100** (`SignalOutput.confidence`, `CONFIDENCE_THRESHOLD = 70` in `config.py`) — only signals scoring `>= 70` are inserted. Stored on `Play.confidence` as the string form (e.g. `"78"`); the column stays `String` (no schema/type migration) since the main app already has a handful of legacy rows holding the old `"High"/"Medium"/"Low"` labels from before this change — both formats can coexist, the column's *meaning* changed, not its DB type.
- **Calibration history**: the first live run returned "Medium" (the old 3-tier scale) on all three strategies. The prompt at the time told the model "most real setups are Medium or Low — do not inflate this," which anchors toward the middle regardless of the actual chart — a real risk of chronically under-producing against the daily target since only the top tier ever inserted. Fixed by replacing the anchoring language with an objective rubric: count of 5 specific aligned SMC factors (liquidity sweep, order block, BOS/CHoCH, FVG, premium/discount) mapped to score bands, so the model judges each setup on its own merits instead of a stated prior about the expected distribution. The exact `CONFIDENCE_THRESHOLD` cutoff (70) is deliberately never mentioned in the prompt itself, for the same reason — telling the model the pass/fail line invites scores clustering right at it.
- **Analysis framework**: both prompts (`app/clients/gemini_client.py`) explicitly instruct Gemini to analyze via Smart Money Concepts (SMC) — market structure (BOS/CHoCH), liquidity (buy-side/sell-side, sweeps), order blocks, fair value gaps/imbalance, and premium/discount zones — rather than lagging indicators. "High" confidence requires multiple SMC elements to line up, not just one in isolation. The validity re-check (§2) re-evaluates through the same SMC lens the original signal was built on, so an early cancellation is judged by the same framework, not a different one.

---

## 5. Deployment: Cloudflare Containers + Worker Cron Triggers

Originally scoped as "one long-running process with an internal scheduler" (e.g. APScheduler) — **changed** once Cloudflare Containers' actual model was checked: containers there are wrapped in a Durable Object with a `sleepAfter` idle timeout and are fundamentally request-driven, not a bare persistent background loop. A self-scheduling process with no inbound traffic would just go to sleep.

**Resulting design:** the Python service (`signals-service/app/main.py`) is a small FastAPI app with two auth-gated endpoints, `POST /tasks/generate` and `POST /tasks/monitor`, running the exact same pipeline logic either way. A Cloudflare Worker (`signals-service/worker/index.ts`) registers two native Cron Triggers (`*/30 * * * *`, `*/10 * * * *`) and calls into the container over HTTP on each tick — Cloudflare's own cron infrastructure drives the schedule instead of the container self-sustaining one.

**Flagged for verification at deploy time** (noted in `signals-service/README.md` too): the exact `wrangler.toml` `[[containers]]`/`durable_objects`/`migrations` schema and the `@cloudflare/containers` package's `getContainer()` helper are based on Cloudflare's docs as of this build, but Containers is a newer, fast-moving product — confirm both against current docs before `wrangler deploy`. None of the actual signal-generation logic depends on this being exactly right; only the trigger mechanism does.

---

## 6. Auth between the Worker and the container

`/tasks/generate` and `/tasks/monitor` require `Authorization: Bearer $TASK_AUTH_TOKEN` — a shared secret set via `wrangler secret put TASK_AUTH_TOKEN` on the Worker side and `TASK_AUTH_TOKEN` in the container's env. These endpoints move data and call two paid APIs (Twelve Data, Gemini), so they must not be publicly callable by anyone who finds the container's URL.

---

## 7. Public cache invalidation

`/public/homepage` (and any other `/public/*` endpoint reading `plays`) is backed by `public_cache` (`backend/app/utils/cache.py`, Cloudflare KV, `PUBLIC_CACHE_TTL_SECONDS` = 30 min). The main app's own routers all call `purge_public_cache()` after mutating anything cache-visible — but this service writes `plays` rows straight into the shared database via its own SQLAlchemy session, bypassing those routers entirely, so nothing would trigger that purge.

Fix: a new `POST /internal/purge-cache` endpoint (`backend/app/routers/internal.py`), reusing the same `X-Sync-Key`/`X-Sync-Secret` auth as the existing MetaApi sync cron endpoints. `signals-service/app/clients/backend_client.py` calls it once at the end of `run_generate_job()` (only if a signal was actually created) and `run_monitor_job()` (only if any signal's status actually changed) — best-effort, same failure mode as the main app's own `purge_public_cache()`: a failed purge just means the change sits behind the TTL a little longer, never worth failing the job over.

---

## 8. What's explicitly out of scope for this build

- **More than one symbol.** `signals-service/app/config.py`'s `TWELVE_DATA_SYMBOL`/`PAIR` are single constants by design. Extending to more symbols later means parameterizing the pipeline functions, not copy-pasting them.
- **Reworking the stash's `open/closed/cancelled` → `active/cancel/hit/loss` status vocabulary** — explicitly declined; this build keeps the main app's current status values untouched.

---

## 9. Verification checklist (once deployed)

1. `curl -X POST .../tasks/generate` manually (with the bearer token) and confirm it either inserts a `Play` row with `confidence="High"` or logs a clear skip reason (`no_setup` / `confidence_medium` / `duplicate` / `daily_target_reached`).
2. Confirm a newly-inserted signal shows up on the main app's `/plays` page and homepage "open plays" widget (same table, same queries — no main-app code changes needed for it to appear).
3. `curl -X POST .../tasks/monitor` and confirm it closes a test signal correctly when price data crosses its take_profit/stop_loss (`close_reason="hit"`/`"miss"`), and leaves still-open ones alone.
4. Manually verify the Worker's cron triggers fire on schedule via `wrangler tail` after deploy.
5. After a generate/monitor run that changes a signal, confirm `/public/homepage`'s `open_plays` reflects it immediately rather than after `PUBLIC_CACHE_TTL_SECONDS` — this confirms the `/internal/purge-cache` call (§7) actually reached the main backend.
