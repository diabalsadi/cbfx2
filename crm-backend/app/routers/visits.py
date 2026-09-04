from collections import Counter
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend_shared.database import get_db
from backend_shared.models.user import User
from backend_shared.models.visit import Visit
from backend_shared.schemas.visit import VisitStats
from backend_shared.utils.auth import get_current_user
from backend_shared.utils.time_buckets import bucket_counts
from backend_shared.auth.rbac import require_roles

router = APIRouter(prefix="/visits", tags=["visits"])

STATS_ROLES = {"super_admin", "broker"}

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
