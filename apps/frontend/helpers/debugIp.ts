// Local dev only: appends ?debug_ip= to a request path when NEXT_PUBLIC_DEBUG_IP
// is set (frontend/.env.local), so geolocation-dependent endpoints (broker
// coverage filtering) can be exercised from the browser on localhost, where the
// real client IP is always an unroutable loopback address. See
// backend/app/utils/geo.py ALLOW_DEV_IP_OVERRIDE and
// app/api/proxy/[...path]/route.ts, which strip this outside of dev.
export function withDebugIp(path: string): string {
  const debugIp = process.env.NEXT_PUBLIC_DEBUG_IP;
  if (!debugIp) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}debug_ip=${encodeURIComponent(debugIp)}`;
}
