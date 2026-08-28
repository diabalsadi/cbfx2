from typing import Any, Callable

from app.services import cloudflare_kv

# Every entry lives under this prefix so purge_public_cache() can wipe the
# whole read-cache in one call without needing to know each route's exact
# key shape.
_PREFIX = "public:"


class KVCache:
    """Cloudflare KV-backed cache for read-heavy, unauthenticated public
    endpoints only — never wrap anything that reads the current user or a
    bearer token. `get_or_set()` is the only method call sites use.

    Falls back to always-recompute (no caching, no error) when
    CF_ACCOUNT_ID / CF_KV_API_TOKEN aren't configured — see
    cloudflare_kv.configured(). Shared across every server process/instance,
    unlike the in-process TTLCache this replaces.
    """

    def get_or_set(self, key: str, ttl_seconds: float, compute: Callable[[], Any]) -> Any:
        cached = cloudflare_kv.get(key)
        if cached is not cloudflare_kv.MISS:
            # Wrapped in {"v": ...} on write so a legitimately-cached `None`
            # (e.g. a memoized "not found" lookup) round-trips as a hit
            # rather than looking like an absent key.
            return cached["v"]
        value = compute()
        cloudflare_kv.set(key, {"v": value}, int(ttl_seconds))
        return value


# One shared instance for backend/app/routers/public.py. Each entry expires
# after PUBLIC_CACHE_TTL_SECONDS on its own (Cloudflare KV's expiration_ttl)
# — the "erase and refill on next hit" behavior needs no separate job.
# purge_public_cache() additionally clears everything immediately when an
# admin changes content, rather than waiting out the TTL.
public_cache = KVCache()
PUBLIC_CACHE_TTL_SECONDS = 1800  # 30 minutes


def purge_public_cache() -> None:
    """Call after any admin create/update/delete whose data can appear in a
    public_cache-backed response (articles, brokers, broker placements, ad
    banners, seo meta, market prices, copy traders, plays, analysis — these
    all feed /public/homepage and/or their own /public/* endpoint). Best-
    effort: on failure, affected entries simply live out their TTL."""
    cloudflare_kv.purge_prefix(_PREFIX)
