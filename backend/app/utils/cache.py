import threading
import time
from typing import Any, Callable


class TTLCache:
    """In-process TTL cache for read-heavy, unauthenticated public endpoints
    only — never wrap anything that reads the current user or a bearer
    token. `get_or_set()` is the only method call sites use, so this can be
    swapped for a Redis-backed implementation later without touching them.

    Not safe to share across multiple worker processes (each gets its own
    copy) — fine for a single-process deploy or as a per-process front for a
    shared cache later; Redis removes that limitation when it's added.
    """

    def __init__(self):
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get_or_set(self, key: str, ttl_seconds: float, compute: Callable[[], Any]) -> Any:
        now = time.monotonic()
        with self._lock:
            hit = self._store.get(key)
            if hit is not None and hit[0] > now:
                return hit[1]
        value = compute()
        with self._lock:
            self._store[key] = (now + ttl_seconds, value)
        return value


# One shared instance for backend/app/routers/public.py. Short TTL trades a
# little staleness (new content can take up to this long to appear) for a
# meaningful cut in DB load on the site's highest-traffic, identical-for-
# every-anonymous-visitor routes.
public_cache = TTLCache()
PUBLIC_CACHE_TTL_SECONDS = 30
