from collections import Counter
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.referral import (
    AdminReferralStats,
    ClientReferralSummary,
    ReferralInfo,
    ReferralStats,
)
from app.utils.active_users import active_user_emails
from app.utils.auth import get_current_user
from app.utils.time_buckets import bucket_counts

router = APIRouter(prefix="/referrals", tags=["referrals"])

ADMIN_STATS_ROLES = {"super_admin", "broker"}


def require_roles(roles: set):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker


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


@router.get("/me", response_model=ReferralInfo)
def get_my_referral_info(current_user: User = Depends(require_roles({"client"}))):
    return {"referral_code": current_user.referral_code}


@router.get("/me/stats", response_model=ReferralStats)
def get_my_referral_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles({"client"})),
):
    referred = db.query(User).filter(User.referred_by == current_user.email).all()
    return _build_stats(referred, active_user_emails(db))


@router.get("/admin/stats", response_model=AdminReferralStats)
def get_admin_referral_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ADMIN_STATS_ROLES)),
):
    clients = db.query(User).filter(User.role == "client").all()
    all_referred = db.query(User).filter(User.referred_by.isnot(None)).all()
    active_emails = active_user_emails(db)

    stats = _build_stats(all_referred, active_emails)

    referred_by_client_email = Counter(u.referred_by for u in all_referred if u.referred_by)
    active_by_client_email: Counter = Counter()
    for u in all_referred:
        if u.referred_by and u.email in active_emails:
            active_by_client_email[u.referred_by] += 1

    by_client = [
        ClientReferralSummary(
            client_email=c.email,
            client_name=c.name,
            referral_code=c.referral_code,
            total=referred_by_client_email.get(c.email, 0),
            active=active_by_client_email.get(c.email, 0),
        )
        for c in clients
    ]
    by_client.sort(key=lambda c: c.total, reverse=True)

    return AdminReferralStats(**stats, by_client=by_client)
