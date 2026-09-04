"""Keep-alive loop for copy-trading's continuously-deployed MetaApi
accounts — distinct from metaapi_sync.py's once-daily deploy/fetch/undeploy
cycle used for cashback tracking. CopyFactory mirrors trades live, so both
a live CopyTrader's master account and every active/pending
CopySubscription's follower account must stay deployed, not just be polled
periodically (METAAPI_INTEGRATION_ARCHITECTURE.md §4, §10 step 6).

Called by POST /internal/keep-alive-copytrading on its own, more frequent
external cron than the once-daily /internal/sync-metaapi — folding this into
that job would undeploy accounts this feature needs to stay up.
"""
import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from backend_shared.models.copy_trader import CopyTrader
from backend_shared.models.copy_subscription import CopySubscription
from backend_shared.models.user import User
from backend_shared.services import metaapi_client, copyfactory_client

logger = logging.getLogger(__name__)

# Mirrors routers/copy_subscriptions.py's require_pro_access and
# stripe_client.py's own gating rule — kept here too since
# stop_lapsed_subscriptions() below needs the same check.
_UNLOCKED_STATUSES = {"active", "trialing"}


async def _ensure_master_deployed(db: Session, trader: CopyTrader) -> str:
    try:
        new_status = await metaapi_client.redeploy_and_check_status(trader.metaapi_account_id)
        trader.metaapi_connection_status = new_status
        db.commit()
        return new_status
    except Exception:
        logger.exception("Keep-alive deploy failed for copy trader %s", trader.id)
        db.rollback()
        trader.metaapi_connection_status = "error"
        db.commit()
        return "error"


async def _ensure_subscriber_deployed(db: Session, sub: CopySubscription, trader: CopyTrader) -> str:
    try:
        new_status = await metaapi_client.redeploy_and_check_status(sub.metaapi_account_id)
        sub.metaapi_connection_status = new_status

        # First time this account reaches "connected", finish the
        # subscribe-to-strategy call create_subscription() couldn't wait
        # minutes for inline (see routers/copy_subscriptions.py).
        if new_status == "connected" and sub.status == "pending" and trader.copyfactory_strategy_id:
            await copyfactory_client.subscribe(
                sub.metaapi_account_id, trader.copyfactory_strategy_id, sub.multiplier, name=sub.mt5_account_id
            )
            sub.copyfactory_subscriber_id = sub.metaapi_account_id
            sub.status = "active"

        db.commit()
        return new_status
    except Exception:
        logger.exception("Keep-alive deploy failed for copy subscription %s", sub.id)
        db.rollback()
        sub.metaapi_connection_status = "error"
        db.commit()
        return "error"


async def ensure_copytrading_deployed(db: Session) -> dict:
    """Never raises — each account's failure is caught, reflected in its own
    connection_status, and reported in the summary rather than aborting the
    rest of the batch. Idempotent: a no-op for any account already deployed
    and already subscribed."""
    masters: List[CopyTrader] = (
        db.query(CopyTrader)
        .filter(CopyTrader.is_live == True, CopyTrader.metaapi_account_id.isnot(None))  # noqa: E712
        .all()
    )
    subs: List[CopySubscription] = (
        db.query(CopySubscription)
        .filter(CopySubscription.status.in_(["pending", "active"]), CopySubscription.metaapi_account_id.isnot(None))
        .all()
    )
    trader_ids = {s.copy_trader_id for s in subs}
    traders_by_id = {t.id: t for t in db.query(CopyTrader).filter(CopyTrader.id.in_(trader_ids)).all()} if trader_ids else {}

    master_results = [
        {"copy_trader_id": trader.id, "status": await _ensure_master_deployed(db, trader)} for trader in masters
    ]

    sub_results = []
    for sub in subs:
        trader = traders_by_id.get(sub.copy_trader_id)
        if not trader:
            continue
        sub_results.append(
            {"copy_subscription_id": sub.id, "status": await _ensure_subscriber_deployed(db, sub, trader)}
        )

    return {"masters": master_results, "subscriptions": sub_results}


async def stop_copy_subscription(db: Session, sub: CopySubscription) -> None:
    """Shared teardown for stopping one copy subscription — used both by the
    customer's own DELETE /copy-subscriptions/{id} and by
    stop_lapsed_subscriptions() below. Unsubscribes from CopyFactory,
    undeploys the MetaApi trading account, and clears the stored trading
    password immediately (see CopySubscription's model docstring — unlike
    the investor password, this one has no reason to be retained once
    copying has stopped). A no-op if already stopped."""
    if sub.status == "stopped":
        return

    trader = db.query(CopyTrader).filter(CopyTrader.id == sub.copy_trader_id).first()
    if sub.metaapi_account_id and trader and trader.copyfactory_strategy_id:
        try:
            await copyfactory_client.unsubscribe(sub.metaapi_account_id, trader.copyfactory_strategy_id)
        except Exception:
            logger.exception("CopyFactory unsubscribe failed for subscription %s", sub.id)
    if sub.metaapi_account_id and metaapi_client.configured():
        try:
            api = metaapi_client.get_client()
            meta_account = await api.metatrader_account_api.get_account(sub.metaapi_account_id)
            await meta_account.undeploy()
        except Exception:
            logger.exception("MetaApi undeploy failed for subscription %s", sub.id)

    sub.status = "stopped"
    sub.trading_password_encrypted = None
    sub.metaapi_connection_status = "not_connected"
    db.commit()


async def stop_lapsed_subscriptions(db: Session, user_email: Optional[str] = None) -> dict:
    """Auto-stops copy trading the moment a user's Signals + Copy Trading
    subscription is no longer active/trialing — a lapsed or failed renewal
    must not leave real trades being mirrored onto their account after
    access is supposed to be revoked. This is the *system*-initiated stop;
    a user stopping one specific subscription themselves goes through
    DELETE /copy-subscriptions/{id} (routers/copy_subscriptions.py), which
    shares the same stop_copy_subscription() teardown above.

    Pass user_email to scope this to one user right after a webhook changes
    their status (routers/billing.py); omit it to sweep everyone, as part of
    the daily /internal/sync-subscriptions reconciliation — the same
    belt-and-suspenders pattern stripe_client.sync_subscription_statuses
    already uses for the subscription status itself, in case a webhook was
    ever missed."""
    query = (
        db.query(CopySubscription)
        .join(User, User.email == CopySubscription.user_email)
        .filter(CopySubscription.status.in_(["pending", "active", "paused"]))
        .filter(~User.subscription_status.in_(_UNLOCKED_STATUSES))
    )
    if user_email:
        query = query.filter(CopySubscription.user_email == user_email)

    lapsed = query.all()
    for sub in lapsed:
        await stop_copy_subscription(db, sub)
    return {"stopped": len(lapsed)}
