"""Defines "active user" for cashback/referral purposes — deliberately
stricter than just "signed up" or "linked an MT5 account": a user only
counts once MetaApi has actually verified their account is reachable, with
a broker that has real cashback pricing configured, not just added to the
platform. Used by both the referral stats (commission eligibility) and the
admin overview dashboard KPI.
"""
from typing import Dict, Optional, Set

from sqlalchemy.orm import Session

from app.models.broker import Broker
from app.models.mt5_account import MT5Account

# "connected" = actively synced at least once; "idle" = verified working,
# currently undeployed between sync cycles by design (see
# METAAPI_INTEGRATION_ARCHITECTURE.md §4) — both mean MetaApi has proven the
# account is real and reachable. "pending"/"error"/"not_connected" don't.
VERIFIED_STATUSES = {"connected", "idle"}


def _cashback_eligible_broker_ids(db: Session) -> Set[str]:
    """A broker only counts if it actually has cashback configured — a flat
    cashback_rate, or at least one account_type with a non-empty cashback
    list. Excludes brokers added to the platform but not yet priced."""
    eligible = set()
    for b in db.query(Broker).filter(Broker.status == "active").all():
        if b.cashback_rate and b.cashback_rate > 0:
            eligible.add(b.id)
            continue
        if any((at.get("cashback") or []) for at in (b.account_types or [])):
            eligible.add(b.id)
    return eligible


def active_user_emails(db: Session, broker_id: Optional[str] = None) -> Set[str]:
    """Every user with at least one MetaApi-verified MT5 account at a
    cashback-eligible broker. Callers intersect this against whatever
    subset of users they care about (all users, referred users, one
    client's referrals, ...). Pass broker_id to scope to a single broker's
    users (e.g. a "broker" role account's own overview stats) instead of
    site-wide."""
    eligible_broker_ids = _cashback_eligible_broker_ids(db)
    if broker_id is not None:
        eligible_broker_ids &= {broker_id}
    if not eligible_broker_ids:
        return set()
    rows = (
        db.query(MT5Account.user_email)
        .filter(
            MT5Account.broker_id.in_(eligible_broker_ids),
            MT5Account.metaapi_connection_status.in_(VERIFIED_STATUSES),
        )
        .distinct()
        .all()
    )
    return {r[0] for r in rows}


def active_account_counts(db: Session, user_emails: Optional[Set[str]] = None) -> Dict[str, int]:
    """Count of MetaApi-verified MT5 accounts per user email, at a
    cashback-eligible broker. Unlike active_user_emails (one bit per user —
    "do they have at least one?"), this counts every qualifying account, so a
    user with two verified accounts contributes 2 — used where the number of
    active accounts itself is the metric (e.g. per-affiliate account counts),
    not just whether the user counts as active at all."""
    eligible_broker_ids = _cashback_eligible_broker_ids(db)
    if not eligible_broker_ids:
        return {}
    query = db.query(MT5Account.user_email).filter(
        MT5Account.broker_id.in_(eligible_broker_ids),
        MT5Account.metaapi_connection_status.in_(VERIFIED_STATUSES),
    )
    if user_emails is not None:
        query = query.filter(MT5Account.user_email.in_(user_emails))

    counts: Dict[str, int] = {}
    for (email,) in query.all():
        counts[email] = counts.get(email, 0) + 1
    return counts
