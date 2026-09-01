"""Cashback withdrawal requests — money-safety rules (explicit product
decision, see plan): the requested amount is deducted from MT5Account.balance
the instant a request is created (so a second request can't double-spend the
same balance while this one is still pending), refunded in full if a
super_admin rejects it, and only logged as a WalletTransaction debit once a
super_admin approves it — that's the customer-facing "transaction history"
entry. Mirrors rebate_calculation.py's shape: atomic balance/ledger mutation
lives here, not in the router.
"""
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.broker import Broker
from app.models.mt5_account import MT5Account
from app.models.notification import Notification
from app.models.user import User
from app.models.wallet_transaction import WalletTransaction
from app.models.withdrawal_request import WithdrawalRequest

_METHOD_LABELS = {
    "crypto": "Crypto",
    "bank_wire": "Bank wire",
    "fund_mt5": "Fund same MT5 account",
}


def _notify_admins_pending_withdrawal(db: Session, request: WithdrawalRequest, user_email: str):
    admins = db.query(User).filter(User.role == "super_admin").all()
    for admin in admins:
        db.add(
            Notification(
                recipient_email=admin.email,
                type="withdrawal_pending_review",
                title="New withdrawal request awaiting review",
                body=f"{user_email} requested a {_METHOD_LABELS.get(request.method, request.method)} withdrawal of {request.amount}.",
                related_type="withdrawal_request",
                related_id=request.id,
            )
        )
    db.commit()


def _notify_user_reviewed(db: Session, request: WithdrawalRequest, user_email: str):
    verb = "approved" if request.status == "approved" else "rejected"
    db.add(
        Notification(
            recipient_email=user_email,
            type="withdrawal_reviewed",
            title=f"Withdrawal request {verb}",
            body=f"Your {_METHOD_LABELS.get(request.method, request.method)} withdrawal of {request.amount} was {verb}.",
            related_type="withdrawal_request",
            related_id=request.id,
        )
    )
    db.commit()


def create_withdrawal_request(
    db: Session,
    user_email: str,
    mt5_account_id: str,
    amount: float,
    method: str,
    destination_details: dict,
) -> dict:
    account = db.query(MT5Account).filter(MT5Account.id == mt5_account_id).first()
    if not account or account.user_email != user_email:
        raise ValueError("MT5 account not found")

    broker = db.query(Broker).filter(Broker.id == account.broker_id).first()
    if not broker or method not in (broker.withdrawal_methods or []):
        raise ValueError("This broker does not offer that withdrawal method")

    if amount <= 0:
        raise ValueError("Amount must be greater than zero")
    # Compare in whole cents — balance accumulates via repeated float
    # addition (rebate credits) and can drift by fractions of a cent, which
    # would otherwise reject an amount that matches the displayed balance.
    if round(amount * 100) > round(account.balance * 100):
        raise ValueError("Amount exceeds available balance")

    # Reserve the funds immediately — see module docstring.
    account.balance -= amount

    request = WithdrawalRequest(
        mt5_account_id=mt5_account_id,
        amount=amount,
        method=method,
        destination_details=destination_details or {},
        status="pending",
    )
    db.add(request)
    db.commit()
    db.refresh(request)

    _notify_admins_pending_withdrawal(db, request, user_email)
    return enrich_withdrawal_requests(db, [request])[0]


def review_withdrawal_request(
    db: Session,
    request_id: str,
    decision: str,
    admin_note: Optional[str],
    admin_email: str,
) -> dict:
    request = db.query(WithdrawalRequest).filter(WithdrawalRequest.id == request_id).first()
    if not request:
        raise ValueError("Withdrawal request not found")
    if request.status != "pending":
        raise ValueError("This request has already been reviewed")

    account = db.query(MT5Account).filter(MT5Account.id == request.mt5_account_id).first()
    if not account:
        raise ValueError("MT5 account not found")

    if decision == "approve":
        request.status = "approved"
        db.add(
            WalletTransaction(
                mt5_account_id=account.id,
                type="debit",
                amount=request.amount,
                description=f"Withdrawal · {_METHOD_LABELS.get(request.method, request.method)}",
            )
        )
        # No balance change — already deducted when the request was created.
    else:
        request.status = "rejected"
        account.balance += request.amount  # refund the reservation

    request.admin_note = admin_note
    request.reviewed_by = admin_email
    request.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(request)

    _notify_user_reviewed(db, request, account.user_email)
    return enrich_withdrawal_requests(db, [request])[0]


def enrich_withdrawal_requests(db: Session, requests: List[WithdrawalRequest]) -> List[dict]:
    if not requests:
        return []
    account_ids = {r.mt5_account_id for r in requests}
    accounts = {a.id: a for a in db.query(MT5Account).filter(MT5Account.id.in_(account_ids)).all()}
    broker_ids = {a.broker_id for a in accounts.values()}
    brokers = {b.id: b for b in db.query(Broker).filter(Broker.id.in_(broker_ids)).all()}

    result = []
    for r in requests:
        account = accounts.get(r.mt5_account_id)
        broker = brokers.get(account.broker_id) if account else None
        if not account or not broker:
            continue
        result.append(
            {
                "id": r.id,
                "mt5_account_id": r.mt5_account_id,
                "broker_name": broker.name,
                "mt5_number": account.mt5_number,
                "amount": r.amount,
                "method": r.method,
                "destination_details": r.destination_details,
                "status": r.status,
                "admin_note": r.admin_note,
                "created_at": r.created_at,
                "reviewed_at": r.reviewed_at,
            }
        )
    return result


def list_my_withdrawal_requests(db: Session, user_email: str) -> List[dict]:
    accounts = db.query(MT5Account).filter(MT5Account.user_email == user_email).all()
    if not accounts:
        return []
    requests = (
        db.query(WithdrawalRequest)
        .filter(WithdrawalRequest.mt5_account_id.in_({a.id for a in accounts}))
        .order_by(WithdrawalRequest.created_at.desc())
        .all()
    )
    return enrich_withdrawal_requests(db, requests)


def list_all_withdrawal_requests(db: Session, status_filter: Optional[str] = None) -> List[dict]:
    query = db.query(WithdrawalRequest)
    if status_filter:
        query = query.filter(WithdrawalRequest.status == status_filter)
    requests = query.order_by(WithdrawalRequest.created_at.desc()).all()
    return enrich_withdrawal_requests(db, requests)
