import type { Locale } from "./routing";

// Mirrors backend/app/utils/translate.py's COUNTRY_TO_LOCALE exactly — keep
// the two lists in sync. Countries not listed fall through to "en".
const ARABIC = [
  "AE", "SA", "EG", "QA", "KW", "BH", "OM", "JO", "LB", "SY", "IQ", "YE",
  "LY", "TN", "DZ", "MA", "SD", "SS", "MR", "DJ", "KM", "PS",
];
const FARSI = ["IR", "AF"];
const SPANISH = [
  "ES", "MX", "AR", "CO", "PE", "VE", "CL", "EC", "GT", "CU", "BO", "DO",
  "HN", "PY", "SV", "NI", "CR", "PA", "UY", "GQ",
];
const PORTUGUESE = ["PT", "BR", "AO", "MZ", "CV", "GW", "ST", "TL"];
const CHINESE = ["CN", "TW", "HK", "MO", "SG"];
const VIETNAMESE = ["VN"];
const HINDI = ["IN"];

const COUNTRY_TO_LOCALE: Record<string, Locale> = {};
for (const c of ARABIC) COUNTRY_TO_LOCALE[c] = "ar";
for (const c of FARSI) COUNTRY_TO_LOCALE[c] = "fa";
for (const c of SPANISH) COUNTRY_TO_LOCALE[c] = "es";
for (const c of PORTUGUESE) COUNTRY_TO_LOCALE[c] = "pt";
for (const c of CHINESE) COUNTRY_TO_LOCALE[c] = "zh";
for (const c of VIETNAMESE) COUNTRY_TO_LOCALE[c] = "vi";
for (const c of HINDI) COUNTRY_TO_LOCALE[c] = "hi";

const GEO_LOOKUP_TIMEOUT_MS = 2500;

function extractClientIp(request: { headers: Headers }): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

function isLocatable(ip: string): boolean {
  // Best-effort private/loopback filter (mirrors backend's ipaddress-based
  // check) — good enough to skip an obviously-useless lookup for localhost/
  // LAN addresses without pulling in a full IP-parsing library at the edge.
  return !(
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("169.254.")
  );
}

/** Best-effort IP -> locale lookup for a request with no locale segment yet.
 * Fails open to "en" on any error, timeout, or unlocatable IP — this is a
 * one-time redirect decision, never something that should block or break a
 * page load. */
export async function detectLocaleFromIp(request: { headers: Headers }): Promise<Locale> {
  const ip = extractClientIp(request);
  if (!ip || !isLocatable(ip)) return "en";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEO_LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(`https://ipwho.is/${ip}`, { signal: controller.signal });
    const data = await res.json();
    if (!data?.success) return "en";
    const countryCode = data.country_code as string | undefined;
    return (countryCode && COUNTRY_TO_LOCALE[countryCode]) || "en";
  } catch {
    return "en";
  } finally {
    clearTimeout(timeout);
  }
}
