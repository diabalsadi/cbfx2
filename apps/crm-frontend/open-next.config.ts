import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incrementalCache override yet — OpenNext's R2-backed cache needs its
// own R2 bucket binding in wrangler.jsonc (a native Workers binding,
// separate from the S3-compatible R2 credentials the Python backends use
// for media uploads), which hasn't been set up. Falls back to OpenNext's
// default cache for now; a few pages use { next: { revalidate } }, so this
// is worth revisiting once a bucket is decided on, not just left as-is
// permanently.
export default {
  ...defineCloudflareConfig(),
  // Next.js 16 defaults to Turbopack; this project's next.config.ts has
  // webpack-only loaders (@svgr/webpack for SVG-as-component imports, MDX)
  // that don't work under Turbopack, and every other build/dev script here
  // already forces --webpack explicitly. Without this override OpenNext's
  // own build step would silently use Turbopack instead and those imports
  // would break.
  buildCommand: "next build --webpack",
};
