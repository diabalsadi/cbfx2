import type { Metadata } from "next";
import { BACKEND_URL } from "./backendUrl";
import { locales, defaultLocale } from "@/i18n/routing";

// Route keys the admin "SEO" page manages — must match backend
// app.schemas.seo_meta.SEO_ROUTES. "_detail"/"_symbol" suffixed keys are
// templates for dynamic routes: their title/description can contain
// "{token}" placeholders filled in with real page data via getSeoMeta()'s
// `tokens` argument.
export type SeoRoute =
  | "homepage"
  | "login"
  | "register"
  | "account"
  | "analysis"
  | "analysis_detail"
  | "brokers_detail"
  | "calendar"
  | "cashback"
  | "copy_trading"
  | "forum"
  | "forum_detail"
  | "markets"
  | "markets_symbol"
  | "news"
  | "news_detail"
  | "plays"
  | "referrals";

export interface SeoMetaData {
  route: string;
  title: string;
  description: string;
  keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_card: string;
  canonical_path: string | null;
  robots: string;
}

export interface SeoSettingsData {
  google_site_verification: string | null;
  bing_site_verification: string | null;
  pinterest_site_verification: string | null;
  facebook_domain_verification: string | null;
  twitter_site: string | null;
  default_share_title: string | null;
  default_share_description: string | null;
  default_share_image: string | null;
  default_keywords: string | null;
}

export const SITE_NAME = "CBFX";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:5000").replace(/\/$/, "");

const FALLBACK: Omit<SeoMetaData, "route"> = {
  title: "CBFX — Trade Smarter. Earn Cashback on Every Pip.",
  description:
    "Cashback, copy trading, premium trading signals and a live community — all in one cockpit.",
  keywords: null,
  og_title: null,
  og_description: null,
  og_image: null,
  twitter_card: "summary_large_image",
  canonical_path: null,
  robots: "index, follow",
};

const EMPTY_SETTINGS: SeoSettingsData = {
  google_site_verification: null,
  bing_site_verification: null,
  pinterest_site_verification: null,
  facebook_domain_verification: null,
  twitter_site: null,
  default_share_title: null,
  default_share_description: null,
  default_share_image: null,
  default_keywords: null,
};

function fillTokens(seo: SeoMetaData, tokens: Record<string, string>): SeoMetaData {
  const apply = (s: string | null) =>
    s ? Object.entries(tokens).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), s) : s;
  return {
    ...seo,
    title: apply(seo.title) ?? seo.title,
    description: apply(seo.description) ?? seo.description,
    og_title: apply(seo.og_title),
    og_description: apply(seo.og_description),
  };
}

/** hreflang alternates for `path` (an unprefixed route path, e.g.
 * "/markets/EURUSD") across every supported locale, plus an "x-default"
 * pointing at the default-locale version — the standard pattern search
 * engines expect for a locale-prefixed site. Exported so dynamic routes
 * (markets/[symbol], forum/[id], etc.) can build their own alternates for
 * their instance-specific path instead of the generic `seo.canonical_path`
 * template that buildMetadata() uses by default. */
export function localizedAlternates(path: string, locale: string): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `${SITE_URL}/${loc}${path}`;
  }
  languages["x-default"] = `${SITE_URL}/${defaultLocale}${path}`;
  return { canonical: `${SITE_URL}/${locale}${path}`, languages };
}

/**
 * Server-side fetch of one route's admin-managed SEO copy, machine-
 * translated into `locale` by the backend. `subKey` targets a per-item
 * override (currently only "markets_symbol" uses this, keyed by symbol
 * slug) — the backend falls back to the route's generic template if no
 * override exists for that key. Always resolves (never throws): an
 * unconfigured route or an unreachable backend falls back to site-wide
 * defaults so a page never fails to render over missing SEO copy.
 */
export async function getSeoMeta(
  route: SeoRoute,
  locale: string,
  tokens: Record<string, string> = {},
  subKey?: string,
): Promise<SeoMetaData> {
  let data: SeoMetaData | null = null;
  try {
    const qs = subKey ? `?sub_key=${encodeURIComponent(subKey)}` : "";
    const res = await fetch(`${BACKEND_URL}/public/seo/${route}${qs}`, {
      next: { revalidate: 300 },
      headers: { "X-Locale": locale },
    });
    if (res.ok) {
      const json = await res.json();
      if (json) data = json;
    }
  } catch {
    // network/backend issue — fall through to defaults
  }
  return fillTokens(data ?? { ...FALLBACK, route }, tokens);
}

/** Server-side fetch of sitewide SEO settings (verification codes, default
 * social share fallbacks), machine-translated into `locale` by the backend.
 * Always resolves — an unreachable backend falls back to all-null settings. */
export async function getSeoSettings(locale: string): Promise<SeoSettingsData> {
  try {
    const res = await fetch(`${BACKEND_URL}/public/seo/settings`, {
      next: { revalidate: 300 },
      headers: { "X-Locale": locale },
    });
    if (res.ok) {
      const json = await res.json();
      if (json) return json;
    }
  } catch {
    // network/backend issue — fall through to defaults
  }
  return EMPTY_SETTINGS;
}

/**
 * Turns admin-managed SEO copy into a Next.js Metadata object. Fetches
 * sitewide settings internally (deduped by Next's fetch cache alongside the
 * root layout's own call) so every page's social preview has a usable
 * fallback image/title/description even before it's individually configured.
 * `overrides.alternates`, if set, replaces the generic hreflang set built
 * from `seo.canonical_path` — use localizedAlternates() with the page's own
 * instance-specific path for dynamic routes.
 */
export async function buildMetadata(seo: SeoMetaData, locale: string, overrides: Metadata = {}): Promise<Metadata> {
  const settings = await getSeoSettings(locale);
  const alternates = seo.canonical_path ? localizedAlternates(seo.canonical_path, locale) : undefined;
  const ogTitle = seo.og_title || settings.default_share_title || seo.title;
  const ogDescription = seo.og_description || settings.default_share_description || seo.description;
  const ogImage = seo.og_image || settings.default_share_image || undefined;

  return {
    // `absolute` guarantees the admin-managed title renders exactly as
    // written, even if a parent layout ever defines a title template.
    title: { absolute: seo.title },
    description: seo.description,
    keywords: seo.keywords || settings.default_keywords || undefined,
    alternates,
    robots: seo.robots,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: alternates?.canonical as string | undefined,
      siteName: SITE_NAME,
      type: "website",
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: seo.twitter_card === "summary" ? "summary" : "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: ogImage ? [ogImage] : undefined,
      site: settings.twitter_site || undefined,
    },
    ...overrides,
  };
}
