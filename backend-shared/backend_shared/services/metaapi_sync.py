"""Deal-history sync — the deploy/fetch/undeploy cycle from
METAAPI_INTEGRATION_ARCHITECTURE.md §4, run once daily per account by the
external cron hitting POST /internal/sync-metaapi (app/routers/internal.py).
"""
import logging
from datetime import datetime, timezone
from typing import List

from sqlalchemy.orm import Session

from backend_shared.models.mt5_account import MT5Account
from backend_shared.models.trade_record import TradeRecord
from backend_shared.services import metaapi_client

logger = logging.getLogger(__name__)

# Only a closed round-turn trade earns cashback — balance/credit/commission
# deals aren't trades, and a position's *opening* deal (DEAL_ENTRY_IN) would
# double-count the same lots already captured by its closing deal
# (DEAL_ENTRY_OUT / DEAL_ENTRY_OUT_BY) if both were recorded.
_TRADE_TYPES = {"DEAL_TYPE_BUY", "DEAL_TYPE_SELL"}
_CLOSING_ENTRY_TYPES = {"DEAL_ENTRY_OUT", "DEAL_ENTRY_OUT_BY"}


async def sync_account(db: Session, account: MT5Account) -> dict:
    """Deploys the account, pulls deal history since the last sync, stores
    new closed trades, then undeploys — stopping billing until the next
    cycle (§4). Idempotent: safe to call again if a previous run failed
    partway through. Never raises — failures are caught, reflected in the
    account's metaapi_connection_status, and returned in the summary dict
    rather than aborting the rest of the batch."""
    if not account.metaapi_account_id:
        return {"mt5_account_id": account.id, "status": "skipped", "reason": "not_provisioned"}

    try:
        api = metaapi_client.get_client()
        meta_account = await api.metatrader_account_api.get_account(account.metaapi_account_id)
        await meta_account.deploy()
        await meta_account.wait_connected()

        connection = meta_account.get_rpc_connection()
        await connection.connect()
        await connection.wait_synchronized()

        now = datetime.now(timezone.utc)
        start = account.metaapi_last_synced_at or account.created_at
        deals = await connection.get_deals_by_time_range(start, now)

        await connection.close()

        new_count = 0
        for deal in deals:
            if deal.get("type") not in _TRADE_TYPES:
                continue
            if deal.get("entryType") not in _CLOSING_ENTRY_TYPES:
                continue
            symbol = deal.get("symbol")
            deal_id = deal.get("id")
            if not symbol or not deal_id:
                continue

            existing = (
                db.query(TradeRecord)
                .filter(
                    TradeRecord.mt5_account_id == account.id,
                    TradeRecord.metaapi_deal_id == deal_id,
                )
                .first()
            )
            if existing:
                continue

            db.add(
                TradeRecord(
                    mt5_account_id=account.id,
                    metaapi_deal_id=deal_id,
                    symbol=symbol,
                    lots=deal.get("volume") or 0.0,
                    direction="buy" if deal["type"] == "DEAL_TYPE_BUY" else "sell",
                    closed_at=deal["time"],
                    profit=deal.get("profit"),
                )
            )
            new_count += 1

        await meta_account.undeploy()

        account.metaapi_connection_status = "idle"
        account.metaapi_last_synced_at = now
        db.commit()

        return {"mt5_account_id": account.id, "status": "synced", "new_deals": new_count}
    except Exception:
        logger.exception("MetaApi sync failed for account %s", account.id)
        db.rollback()
        account.metaapi_connection_status = "error"
        db.commit()
        return {"mt5_account_id": account.id, "status": "error"}


async def sync_accounts(db: Session, accounts: List[MT5Account]) -> List[dict]:
    """Sequential by design — each account's deploy/sync/undeploy cycle can
    take a while (wait_connected defaults to a 5-minute timeout), and this
    job is meant to run as a slow daily batch, not a fast request path."""
    results = []
    for account in accounts:
        results.append(await sync_account(db, account))
    return results
