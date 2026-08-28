"""Rebate calculation — the §6 pipeline from
METAAPI_INTEGRATION_ARCHITECTURE.md: TradeRecord x Broker.account_types[].cashback
-> TradeRecord.expected_amount. Runs as a pass over unpriced TradeRecord rows,
decoupled from how the trade data arrived — the MetaApi sync job today, and
the manual BrokerReport upload path (once parsed) is meant to converge here
too rather than duplicate this pricing logic.

expected_amount is a projection only — it never touches the wallet. Crediting
only happens when a super_admin issues a RebatePayout (see
create_rebate_payout below), which is the one thing that actually moves
money; expected_amount is just what they see as a reference while deciding
the actual_amount.
"""
import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.broker import Broker
from app.models.mt5_account import MT5Account
from app.models.rebate_payout import RebatePayout
from app.models.symbol_category import SymbolCategory
from app.models.trade_record import TradeRecord
from app.models.wallet_transaction import WalletTransaction

logger = logging.getLogger(__name__)


def _normalize_symbol(symbol: str) -> str:
    return symbol.strip().upper()


def _resolve_rate(cashback_rules: list, symbol: str, category: Optional[str]) -> Optional[float]:
    """An exact-symbol rule wins over a category rule when both exist (§5)."""
    symbol_match = None
    category_match = None
    for rule in cashback_rules:
        rule_symbol = rule.get("symbol")
        if rule_symbol and _normalize_symbol(rule_symbol) == symbol:
            symbol_match = rule.get("rate")
        elif rule.get("category") and category and rule["category"] == category:
            category_match = rule.get("rate")
    return symbol_match if symbol_match is not None else category_match


def calculate_rebates(db: Session) -> dict:
    """Prices every TradeRecord with expected_amount IS NULL. Never raises —
    a trade that can't be priced (missing account_type, no matching cashback
    rule, unmapped symbol category) is simply left unpriced rather than
    guessed at, and picked up again once an admin fixes the missing mapping.
    Does not touch WalletTransaction or MT5Account.balance — see module
    docstring."""
    pending = db.query(TradeRecord).filter(TradeRecord.expected_amount.is_(None)).all()
    if not pending:
        return {"processed": 0, "priced": 0, "unresolved": 0}

    account_ids = {t.mt5_account_id for t in pending}
    accounts = {a.id: a for a in db.query(MT5Account).filter(MT5Account.id.in_(account_ids)).all()}
    broker_ids = {a.broker_id for a in accounts.values()}
    brokers = {b.id: b for b in db.query(Broker).filter(Broker.id.in_(broker_ids)).all()}

    symbols = {_normalize_symbol(t.symbol) for t in pending}
    categories = {
        sc.symbol: sc.category
        for sc in db.query(SymbolCategory).filter(SymbolCategory.symbol.in_(symbols)).all()
    }

    priced = 0
    unresolved = 0
    for trade in pending:
        account = accounts.get(trade.mt5_account_id)
        broker = brokers.get(account.broker_id) if account else None
        if not account or not broker or not account.account_type:
            unresolved += 1
            continue

        account_type = next(
            (at for at in (broker.account_types or []) if at.get("name") == account.account_type),
            None,
        )
        if not account_type:
            unresolved += 1
            continue

        symbol = _normalize_symbol(trade.symbol)
        category = categories.get(symbol)
        rate = _resolve_rate(account_type.get("cashback") or [], symbol, category)
        if rate is None:
            unresolved += 1
            continue

        trade.expected_amount = trade.lots * rate
        priced += 1

    db.commit()
    return {"processed": len(pending), "priced": priced, "unresolved": unresolved}


def pending_payout_summary(db: Session) -> List[dict]:
    """One row per MT5 account with at least one unsettled, priced
    TradeRecord (expected_amount set, payout_id still null) — what the admin
    rebate-payouts screen lists to act on."""
    rows = (
        db.query(TradeRecord)
        .filter(TradeRecord.expected_amount.isnot(None), TradeRecord.payout_id.is_(None))
        .all()
    )
    if not rows:
        return []

    by_account: dict = {}
    for t in rows:
        entry = by_account.setdefault(t.mt5_account_id, {"expected_amount": 0.0, "trade_count": 0})
        entry["expected_amount"] += t.expected_amount
        entry["trade_count"] += 1

    account_ids = list(by_account.keys())
    accounts = {a.id: a for a in db.query(MT5Account).filter(MT5Account.id.in_(account_ids)).all()}
    broker_ids = {a.broker_id for a in accounts.values()}
    brokers = {b.id: b for b in db.query(Broker).filter(Broker.id.in_(broker_ids)).all()}

    summary = []
    for account_id, agg in by_account.items():
        account = accounts.get(account_id)
        if not account:
            continue
        broker = brokers.get(account.broker_id)
        summary.append(
            {
                "mt5_account_id": account_id,
                "user_email": account.user_email,
                "mt5_number": account.mt5_number,
                "broker_name": broker.name if broker else "",
                "expected_amount": agg["expected_amount"],
                "trade_count": agg["trade_count"],
            }
        )
    summary.sort(key=lambda r: r["expected_amount"], reverse=True)
    return summary


def create_rebate_payout(
    db: Session,
    mt5_account_id: str,
    actual_amount: float,
    note: Optional[str],
    admin_email: str,
) -> RebatePayout:
    """Settles every unpaid, priced TradeRecord for one account into a single
    RebatePayout, crediting actual_amount (not expected_amount — the admin
    decides the real figure) to the account's wallet. Raises ValueError if
    there's nothing pending to settle."""
    pending = (
        db.query(TradeRecord)
        .filter(
            TradeRecord.mt5_account_id == mt5_account_id,
            TradeRecord.expected_amount.isnot(None),
            TradeRecord.payout_id.is_(None),
        )
        .all()
    )
    if not pending:
        raise ValueError("No pending priced trades for this account")

    account = db.query(MT5Account).filter(MT5Account.id == mt5_account_id).first()
    if not account:
        raise ValueError("MT5 account not found")

    expected_total = sum(t.expected_amount for t in pending)

    payout = RebatePayout(
        mt5_account_id=mt5_account_id,
        expected_amount=expected_total,
        actual_amount=actual_amount,
        trade_count=len(pending),
        note=note,
        created_by=admin_email,
    )
    db.add(payout)
    db.flush()  # assign payout.id before trades reference it

    for t in pending:
        t.payout_id = payout.id

    db.add(
        WalletTransaction(
            mt5_account_id=mt5_account_id,
            type="credit",
            amount=actual_amount,
            description=f"Cashback payout · {len(pending)} trades",
        )
    )
    account.balance += actual_amount
    account.lifetime_earned += actual_amount

    db.commit()
    db.refresh(payout)
    return payout
