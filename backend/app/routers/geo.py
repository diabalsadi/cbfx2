from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.visit import Visit
from app.schemas.user import ADMIN_ROLES
from app.utils.auth import get_current_user_optional
from app.utils.geo import detect_region, extract_client_ip

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
    doesn't inflate the visitor count."""
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
        db.add(Visit(country_code=country_code, region=region))
        changed = True

    if changed:
        db.commit()

    return {
        "ip": ip,
        "country_code": country_code,
        "region": region,
    }
