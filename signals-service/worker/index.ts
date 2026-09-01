// Cloudflare Worker: drives the container's two task endpoints on a
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

export class SignalsContainer extends Container {
  defaultPort = 8080;
  // Cron hits this at least every 10 minutes, well inside this window, so
  // the container should almost never need a cold start mid-schedule.
  sleepAfter = "15m";

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

interface Env {
  SIGNALS_CONTAINER: DurableObjectNamespace;
  TASK_AUTH_TOKEN: string;
}

async function callTask(env: Env, path: string): Promise<void> {
  const container = getContainer(env.SIGNALS_CONTAINER);
  const res = await container.fetch(`http://container${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.TASK_AUTH_TOKEN}` },
  });
  console.log(`${path} -> ${res.status}: ${await res.text()}`);
}

export default {
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    // Both cron expressions fire at :00/:30 (they overlap) — the monitor
    // job runs on every tick regardless of which expression fired; it's
    // idempotent (re-checking an already-closed signal is a no-op), so the
    // occasional double-run at :00/:30 is harmless. The generate job only
    // runs on the 30-minute expression.
    if (controller.cron === "*/30 * * * *") {
      await callTask(env, "/tasks/generate");
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
