import { defineRouting } from "next-intl/routing";

// Mirrors backend/app/utils/translate.py's SUPPORTED_LOCALES exactly — keep
// the two lists in sync. "en" is the source/authored language.
export const locales = ["ar", "en", "es", "fa", "pt", "zh", "vi", "hi"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// ar/fa render right-to-left — checked wherever <html dir> is set.
export const RTL_LOCALES: ReadonlySet<Locale> = new Set(["ar", "fa"]);

export const routing = defineRouting({
  locales,
  defaultLocale,
  // We resolve the initial locale ourselves in middleware.ts via IP
  // geolocation (matching the backend's country->locale default), then set
  // the NEXT_LOCALE cookie — so next-intl's own Accept-Language-based
  // detection never runs, and a locale segment is always present by the
  // time this routing config is consulted.
  localeDetection: false,
});
