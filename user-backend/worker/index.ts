// Cloudflare Worker: forwards every incoming request straight into the
// container, unchanged (method, path, headers, body). Unlike
// signals-service's fetch() (a static cron-job placeholder — its real work
// runs on a schedule), this service is request-driven: user-frontend's
// proxy route sends every user-portal API call here directly.
//
// NOTE: `getContainer` is the current @cloudflare/containers helper for
// "get this binding's singleton instance and forward a request to it" —
// verify against @cloudflare/containers' current README when running
// `npm install`/`wrangler deploy`, since this SDK is still evolving and the
// exact helper name/signature could not be independently confirmed here
// (same caveat signals-service/worker/index.ts already carries). If it's
// changed, the fallback is the manual Durable Object pattern:
//   const id = env.USER_BACKEND_CONTAINER.idFromName("singleton");
//   const stub = env.USER_BACKEND_CONTAINER.get(id);
//   await stub.fetch(request);
import { Container, getContainer } from "@cloudflare/containers";

interface Env {
  USER_BACKEND_CONTAINER: DurableObjectNamespace;
  DATABASE_URL: string;
  JWT_SECRET: string;
  ALLOW_DEV_IP_OVERRIDE: string;
  METAAPI_TOKEN: string;
  FIELD_ENCRYPTION_KEY: string;
  METAAPI_SYNC_KEY: string;
  METAAPI_SYNC_SECRET: string;
  R2_ENDPOINT: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string;
  CF_ACCOUNT_ID: string;
  CF_KV_NAMESPACE_ID: string;
  CF_KV_API_TOKEN: string;
  RECAPTCHA_SECRET_KEY: string;
  SMTP_HOST: string;
  SMTP_PORT: string;
  SYSTEM_EMAIL_ID: string;
  SYSTEM_EMAIL_PASSWORD: string;
  GOOGLE_TRANSLATE_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_ID: string;
  STRIPE_WEBHOOK_SECRET: string;
}

export class UserBackendContainer extends Container {
  defaultPort = 8080;
  // No cron to bound cold starts against (unlike signals-service) — this is
  // a plain idle timeout for a request-driven service.
  sleepAfter = "15m";

  // `wrangler secret put`/`secret bulk` sets secrets on the Worker's own
  // env — that does NOT automatically become the container's process
  // environment (a separate Docker sandbox). Without this, the FastAPI app
  // inside crashes immediately on startup (DATABASE_URL/JWT_SECRET
  // "required" — same checks backend-shared/database.py and utils/auth.py
  // enforce everywhere else), which surfaced as an opaque "Failed to start
  // container" error with no indication env vars were the cause.
  envVars: Record<string, string>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.envVars = {
      DATABASE_URL: env.DATABASE_URL,
      JWT_SECRET: env.JWT_SECRET,
      ALLOW_DEV_IP_OVERRIDE: env.ALLOW_DEV_IP_OVERRIDE,
      METAAPI_TOKEN: env.METAAPI_TOKEN,
      FIELD_ENCRYPTION_KEY: env.FIELD_ENCRYPTION_KEY,
      METAAPI_SYNC_KEY: env.METAAPI_SYNC_KEY,
      METAAPI_SYNC_SECRET: env.METAAPI_SYNC_SECRET,
      R2_ENDPOINT: env.R2_ENDPOINT,
      R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME: env.R2_BUCKET_NAME,
      R2_PUBLIC_URL: env.R2_PUBLIC_URL,
      CF_ACCOUNT_ID: env.CF_ACCOUNT_ID,
      CF_KV_NAMESPACE_ID: env.CF_KV_NAMESPACE_ID,
      CF_KV_API_TOKEN: env.CF_KV_API_TOKEN,
      RECAPTCHA_SECRET_KEY: env.RECAPTCHA_SECRET_KEY,
      SMTP_HOST: env.SMTP_HOST,
      SMTP_PORT: env.SMTP_PORT,
      SYSTEM_EMAIL_ID: env.SYSTEM_EMAIL_ID,
      SYSTEM_EMAIL_PASSWORD: env.SYSTEM_EMAIL_PASSWORD,
      GOOGLE_TRANSLATE_API_KEY: env.GOOGLE_TRANSLATE_API_KEY,
      STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
      STRIPE_PRICE_ID: env.STRIPE_PRICE_ID,
      STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
    };
  }

  override onStart() {
    console.log("user-backend container started");
  }
  override onStop() {
    console.log("user-backend container stopped");
  }
  override onError(error: unknown) {
    console.log("user-backend container error:", error);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const container = getContainer(env.USER_BACKEND_CONTAINER);
    return container.fetch(request);
  },
};
