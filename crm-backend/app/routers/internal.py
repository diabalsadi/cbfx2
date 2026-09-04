"""Endpoints meant for external automation (cron), not end users.

crm-backend only carries /purge-cache — the other three /internal/*
endpoints (/sync-metaapi, /keep-alive-copytrading, /sync-subscriptions) all
touch mt5/copyfactory/stripe and live on user-backend only, per plan.md
Phase 3's internal.py split. Protected via METAAPI_SYNC_KEY /
METAAPI_SYNC_SECRET headers instead of the usual user JWT, since there's no
signed-in user driving the call — the name predates this file covering more
than MetaApi, kept as-is rather than force a cron config change to rename it.
"""
import os
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from backend_shared.utils.cache import purge_public_cache
from backend_shared.utils.otp import secure_compare

router = APIRouter(prefix="/internal", tags=["internal"])


def _require_sync_auth(
    x_sync_key: Optional[str] = Header(None),
    x_sync_secret: Optional[str] = Header(None),
):
    expected_key = os.environ.get("METAAPI_SYNC_KEY")
    expected_secret = os.environ.get("METAAPI_SYNC_SECRET")
    if not expected_key or not expected_secret:
        raise HTTPException(status_code=503, detail="Sync endpoint not configured")
    if not x_sync_key or not x_sync_secret:
        raise HTTPException(status_code=401, detail="Missing sync credentials")
    if not secure_compare(x_sync_key, expected_key) or not secure_compare(x_sync_secret, expected_secret):
        raise HTTPException(status_code=401, detail="Invalid sync credentials")


@router.post("/purge-cache")
def purge_cache(_auth: None = Depends(_require_sync_auth)):
    """Wipes the public_cache read-cache — called by any external process
    that writes directly to a table a /public/* endpoint reads without going
    through this app's own routers (which otherwise call purge_public_cache()
    themselves on every mutation). Today that's signals-service
    (GOLD_SIGNALS_ARCHITECTURE.md), which inserts/updates `plays` rows
    straight into the shared database after every generate/monitor run —
    those changes would otherwise sit behind /public/homepage's cache TTL
    (PUBLIC_CACHE_TTL_SECONDS) instead of showing up immediately. Reuses the
    same X-Sync-Key/X-Sync-Secret credentials as the other /internal/*
    endpoints rather than requiring a separate secret."""
    purge_public_cache()
    return {"status": "purged"}
