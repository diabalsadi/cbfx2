from collections import Counter
from datetime import date, datetime, timedelta, timezone
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
from app.utils.auth import get_current_user

router = APIRouter(prefix="/referrals", tags=["referrals"])

ADMIN_STATS_ROLES = {"super_admin", "broker"}

WEEKS_BACK = 12
MONTHS_BACK = 12


def require_roles(roles: set):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker


def _week_start(dt: datetime) -> date:
    d = dt.date() if isinstance(dt, datetime) else dt
    return d - timedelta(days=d.weekday())


def _month_start(dt: datetime) -> date:
    d = dt.date() if isinstance(dt, datetime) else dt
    return d.replace(day=1)


def _months_before(base: date, n: int) -> date:
    total = base.year * 12 + (base.month - 1) - n
    year, month = divmod(total, 12)
    return date(year, month + 1, 1)


def _build_stats(users: List[User]) -> dict:
    now = datetime.now(timezone.utc)

    by_country: Counter = Counter()
    for u in users:
        by_country[u.country_code or "unknown"] += 1

    current_week = _week_start(now)
    week_starts = [current_week - timedelta(weeks=i) for i in range(WEEKS_BACK - 1, -1, -1)]
    week_counts = {ws: 0 for ws in week_starts}

    current_month = _month_start(now)
    month_starts = [_months_before(current_month, i) for i in range(MONTHS_BACK - 1, -1, -1)]
    month_counts = {ms: 0 for ms in month_starts}

    for u in users:
        if u.created_at is None:
            continue
        ws = _week_start(u.created_at)
        if ws in week_counts:
            week_counts[ws] += 1
        ms = _month_start(u.created_at)
        if ms in month_counts:
            month_counts[ms] += 1

    return {
        "total": len(users),
        "by_country": dict(by_country),
        "weekly": [{"label": ws.isoformat(), "count": week_counts[ws]} for ws in week_starts],
        "monthly": [{"label": ms.strftime("%Y-%m"), "count": month_counts[ms]} for ms in month_starts],
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
    return _build_stats(referred)


@router.get("/admin/stats", response_model=AdminReferralStats)
def get_admin_referral_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ADMIN_STATS_ROLES)),
):
    clients = db.query(User).filter(User.role == "client").all()
    all_referred = db.query(User).filter(User.referred_by.isnot(None)).all()

    stats = _build_stats(all_referred)

    referred_by_client_email = Counter(u.referred_by for u in all_referred if u.referred_by)
    by_client = [
        ClientReferralSummary(
            client_email=c.email,
            client_name=c.name,
            referral_code=c.referral_code,
            total=referred_by_client_email.get(c.email, 0),
        )
        for c in clients
    ]
    by_client.sort(key=lambda c: c.total, reverse=True)

    return AdminReferralStats(**stats, by_client=by_client)
