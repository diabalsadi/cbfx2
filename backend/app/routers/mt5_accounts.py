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
from app.utils.auth import get_current_user

router = APIRouter(prefix="/mt5-accounts", tags=["mt5-accounts"])


def _to_schema(account: MT5Account, broker: Broker) -> MT5AccountSchema:
    return MT5AccountSchema(
        id=account.id,
        broker_id=broker.id,
        broker_name=broker.name,
        broker_img_src=broker.img_src,
        mt5_number=account.mt5_number,
        balance=account.balance,
        lifetime_earned=account.lifetime_earned,
        created_at=account.created_at,
    )


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
def add_account(
    payload: MT5AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Link another MT5 account to the signed-in user. Nothing stops linking
    a second (or third) account with the same broker — only the exact
    broker+number pair has to be unique across all users."""
    mt5_number = payload.mt5_number.strip()
    if not mt5_number:
        raise HTTPException(status_code=400, detail="MT5 account number is required")

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

    account = MT5Account(user_email=current_user.email, broker_id=broker.id, mt5_number=mt5_number)
    db.add(account)
    db.commit()
    db.refresh(account)
    return _to_schema(account, broker)
