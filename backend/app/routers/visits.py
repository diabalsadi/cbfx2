from collections import Counter
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.visit import Visit
from app.schemas.visit import VisitStats
from app.utils.auth import get_current_user
from app.utils.time_buckets import bucket_counts

router = APIRouter(prefix="/visits", tags=["visits"])

STATS_ROLES = {"super_admin", "broker"}


def require_roles(roles: set):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker


@router.get("/stats", response_model=VisitStats)
def get_visit_stats(
    country: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(STATS_ROLES)),
):
    all_visits = db.query(Visit).all()
    by_country = Counter(v.country_code or "unknown" for v in all_visits)

    filtered = (
        [v for v in all_visits if (v.country_code or "unknown") == country]
        if country
        else all_visits
    )
    timestamps = [v.created_at for v in filtered]

    return VisitStats(
        total=len(filtered),
        by_country=dict(by_country),
        daily=bucket_counts(timestamps, "day"),
        weekly=bucket_counts(timestamps, "week"),
        monthly=bucket_counts(timestamps, "month"),
        yearly=bucket_counts(timestamps, "year"),
    )
