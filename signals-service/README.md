# cbfx-signals-service

Standalone service that generates AI trading signals for gold (XAU/USD) and inserts them into the **same Postgres database** the main `cbfx` app uses — into the existing `plays` table, alongside manually-created plays. Runs as a Cloudflare Container, driven by Cloudflare Worker Cron Triggers (see `../GOLD_SIGNALS_ARCHITECTURE.md` for the full design).

## What it does

- **Every 30 minutes** (`POST /tasks/generate`): for each of Scalp/Swing/Long-term, if that strategy hasn't hit its daily signal count yet (3/1/1), fetches recent XAU/USD candles from Twelve Data and asks Gemini for a trade setup. Only inserts it as a new `open` play if Gemini rates it **"High"** confidence and it isn't too similar (same direction, entry price within 0.5%) to an already-open signal of the same strategy.
- **Every 5 minutes** (`POST /tasks/monitor`): scans every open, AI-generated XAU/USD play. Closes it as `close_reason="hit"` or `"miss"` the moment real price mechanically reaches its take_profit/stop_loss. If neither has been reached yet, asks Gemini whether the original thesis still holds given fresh candles — cancels it early as `close_reason="market_shift"` if the model says the setup has clearly broken down.
- **Once daily at 6pm America/New_York** (`POST /tasks/analysis`): publishes one daily market-analysis `Article` + `Analysis` row for XAU/USD. Used to run opportunistically inside the generate job (gated by a 24h dedupe window); now has its own predictable schedule — see `app/pipeline/analysis.py`. Cloudflare Cron Triggers are UTC-only with no DST awareness, so `wrangler.toml` schedules both UTC times 6pm ET can fall on (22:00 during EDT, 23:00 during EST) and `worker/index.ts` checks the real America/New_York wall-clock hour at runtime to fire only the one that currently matches.

This service **never creates or migrates tables** — `app/models.py` is a minimal mirror of two tables the main backend already owns and maintains (`plays`, `users`); schema changes to those tables happen in `backend/app/main.py`/`backend/app/models/`, not here.

## Local development

```bash
cd signals-service
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env  # fill in real values
uvicorn app.main:app --reload --port 8080
```

Trigger a job manually:
```bash
curl -X POST http://localhost:8080/tasks/generate -H "Authorization: Bearer $TASK_AUTH_TOKEN"
curl -X POST http://localhost:8080/tasks/monitor -H "Authorization: Bearer $TASK_AUTH_TOKEN"
curl -X POST http://localhost:8080/tasks/analysis -H "Authorization: Bearer $TASK_AUTH_TOKEN"
```

## Deploying to Cloudflare Containers

**Live**: https://cbfx-signals-service.tradeversesocial.workers.dev — deployed 2026-09-05. The Worker's `fetch()` is deliberately a static placeholder response with no route into the container (see `worker/index.ts`) — these task endpoints move money-adjacent data and call paid APIs, so unlike `crm-backend`/`user-backend` there is no public path to them at all, cron-only.

```bash
npm install
wrangler secret bulk .env   # pushes DATABASE_URL/TWELVE_DATA_API_KEY/GEMINI_API_KEY/GEMINI_MODEL/TASK_AUTH_TOKEN in one go
wrangler deploy --dry-run   # validates config + builds locally, no deploy
wrangler deploy              # the real deploy
```

**`wrangler secret put`/`secret bulk` only sets secrets on the Worker — it does NOT automatically become the container's own process environment** (a separate Docker sandbox, same gotcha `crm-backend`/`user-backend` hit first). `worker/index.ts`'s `SignalsContainer` class has an explicit constructor wiring every secret from the Worker's own `env` into `this.envVars` — verified working on this service's first deploy (no repeat of the debugging cycle needed for `user-backend`).

`TASK_AUTH_TOKEN` must be a real random secret, not the `.env.example` placeholder — these endpoints call paid APIs and touch the shared production DB, so a guessable shared secret is a real risk once this is a public Worker.

## Extending to more symbols

`app/config.py`'s `TWELVE_DATA_SYMBOL`/`PAIR` are single constants by design (single-symbol MVP). Adding a second symbol means parameterizing `run_generate_job`/`run_monitor_job` by symbol and looping over a list, not duplicating the pipeline files.
