"""Customer-facing copy-trading subscriptions — the follower side of
METAAPI_INTEGRATION_ARCHITECTURE.md §10 step 6. Subscribing links one of the
customer's own MT5 accounts to a live CopyTrader's strategy so their trades
are actually mirrored, not just displayed as curated stats.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.broker import Broker
from app.models.copy_trader import CopyTrader
from app.models.copy_subscription import CopySubscription as CopySubscriptionModel
from app.models.mt5_account import MT5Account
from app.models.user import User
from app.schemas.copy_subscription import CopySubscriptionCreate, CopySubscription as CopySubscriptionSchema
from app.utils.auth import get_current_user
from app.utils.encryption import encrypt_field
from app.services import metaapi_client, copyfactory_client
from app.services.copyfactory_sync import stop_copy_subscription

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/copy-subscriptions", tags=["copy-subscriptions"])

# Mirrors backend/app/services/stripe_client.py's gating rule (and
# frontend/helpers/subscription.ts's UNLOCKED_STATUSES) — kept as its own
# server-side check because ProGate is a frontend-only gate today, and these
# endpoints move real money/trading risk, so they shouldn't rely solely on
# the client-side blur.
_UNLOCKED_STATUSES = {"active", "trialing"}


def require_pro_access(current_user: User = Depends(get_current_user)) -> User:
    if current_user.subscription_status not in _UNLOCKED_STATUSES:
        raise HTTPException(status_code=403, detail="An active Signals + Copy Trading subscription is required")
    return current_user


def _to_schema(sub: CopySubscriptionModel, trader: CopyTrader, account: MT5Account, broker: Broker) -> CopySubscriptionSchema:
    return CopySubscriptionSchema(
        id=sub.id,
        copy_trader_id=trader.id,
        copy_trader_name=trader.name,
        mt5_account_id=account.id,
        broker_name=broker.name,
        mt5_number=account.mt5_number,
        multiplier=sub.multiplier,
        status=sub.status,
        metaapi_connection_status=sub.metaapi_connection_status,
        created_at=sub.created_at,
    )


@router.get("/me", response_model=List[CopySubscriptionSchema])
def list_my_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """The signed-in user's own copy subscriptions — never returns any
    password field. Available to any signed-in user (not gated behind
    require_pro_access) so an existing subscriber doesn't lose visibility
    into what they're copying if their subscription lapses; only creating a
    new one requires active access."""
    subs = (
        db.query(CopySubscriptionModel)
        .filter(CopySubscriptionModel.user_email == current_user.email)
        .order_by(CopySubscriptionModel.created_at.desc())
        .all()
    )
    if not subs:
        return []

    traders = {t.id: t for t in db.query(CopyTrader).filter(CopyTrader.id.in_({s.copy_trader_id for s in subs})).all()}
    accounts = {a.id: a for a in db.query(MT5Account).filter(MT5Account.id.in_({s.mt5_account_id for s in subs})).all()}
    brokers = {b.id: b for b in db.query(Broker).filter(Broker.id.in_({a.broker_id for a in accounts.values()})).all()}

    result = []
    for sub in subs:
        trader = traders.get(sub.copy_trader_id)
        account = accounts.get(sub.mt5_account_id)
        broker = brokers.get(account.broker_id) if account else None
        if not trader or not account or not broker:
            continue
        result.append(_to_schema(sub, trader, account, broker))
    return result


@router.post("", response_model=CopySubscriptionSchema, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    payload: CopySubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pro_access),
):
    """Subscribes one of the customer's own MT5 accounts to a live trader's
    strategy. Provisions a *separate* MetaApi trading-account registration
    for this account using the real trading password supplied here — never
    reuses MT5Account.metaapi_account_id, which is registered read-only for
    cashback tracking and must stay that way. See CopySubscription's model
    docstring."""
    trader = db.query(CopyTrader).filter(CopyTrader.id == payload.copy_trader_id).first()
    if not trader or not trader.is_live or not trader.copyfactory_strategy_id:
        raise HTTPException(status_code=400, detail="This trader is not available for live copying")

    account = (
        db.query(MT5Account)
        .filter(MT5Account.id == payload.mt5_account_id, MT5Account.user_email == current_user.email)
        .first()
    )
    if not account:
        raise HTTPException(status_code=400, detail="Invalid MT5 account")
    if not account.server or not account.platform:
        raise HTTPException(status_code=400, detail="This account is missing its server/platform — reconnect it first")

    broker = db.query(Broker).filter(Broker.id == account.broker_id).first()
    if not broker:
        raise HTTPException(status_code=400, detail="Invalid MT5 account")

    existing = (
        db.query(CopySubscriptionModel)
        .filter(
            CopySubscriptionModel.mt5_account_id == account.id,
            CopySubscriptionModel.copy_trader_id == trader.id,
            CopySubscriptionModel.status != "stopped",
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already copying this trader on this account")

    trading_password = payload.trading_password.strip()
    if not trading_password:
        raise HTTPException(status_code=400, detail="Trading password is required")
    multiplier = payload.multiplier
    if multiplier <= 0:
        raise HTTPException(status_code=400, detail="Multiplier must be positive")

    sub = CopySubscriptionModel(
        user_email=current_user.email,
        copy_trader_id=trader.id,
        mt5_account_id=account.id,
        multiplier=multiplier,
        trading_password_encrypted=encrypt_field(trading_password),
        metaapi_connection_status="not_connected",
    )

    if metaapi_client.configured():
        try:
            result = await metaapi_client.provision_account(
                login=account.mt5_number,
                server=account.server,
                platform=account.platform,
                investor_password=trading_password,
                name=f"copy · {current_user.email} · {trader.name} · {account.mt5_number}",
            )
            sub.metaapi_account_id = result["metaapi_account_id"]
            sub.metaapi_connection_status = result["status"]
            if sub.metaapi_connection_status == "connected":
                await copyfactory_client.subscribe(
                    sub.metaapi_account_id, trader.copyfactory_strategy_id, multiplier, name=account.mt5_number
                )
                sub.copyfactory_subscriber_id = sub.metaapi_account_id
                sub.status = "active"
        except Exception:
            logger.exception("Copy-subscription provisioning failed for %s / trader %s", current_user.email, trader.id)
            sub.metaapi_connection_status = "error"
            sub.status = "error"

    db.add(sub)
    db.commit()
    db.refresh(sub)
    return _to_schema(sub, trader, account, broker)


@router.delete("/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def stop_subscription(
    subscription_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Customer-initiated stop for one specific subscription — shares its
    teardown (CopyFactory unsubscribe, MetaApi undeploy, password wipe) with
    the automatic lapsed-subscription sweep in copyfactory_sync.py, which
    handles the *system*-initiated case of a lapsed/unrenewed billing
    subscription."""
    sub = (
        db.query(CopySubscriptionModel)
        .filter(CopySubscriptionModel.id == subscription_id, CopySubscriptionModel.user_email == current_user.email)
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    await stop_copy_subscription(db, sub)
