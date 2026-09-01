# cbfx-signals-service

Standalone service that generates AI trading signals for gold (XAU/USD) and inserts them into the **same Postgres database** the main `cbfx` app uses — into the existing `plays` table, alongside manually-created plays. Runs as a Cloudflare Container, driven by Cloudflare Worker Cron Triggers (see `../GOLD_SIGNALS_ARCHITECTURE.md` for the full design).

## What it does

- **Every 30 minutes** (`POST /tasks/generate`): for each of Scalp/Swing/Long-term, if that strategy hasn't hit its daily signal count yet (3/1/1), fetches recent XAU/USD candles from Twelve Data and asks Gemini for a trade setup. Only inserts it as a new `open` play if Gemini rates it **"High"** confidence and it isn't too similar (same direction, entry price within 0.5%) to an already-open signal of the same strategy.
- **Every 10 minutes** (`POST /tasks/monitor`): scans every open, AI-generated XAU/USD play. Closes it as `close_reason="hit"` or `"miss"` the moment real price mechanically reaches its take_profit/stop_loss. If neither has been reached yet, asks Gemini whether the original thesis still holds given fresh candles — cancels it early as `close_reason="market_shift"` if the model says the setup has clearly broken down.

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
```

## Deploying to Cloudflare Containers

**Verify the exact config/SDK surface against Cloudflare's current Containers docs before deploying** — this is a newer product and both `wrangler.toml`'s `[[containers]]`/`durable_objects`/`migrations` sections and the `@cloudflare/containers` package's `getContainer` helper used in `worker/index.ts` could not be fully verified while this was built; the fallback manual Durable Object pattern is commented in `worker/index.ts` if `getContainer` doesn't exist in the version you install.

```bash
npm install
wrangler secret put DATABASE_URL
wrangler secret put TWELVE_DATA_API_KEY
wrangler secret put GEMINI_API_KEY
wrangler secret put TASK_AUTH_TOKEN
wrangler deploy
```

The container image is built from `Dockerfile` per `wrangler.toml`'s `image = "./Dockerfile"`. Secrets set via `wrangler secret put` are passed through to the container as environment variables — confirm this against current docs too, since how a Worker's secrets reach its bound container is part of the same evolving surface.

## Extending to more symbols

`app/config.py`'s `TWELVE_DATA_SYMBOL`/`PAIR` are single constants by design (single-symbol MVP). Adding a second symbol means parameterizing `run_generate_job`/`run_monitor_job` by symbol and looping over a list, not duplicating the pipeline files.
