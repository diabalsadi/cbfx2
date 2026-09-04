import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing, locales } from "./i18n/routing";
import { detectLocaleFromIp } from "./i18n/geoLocale";

const intlMiddleware = createMiddleware(routing);

const LOCALE_COOKIE = "NEXT_LOCALE";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function pathnameHasLocale(pathname: string): boolean {
  return locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
}

/** Resolves the locale for a request with no locale segment yet, then
 * redirects to the prefixed URL so the locale is always present from here
 * on — for both the public app and the admin/CRM. Precedence: an existing
 * NEXT_LOCALE cookie (a visitor's own prior choice always wins over
 * re-detecting) -> best-effort IP geolocation -> "en". Once a locale segment
 * exists, next-intl's own middleware takes over for standard routing. */
export default async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathnameHasLocale(pathname)) {
    return intlMiddleware(request);
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale =
    cookieLocale && (locales as readonly string[]).includes(cookieLocale)
      ? cookieLocale
      : await detectLocaleFromIp(request);

  const redirectUrl = new URL(`/${locale}${pathname}${search}`, request.url);
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: ONE_YEAR_SECONDS });
  return response;
}

export const config = {
  // Skip API routes, Next internals, and any request for a file with an
  // extension (favicon, images, etc.) — everything else gets locale-routed.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
