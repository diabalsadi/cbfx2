import ipaddress
import json
import os
import urllib.request
from typing import Optional, Tuple

# Local dev only: browsers hitting localhost never send X-Forwarded-For (that's set
# by a real reverse proxy, e.g. Render), so the backend only ever sees the Next.js
# proxy's own loopback connection and geolocation is always empty. Set
# ALLOW_DEV_IP_OVERRIDE=true in backend/.env (never in a deployed environment) to
# let a request supply an X-Debug-IP header or ?debug_ip= query param instead, so
# the region/country flow can be exercised end-to-end from the browser.
DEV_IP_OVERRIDE_ENABLED = os.getenv("ALLOW_DEV_IP_OVERRIDE", "false").strip().lower() == "true"

# Mirrors the region codes used by app.schemas.broker.REGIONS
NORTH_AMERICA = {
    "US", "CA", "MX", "GT", "BZ", "SV", "HN", "NI", "CR", "PA",
    "CU", "JM", "HT", "DO", "BS", "BB", "TT", "GD", "LC", "VC", "AG", "DM", "KN",
    "PR", "VI", "BM", "AI", "AW", "CW", "SX", "BQ", "TC", "KY", "VG", "MS", "GP", "MQ", "BL", "MF", "PM",
}

SOUTH_AMERICA = {
    "BR", "AR", "CL", "CO", "PE", "VE", "EC", "BO", "PY", "UY", "GY", "SR", "GF", "FK",
}

EUROPE = {
    "GB", "IE", "FR", "DE", "ES", "PT", "IT", "NL", "BE", "LU", "CH", "AT", "DK", "SE", "NO", "FI", "IS",
    "PL", "CZ", "SK", "HU", "RO", "BG", "GR", "HR", "SI", "RS", "BA", "ME", "MK", "AL", "XK",
    "EE", "LV", "LT", "BY", "UA", "MD", "RU", "MT", "CY", "AD", "MC", "SM", "VA", "LI", "FO", "GI", "GG", "JE", "IM",
}

# Western Asia, per the UN geoscheme — kept distinct from the broader "Asia" bucket
# since CFI-style MENA brokers report coverage this way.
MIDDLE_EAST = {
    "AE", "SA", "QA", "KW", "BH", "OM", "JO", "LB", "SY", "IQ", "IL", "PS", "YE", "IR", "TR",
}

AFRICA = {
    "EG", "LY", "TN", "DZ", "MA", "SD", "SS",
    "NG", "GH", "CI", "SN", "ML", "BF", "NE", "TD", "CM", "CF", "CG", "CD", "GA", "GQ", "ST", "AO",
    "KE", "TZ", "UG", "RW", "BI", "ET", "ER", "DJ", "SO", "ZM", "ZW", "MW", "MZ", "NA", "BW", "ZA", "LS", "SZ",
    "MG", "MU", "SC", "KM", "CV", "GM", "GW", "GN", "SL", "LR", "TG", "BJ", "MR",
}

ASIA = {
    "CN", "JP", "KR", "KP", "MN", "TW", "HK", "MO",
    "IN", "PK", "BD", "LK", "NP", "BT", "MV",
    "TH", "VN", "KH", "LA", "MM", "MY", "SG", "ID", "PH", "BN", "TL",
    "KZ", "UZ", "TM", "TJ", "KG", "AF",
}

COUNTRY_TO_REGION = {}
for _code in NORTH_AMERICA:
    COUNTRY_TO_REGION[_code] = "north_america"
for _code in SOUTH_AMERICA:
    COUNTRY_TO_REGION[_code] = "south_america"
for _code in EUROPE:
    COUNTRY_TO_REGION[_code] = "europe"
for _code in MIDDLE_EAST:
    COUNTRY_TO_REGION[_code] = "middle_east"
for _code in AFRICA:
    COUNTRY_TO_REGION[_code] = "africa"
for _code in ASIA:
    COUNTRY_TO_REGION[_code] = "asia"


def extract_client_ip(request) -> Optional[str]:
    """Best-effort real client IP, honoring proxy headers set by the Next.js proxy / Render."""
    if DEV_IP_OVERRIDE_ENABLED:
        debug_ip = request.headers.get("x-debug-ip") or request.query_params.get("debug_ip")
        if debug_ip:
            return debug_ip.strip()

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    if request.client:
        return request.client.host
    return None


def _is_locatable(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return not (addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved or addr.is_multicast)


def detect_region(ip: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """Best-effort IP -> (country_code, region) lookup. Returns (None, None) if the IP
    can't be resolved (private/local address) or the lookup fails for any reason."""
    if not ip or not _is_locatable(ip):
        return None, None

    try:
        url = f"https://ipwho.is/{ip}"
        with urllib.request.urlopen(url, timeout=2.5) as resp:
            data = json.loads(resp.read().decode())
    except Exception:
        return None, None

    if not data.get("success"):
        return None, None

    country_code = data.get("country_code")
    region = COUNTRY_TO_REGION.get(country_code)
    return country_code, region
