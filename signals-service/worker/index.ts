// Cloudflare Worker: drives the container's three task endpoints on a
// schedule via Workers Cron Triggers (see wrangler.toml [triggers]).
//
// NOTE: `getContainer` is the current @cloudflare/containers helper for
// "get this binding's singleton instance and forward a request to it" —
// verify against @cloudflare/containers' current README when running
// `npm install`/`wrangler deploy`, since this SDK is still evolving and the
// exact helper name/signature could not be independently confirmed here.
// If it's changed, the fallback is the manual Durable Object pattern:
//   const id = env.SIGNALS_CONTAINER.idFromName("singleton");
//   const stub = env.SIGNALS_CONTAINER.get(id);
//   await stub.fetch(...)
import { Container, getContainer } from "@cloudflare/containers";

interface Env {
  SIGNALS_CONTAINER: DurableObjectNamespace;
  DATABASE_URL: string;
  TWELVE_DATA_API_KEY: string;
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  TASK_AUTH_TOKEN: string;
  // Optional — app/config.py defaults all three to "" when unset, which
  // just skips the post-run cache-purge call (logged, not fatal).
  BACKEND_BASE_URL?: string;
  METAAPI_SYNC_KEY?: string;
  METAAPI_SYNC_SECRET?: string;
}

export class SignalsContainer extends Container {
  defaultPort = 8080;
  // Cron hits this at least every 5 minutes, well inside this window, so
  // the container should almost never need a cold start mid-schedule.
  sleepAfter = "15m";

  // `wrangler secret put`/`secret bulk` sets secrets on the Worker's own
  // env — that does NOT automatically become the container's process
  // environment (a separate Docker sandbox). Without this, app/config.py's
  // `os.environ["DATABASE_URL"]` (and friends) crash the FastAPI app
  // immediately on startup, surfacing as an opaque "Failed to start
  // container" error with no indication env vars were the cause (confirmed
  // the hard way on user-backend's/crm-backend's first deploys).
  envVars: Record<string, string>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.envVars = {
      DATABASE_URL: env.DATABASE_URL,
      TWELVE_DATA_API_KEY: env.TWELVE_DATA_API_KEY,
      GEMINI_API_KEY: env.GEMINI_API_KEY,
      GEMINI_MODEL: env.GEMINI_MODEL,
      TASK_AUTH_TOKEN: env.TASK_AUTH_TOKEN,
      BACKEND_BASE_URL: env.BACKEND_BASE_URL ?? "",
      METAAPI_SYNC_KEY: env.METAAPI_SYNC_KEY ?? "",
      METAAPI_SYNC_SECRET: env.METAAPI_SYNC_SECRET ?? "",
    };
  }

  override onStart() {
    console.log("Signals container started");
  }
  override onStop() {
    console.log("Signals container stopped");
  }
  override onError(error: unknown) {
    console.log("Signals container error:", error);
  }
}

async function callTask(env: Env, path: string): Promise<void> {
  const container = getContainer(env.SIGNALS_CONTAINER);
  const res = await container.fetch(`http://container${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.TASK_AUTH_TOKEN}` },
  });
  console.log(`${path} -> ${res.status}: ${await res.text()}`);
}

// Cloudflare cron is UTC-only with no DST awareness — 6pm America/New_York
// is 22:00 UTC (EDT, Mar-Nov) or 23:00 UTC (EST, Nov-Mar). Both candidate
// UTC times are scheduled in wrangler.toml; this checks the real
// America/New_York wall-clock hour so only the one that currently matches
// 6pm local actually fires the job, and the other is a no-op.
function isSixPmEastern(): boolean {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  }).format(new Date());
  return hour === "18";
}

export default {
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    // The 30-minute and 5-minute expressions overlap at every :00/:30 —
    // scheduled() fires once per matching expression, so both can invoke in
    // the same minute. The monitor job is idempotent (re-checking an
    // already-closed signal is a no-op), so an occasional double-run is
    // harmless; it's dispatched on every tick this handler receives.
    if (controller.cron === "*/30 * * * *") {
      await callTask(env, "/tasks/generate");
    } else if (controller.cron === "0 22 * * *" || controller.cron === "0 23 * * *") {
      if (isSixPmEastern()) {
        await callTask(env, "/tasks/analysis");
      }
      return;
    }
    await callTask(env, "/tasks/monitor");
  },

  async fetch(): Promise<Response> {
    return new Response(
      "cbfx-signals-service worker — jobs run on a cron schedule, see wrangler.toml [triggers]",
      { status: 200 },
    );
  },
};
