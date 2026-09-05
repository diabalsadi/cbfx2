import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const withNextIntl = createNextIntlPlugin("../../packages/frontend-shared/src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactCompiler: true,
  // next/image isn't used anywhere in this app (verified by grep) — Next's
  // default image-optimization pipeline pulls in `sharp` regardless, which
  // has a compiled native .node binary Cloudflare Workers can't run anyway
  // (no native binary support in that runtime). unoptimized alone didn't
  // stop OpenNext's esbuild step from still trying to bundle sharp's .node
  // file (esbuild statically resolves the require() even though it's never
  // actually invoked at runtime) — serverExternalPackages is what actually
  // keeps Next's own build from bundling it in the first place, so esbuild
  // never sees it downstream. Next's own docs list sharp as the canonical
  // example for this option.
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["sharp"],
  // packages/frontend-shared's .tsx/.ts source lives outside this app's own
  // root (apps/frontend) — without this, Next.js treats it like an
  // ordinary external node_modules package and skips transpiling its
  // JSX/TSX, which breaks the build the moment anything in there is
  // imported. This isn't a real published package, just a workspace
  // sibling whose source is compiled as part of this app.
  transpilePackages: ["frontend-shared"],
  // RECAPTCHA_SITE_KEY_PUBLIC has no NEXT_PUBLIC_ prefix, so Next.js
  // wouldn't otherwise inline it into client bundles (components/Recaptcha
  // reads it via process.env in a "use client" component) — list it here
  // explicitly instead of renaming the var across every deployment env.
  env: {
    RECAPTCHA_SITE_KEY_PUBLIC: process.env.RECAPTCHA_SITE_KEY_PUBLIC,
  },
  // Every route's generateMetadata() is async (it fetches admin-managed SEO
  // copy from the backend), so Next.js 15+'s "streaming metadata" would
  // otherwise inject title/OG/canonical tags after <body> for regular
  // browsers and only serve blocking, correctly head-placed metadata to a
  // curated default list of bots. Matching every user agent here disables
  // streaming entirely so metadata is always in <head>, for every visitor —
  // not just the crawlers Next's default bot list happens to catch.
  htmlLimitedBots: /.*/,
  webpack: (config, options) => {
    config.module.rules.push({
      test: /\.mdx/,
      use: [
        options.defaultLoaders.babel,
        {
          loader: '@mdx-js/loader',
        }
      ]
    })

    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack']
    })

    return config
  }
};

export default withNextIntl(nextConfig);
