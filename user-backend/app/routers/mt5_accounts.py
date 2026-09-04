import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend_shared.database import get_db
from backend_shared.models.broker import Broker
from backend_shared.models.copy_subscription import CopySubscription
from backend_shared.models.mt5_account import MT5Account
from backend_shared.models.wallet_transaction import WalletTransaction
from backend_shared.models.user import User
from backend_shared.schemas.mt5_account import (
    MT5AccountCreate,
    MT5Account as MT5AccountSchema,
    AdminMT5Account,
    WalletTransaction as WalletTransactionSchema,
)
from backend_shared.utils.active_users import active_user_emails
from backend_shared.utils.auth import get_current_user
from backend_shared.utils.encryption import encrypt_field, decrypt_field
from backend_shared.services import metaapi_client
from backend_shared.services.rebate_calculation import pending_amount_by_account
from backend_shared.auth.rbac import require_roles

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mt5-accounts", tags=["mt5-accounts"])

ADMIN_STATS_ROLES = {"super_admin", "broker"}

def _to_schema(account: MT5Account, broker: Broker, pending: float = 0.0) -> MT5AccountSchema:
    return MT5AccountSchema(
        id=account.id,
        broker_id=broker.id,
        broker_name=broker.name,
        broker_img_src=broker.img_src,
        mt5_number=account.mt5_number,
        account_type=account.account_type,
        balance=account.balance,
        lifetime_earned=account.lifetime_earned,
        pending_expected_amount=pending,
        metaapi_connection_status=account.metaapi_connection_status,
        withdrawal_methods=broker.withdrawal_methods or [],
        created_at=account.created_at,
    )


@router.get("/active-count")
def get_active_user_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ADMIN_STATS_ROLES)),
):
    """Count of users with a MetaApi-verified MT5 account at a
    cashback-eligible broker — see app/utils/active_users.py. Admin overview
    dashboard KPI. Site-wide for super_admin; a "broker" role account only
    sees users active with the broker listing it owns (see
    brokers.py's owner_email scoping) — not every other broker's users."""
    broker_id = None
    if current_user.role == "broker":
        broker = db.query(Broker).filter(Broker.owner_email == current_user.email).first()
        if not broker:
            return {"active_users": 0}
        broker_id = broker.id
    return {"active_users": len(active_user_emails(db, broker_id=broker_id))}


@router.get("/admin", response_model=List[AdminMT5Account])
def list_accounts_for_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ADMIN_STATS_ROLES)),
):
    """Admin visibility into every linked MT5 account's MetaApi connection
    health — gap-analysis item 3.2 / METAAPI_INTEGRATION_ARCHITECTURE.md §10
    step 5. Site-wide for super_admin; a "broker" role account only sees
    accounts at the broker it owns, same scoping as get_active_user_count."""
    query = db.query(MT5Account)
    if current_user.role == "broker":
        broker = db.query(Broker).filter(Broker.owner_email == current_user.email).first()
        if not broker:
            return []
        query = query.filter(MT5Account.broker_id == broker.id)

    accounts = query.order_by(MT5Account.created_at.desc()).all()
    brokers = {
        b.id: b
        for b in db.query(Broker).filter(Broker.id.in_({a.broker_id for a in accounts})).all()
    } if accounts else {}

    result = []
    for a in accounts:
        broker = brokers.get(a.broker_id)
        if not broker:
            continue
        result.append(
            AdminMT5Account(
                id=a.id,
                user_email=a.user_email,
                broker_id=broker.id,
                broker_name=broker.name,
                mt5_number=a.mt5_number,
                account_type=a.account_type,
                metaapi_connection_status=a.metaapi_connection_status,
                metaapi_last_synced_at=a.metaapi_last_synced_at,
                created_at=a.created_at,
            )
        )
    return result


@router.get("/me", response_model=List[MT5AccountSchema])
def list_my_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """The signed-in user's linked MT5 accounts, each with its own cashback
    wallet (balance / lifetime_earned / pending_expected_amount). A user can
    have several accounts, including more than one with the same broker."""
    accounts = (
        db.query(MT5Account)
        .filter(MT5Account.user_email == current_user.email)
        .order_by(MT5Account.created_at.desc())
        .all()
    )
    brokers = {
        b.id: b
        for b in db.query(Broker).filter(Broker.id.in_({a.broker_id for a in accounts})).all()
    } if accounts else {}
    pending_by_account = pending_amount_by_account(db, {a.id for a in accounts})

    result = []
    for a in accounts:
        broker = brokers.get(a.broker_id)
        if not broker:
            continue
        result.append(_to_schema(a, broker, pending=pending_by_account.get(a.id, 0.0)))
    return result


@router.get("/me/transactions", response_model=List[WalletTransactionSchema])
def list_my_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """The signed-in user's wallet history — money in (credits, e.g. cashback
    rebates) and money out (debits, e.g. withdrawals) — across every linked
    MT5 account, newest first."""
    accounts = (
        db.query(MT5Account).filter(MT5Account.user_email == current_user.email).all()
    )
    if not accounts:
        return []

    account_by_id = {a.id: a for a in accounts}
    brokers = {
        b.id: b
        for b in db.query(Broker).filter(Broker.id.in_({a.broker_id for a in accounts})).all()
    }

    transactions = (
        db.query(WalletTransaction)
        .filter(WalletTransaction.mt5_account_id.in_(account_by_id.keys()))
        .order_by(WalletTransaction.created_at.desc())
        .all()
    )

    result = []
    for t in transactions:
        account = account_by_id.get(t.mt5_account_id)
        broker = brokers.get(account.broker_id) if account else None
        if not account or not broker:
            continue
        result.append(
            WalletTransactionSchema(
                id=t.id,
                mt5_account_id=t.mt5_account_id,
                broker_name=broker.name,
                mt5_number=account.mt5_number,
                type=t.type,
                amount=t.amount,
                description=t.description,
                created_at=t.created_at,
            )
        )
    return result


@router.post("/", response_model=MT5AccountSchema, status_code=201)
async def add_account(
    payload: MT5AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Link another MT5 account to the signed-in user. Nothing stops linking
    a second (or third) account with the same broker — only the exact
    broker+number pair has to be unique across all users.

    Provisions the account with MetaApi for automated trade tracking.
    Provisioning failures don't block the link itself — the account is saved
    with metaapi_connection_status="error" and the external sync job (see
    METAAPI_INTEGRATION_ARCHITECTURE.md §4) can be extended to retry later;
    the customer isn't stuck because a third-party call happened to fail."""
    mt5_number = payload.mt5_number.strip()
    if not mt5_number:
        raise HTTPException(status_code=400, detail="MT5 account number is required")

    server = (payload.server or "").strip()
    if not server:
        raise HTTPException(status_code=400, detail="MT5 server name is required")

    platform = (payload.platform or "").strip().lower()
    if platform not in ("mt4", "mt5"):
        raise HTTPException(status_code=400, detail="Platform must be mt4 or mt5")

    investor_password = (payload.investor_password or "").strip()
    if not investor_password:
        raise HTTPException(status_code=400, detail="Investor (read-only) password is required")

    broker = db.query(Broker).filter(Broker.id == payload.broker_id, Broker.status == "active").first()
    if not broker:
        raise HTTPException(status_code=400, detail="Invalid broker selected")

    existing = (
        db.query(MT5Account)
        .filter(MT5Account.broker_id == broker.id, MT5Account.mt5_number == mt5_number)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="This MT5 account is already linked")

    account = MT5Account(
        user_email=current_user.email,
        broker_id=broker.id,
        mt5_number=mt5_number,
        server=server,
        platform=platform,
        investor_password_encrypted=encrypt_field(investor_password),
        account_type=payload.account_type,
        metaapi_connection_status="not_connected",
    )

    if metaapi_client.configured():
        try:
            result = await metaapi_client.provision_account(
                login=mt5_number,
                server=server,
                platform=platform,
                investor_password=investor_password,
                name=f"{current_user.email} · {broker.name} · {mt5_number}",
            )
            account.metaapi_account_id = result["metaapi_account_id"]
            account.metaapi_connection_status = result["status"]
        except Exception:
            logger.exception("MetaApi provisioning failed for %s / %s", broker.name, mt5_number)
            account.metaapi_connection_status = "error"

    db.add(account)
    db.commit()
    db.refresh(account)
    return _to_schema(account, broker)


# Shared eligibility for both the reconnect and remove endpoints below. An
# account in one of these statuses has either never worked (not_connected),
# is still mid-provisioning and might still resolve on its own (pending), or
# has definitively failed (error) — connected/deployed/idle are excluded
# since those represent (or recently represented) a working link, and
# neither retrying nor removing makes sense for those.
_BROKEN_LINK_STATUSES = {"not_connected", "pending", "error"}


@router.post("/{account_id}/reconnect", response_model=MT5AccountSchema)
async def reconnect_my_account(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retries MetaApi provisioning/deployment for a broken/never-connected
    account (see _BROKEN_LINK_STATUSES) — the customer-facing alternative to
    Remove, for when the account is worth another try instead of deleting
    (MetaApi just got configured, a transient error, etc).

    Idempotent/retryable like copy_traders.py's connect-live: if a prior
    attempt already got as far as creating a MetaApi account
    (provision_account can succeed even when its own deploy() call fails —
    see that function's docstring), this reuses that metaapi_account_id and
    just redeploys it, rather than registering a second duplicate account
    with MetaApi (which bills per registered account)."""
    account = (
        db.query(MT5Account)
        .filter(MT5Account.id == account_id, MT5Account.user_email == current_user.email)
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="MT5 account not found")

    if account.metaapi_connection_status not in _BROKEN_LINK_STATUSES:
        raise HTTPException(status_code=400, detail="This account doesn't need reconnecting")

    if not metaapi_client.configured():
        raise HTTPException(status_code=503, detail="MetaApi is not configured")

    broker = db.query(Broker).filter(Broker.id == account.broker_id).first()
    if not broker:
        raise HTTPException(status_code=400, detail="Invalid MT5 account")

    if not account.metaapi_account_id:
        investor_password = decrypt_field(account.investor_password_encrypted)
        if not investor_password:
            raise HTTPException(
                status_code=400, detail="Missing investor password — remove and re-add this account"
            )
        try:
            result = await metaapi_client.provision_account(
                login=account.mt5_number,
                server=account.server,
                platform=account.platform,
                investor_password=investor_password,
                name=f"{current_user.email} · {broker.name} · {account.mt5_number}",
            )
            account.metaapi_account_id = result["metaapi_account_id"]
            account.metaapi_connection_status = result["status"]
        except Exception:
            logger.exception("MetaApi reconnect provisioning failed for %s", account.id)
            account.metaapi_connection_status = "error"
    else:
        try:
            account.metaapi_connection_status = await metaapi_client.redeploy_and_check_status(
                account.metaapi_account_id
            )
        except Exception:
            logger.exception("MetaApi reconnect redeploy failed for %s", account.id)
            account.metaapi_connection_status = "error"

    db.commit()
    db.refresh(account)
    pending = pending_amount_by_account(db, {account.id}).get(account.id, 0.0)
    return _to_schema(account, broker, pending=pending)


@router.delete("/{account_id}", status_code=204)
async def remove_my_account(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lets a customer remove their own MT5 account link — but only ever a
    broken/unproven one (see _BROKEN_LINK_STATUSES). Blocked
    entirely if the account has any real financial history or a live copy
    subscription riding on it, since MT5Account cascades to
    WalletTransaction/TradeRecord/CopySubscription on delete
    (ON DELETE CASCADE) — this endpoint is for clearing out dead links, not
    for erasing a paper trail or silently orphaning a CopyFactory
    subscription. A connected/idle account isn't deletable here at all —
    contact support for that."""
    account = (
        db.query(MT5Account)
        .filter(MT5Account.id == account_id, MT5Account.user_email == current_user.email)
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="MT5 account not found")

    if account.metaapi_connection_status not in _BROKEN_LINK_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Only accounts that never connected or failed to connect can be removed this way",
        )

    has_transactions = (
        db.query(WalletTransaction).filter(WalletTransaction.mt5_account_id == account.id).first()
        is not None
    )
    if account.lifetime_earned > 0 or has_transactions:
        raise HTTPException(
            status_code=400,
            detail="This account has cashback history and can't be removed — contact support",
        )

    has_live_subscription = (
        db.query(CopySubscription)
        .filter(CopySubscription.mt5_account_id == account.id, CopySubscription.status != "stopped")
        .first()
        is not None
    )
    if has_live_subscription:
        raise HTTPException(
            status_code=400,
            detail="This account has an active copy-trading subscription — stop copying first",
        )

    if account.metaapi_account_id and metaapi_client.configured():
        try:
            await metaapi_client.remove_account(account.metaapi_account_id)
        except Exception:
            logger.exception("MetaApi account removal failed for %s", account.id)

    db.delete(account)
    db.commit()
