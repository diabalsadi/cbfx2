import logging

import requests

from app.config import BACKEND_BASE_URL, SYNC_KEY, SYNC_SECRET

logger = logging.getLogger("signals.backend_client")


def purge_public_cache() -> None:
    """Tells the main backend to wipe its /public/* read-cache, since this
    service writes plays rows straight into the shared database without
    going through the main app's own routers (which purge the cache
    themselves on every mutation — see backend/app/routers/internal.py:
    purge_cache). Best-effort: a failure here just means the change sits
    behind the cache's TTL a little longer, same as the main app's own
    purge_public_cache() failure mode — never worth failing a job over."""
    if not BACKEND_BASE_URL or not SYNC_KEY or not SYNC_SECRET:
        logger.warning("BACKEND_BASE_URL/SYNC_KEY/SYNC_SECRET not configured — skipping cache purge")
        return
    try:
        resp = requests.post(
            f"{BACKEND_BASE_URL}/internal/purge-cache",
            headers={"X-Sync-Key": SYNC_KEY, "X-Sync-Secret": SYNC_SECRET},
            timeout=15,
        )
        resp.raise_for_status()
        logger.info("Purged main backend's public cache")
    except requests.RequestException as e:
        logger.error("Failed to purge main backend's public cache: %s", e)
