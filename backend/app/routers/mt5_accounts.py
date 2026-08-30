import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.broker import Broker
from app.models.mt5_account import MT5Account
from app.models.wallet_transaction import WalletTransaction
from app.models.user import User
from app.schemas.mt5_account import (
    MT5AccountCreate,
    MT5Account as MT5AccountSchema,
    WalletTransaction as WalletTransactionSchema,
)
from app.utils.active_users import active_user_emails
from app.utils.auth import get_current_user
from app.utils.encryption import encrypt_field
from app.services import metaapi_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mt5-accounts", tags=["mt5-accounts"])

ADMIN_STATS_ROLES = {"super_admin", "broker"}


def require_roles(roles: set):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker


def _to_schema(account: MT5Account, broker: Broker) -> MT5AccountSchema:
    return MT5AccountSchema(
        id=account.id,
        broker_id=broker.id,
        broker_name=broker.name,
        broker_img_src=broker.img_src,
        mt5_number=account.mt5_number,
        account_type=account.account_type,
        balance=account.balance,
        lifetime_earned=account.lifetime_earned,
        metaapi_connection_status=account.metaapi_connection_status,
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


@router.get("/me", response_model=List[MT5AccountSchema])
def list_my_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """The signed-in user's linked MT5 accounts, each with its own cashback
    wallet (balance / lifetime_earned). A user can have several accounts,
    including more than one with the same broker."""
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

    result = []
    for a in accounts:
        broker = brokers.get(a.broker_id)
        if not broker:
            continue
        result.append(_to_schema(a, broker))
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
