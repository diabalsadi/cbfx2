import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
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

export default nextConfig;
