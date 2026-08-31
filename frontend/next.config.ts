import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactCompiler: true,
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
