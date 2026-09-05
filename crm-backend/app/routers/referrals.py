"""Admin-facing referral stats — crm-backend's half of plan.md Phase 3's
referrals.py split. The client-owned /me* endpoints live only on
user-backend (clean split, no duplication)."""
from collections import Counter
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend_shared.database import get_db
from backend_shared.models.user import User
from backend_shared.schemas.referral import AdminReferralStats, ClientReferralSummary
from backend_shared.utils.active_users import active_account_counts, active_user_emails
from backend_shared.utils.time_buckets import bucket_counts
from backend_shared.auth.rbac import require_roles

router = APIRouter(prefix="/referrals", tags=["referrals"])

ADMIN_STATS_ROLES = {"super_admin", "broker"}


def _build_stats(users: List[User], active_emails: set) -> dict:
    by_country: Counter = Counter()
    for u in users:
        by_country[u.country_code or "unknown"] += 1

    timestamps = [u.created_at for u in users]

    return {
        "total": len(users),
        "active": sum(1 for u in users if u.email in active_emails),
        "by_country": dict(by_country),
        "weekly": bucket_counts(timestamps, "week"),
        "monthly": bucket_counts(timestamps, "month"),
    }


@router.get("/admin/stats", response_model=AdminReferralStats)
def get_admin_referral_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ADMIN_STATS_ROLES)),
):
    clients = db.query(User).filter(User.role == "client").all()
    all_referred = db.query(User).filter(User.referred_by.isnot(None)).all()
    active_emails = active_user_emails(db)

    stats = _build_stats(all_referred, active_emails)

    account_counts = active_account_counts(db, {u.email for u in all_referred})

    referred_by_client_email = Counter(u.referred_by for u in all_referred if u.referred_by)
    active_by_client_email: Counter = Counter()
    active_accounts_by_client_email: Counter = Counter()
    for u in all_referred:
        if not u.referred_by:
            continue
        if u.email in active_emails:
            active_by_client_email[u.referred_by] += 1
        active_accounts_by_client_email[u.referred_by] += account_counts.get(u.email, 0)

    by_client = [
        ClientReferralSummary(
            client_email=c.email,
            client_name=c.name,
            referral_code=c.referral_code,
            total=referred_by_client_email.get(c.email, 0),
            active=active_by_client_email.get(c.email, 0),
            active_accounts=active_accounts_by_client_email.get(c.email, 0),
        )
        for c in clients
    ]
    by_client.sort(key=lambda c: c.total, reverse=True)

    return AdminReferralStats(**stats, by_client=by_client)
