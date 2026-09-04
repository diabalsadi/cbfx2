from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend_shared.database import get_db
from backend_shared.models.user import User
from backend_shared.models.visit import Visit
from backend_shared.schemas.user import ADMIN_ROLES
from backend_shared.utils.auth import get_current_user_optional
from backend_shared.utils.geo import detect_region, extract_client_ip

router = APIRouter(prefix="/geo", tags=["geo"])


@router.get("/detect")
def detect_visitor_region(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Public — best-effort IP geolocation into a broker coverage region.
    Persists the result on the user record when the caller is authenticated,
    so it stays fresh across visits without requiring a re-registration. Also
    logs a Visit for the admin overview's visitors-by-country chart — this
    fires once per app mount site-wide, so it doubles as a lightweight
    visitor ping. Admin-portal staff are excluded so checking the dashboard
    doesn't inflate the visitor count. At most one Visit per visitor per
    calendar day (keyed by account email when signed in, otherwise the
    anonymous X-Visitor-Id header) so a page refresh doesn't count as a new
    visitor."""
    ip = extract_client_ip(request)
    country_code, region = detect_region(ip)

    changed = False
    if current_user is not None:
        if region is not None and current_user.region != region:
            current_user.region = region
            changed = True
        if country_code is not None and current_user.country_code != country_code:
            current_user.country_code = country_code
            changed = True

    is_staff_visit = current_user is not None and current_user.role in ADMIN_ROLES
    if not is_staff_visit:
        if current_user is not None:
            visitor_key = f"user:{current_user.email}"
        else:
            visitor_id = request.headers.get("X-Visitor-Id")
            visitor_key = f"anon:{visitor_id}" if visitor_id else None

        already_visited_today = False
        if visitor_key:
            today_start = datetime.now(timezone.utc).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            already_visited_today = (
                db.query(Visit)
                .filter(Visit.visitor_key == visitor_key, Visit.created_at >= today_start)
                .first()
                is not None
            )

        if not already_visited_today:
            db.add(Visit(country_code=country_code, region=region, visitor_key=visitor_key))
            changed = True

    if changed:
        db.commit()

    return {
        "ip": ip,
        "country_code": country_code,
        "region": region,
    }
