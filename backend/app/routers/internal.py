"""Endpoints meant for external automation (cron), not end users — the
once-daily MetaApi sync (METAAPI_INTEGRATION_ARCHITECTURE.md §4) and the
Stripe subscription-status reconciliation below. Protected via
METAAPI_SYNC_KEY / METAAPI_SYNC_SECRET headers instead of the usual user
JWT, since there's no signed-in user driving the call — the name predates
this file covering more than MetaApi, kept as-is rather than force a cron
config change to rename it.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.mt5_account import MT5Account
from app.services.metaapi_sync import sync_accounts
from app.services.rebate_calculation import calculate_rebates
from app.services import stripe_client
from app.utils.otp import secure_compare

router = APIRouter(prefix="/internal", tags=["internal"])

# Accounts last synced longer ago than this are due for another cycle.
# Comfortably above the 24h target cadence so a cron that fires at a
# slightly different time each day never skips a day.
SYNC_DUE_AFTER_HOURS = 20


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


@router.post("/sync-metaapi")
async def sync_metaapi(
    db: Session = Depends(get_db),
    _auth: None = Depends(_require_sync_auth),
):
    """Deploy -> pull deal history -> undeploy for every MT5 account due for
    its once-daily cycle. Called by an external cron, not a user."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=SYNC_DUE_AFTER_HOURS)
    due_accounts = (
        db.query(MT5Account)
        .filter(MT5Account.metaapi_account_id.isnot(None))
        .filter(
            (MT5Account.metaapi_last_synced_at.is_(None))
            | (MT5Account.metaapi_last_synced_at < cutoff)
        )
        .all()
    )
    results = await sync_accounts(db, due_accounts)
    rebates = calculate_rebates(db)
    return {
        "accounts_due": len(due_accounts),
        "synced": sum(1 for r in results if r["status"] == "synced"),
        "errors": sum(1 for r in results if r["status"] == "error"),
        "results": results,
        "rebates": rebates,
    }


@router.post("/sync-subscriptions")
def sync_subscriptions(
    db: Session = Depends(get_db),
    _auth: None = Depends(_require_sync_auth),
):
    """Daily reconciliation safety net for the Stripe subscription paywall —
    re-fetches every subscribed user's status directly from Stripe in case a
    webhook was missed, so a lapsed/failed payment never leaves someone with
    stale "active" access past the end of the day it happened. The webhook
    handler (POST /billing/webhook) is still the primary, real-time path."""
    if not stripe_client.configured():
        raise HTTPException(status_code=503, detail="Billing is not configured")
    return stripe_client.sync_subscription_statuses(db)
