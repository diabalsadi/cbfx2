"""client-owned referral info — user-backend's half of plan.md Phase 3's
referrals.py split. The admin-facing /admin/stats endpoint lives only on
crm-backend (clean split, no duplication — it has no user-facing
equivalent)."""
from collections import Counter
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend_shared.database import get_db
from backend_shared.models.user import User
from backend_shared.schemas.referral import ReferralInfo, ReferralStats
from backend_shared.utils.active_users import active_user_emails
from backend_shared.utils.time_buckets import bucket_counts
from backend_shared.auth.rbac import require_roles

router = APIRouter(prefix="/referrals", tags=["referrals"])


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
