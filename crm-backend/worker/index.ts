// Cloudflare Worker: forwards every incoming request straight into the
// container, unchanged (method, path, headers, body). Unlike
// signals-service's fetch() (a static cron-job placeholder — its real work
// runs on a schedule), this service is request-driven: crm-frontend's
// proxy route sends every admin-portal API call here directly.
//
// NOTE: `getContainer` is the current @cloudflare/containers helper for
// "get this binding's singleton instance and forward a request to it" —
// verify against @cloudflare/containers' current README when running
// `npm install`/`wrangler deploy`, since this SDK is still evolving and the
// exact helper name/signature could not be independently confirmed here
// (same caveat signals-service/worker/index.ts already carries). If it's
// changed, the fallback is the manual Durable Object pattern:
//   const id = env.CRM_BACKEND_CONTAINER.idFromName("singleton");
//   const stub = env.CRM_BACKEND_CONTAINER.get(id);
//   await stub.fetch(request);
import { Container, getContainer } from "@cloudflare/containers";

export class CrmBackendContainer extends Container {
  defaultPort = 8080;
  // No cron to bound cold starts against (unlike signals-service) — this is
  // a plain idle timeout for a request-driven service.
  sleepAfter = "15m";

  override onStart() {
    console.log("crm-backend container started");
  }
  override onStop() {
    console.log("crm-backend container stopped");
  }
  override onError(error: unknown) {
    console.log("crm-backend container error:", error);
  }
}

interface Env {
  CRM_BACKEND_CONTAINER: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const container = getContainer(env.CRM_BACKEND_CONTAINER);
    return container.fetch(request);
  },
};
