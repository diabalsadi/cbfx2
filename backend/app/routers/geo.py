from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
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
    so it stays fresh across visits without requiring a re-registration."""
    ip = extract_client_ip(request)
    country_code, region = detect_region(ip)

    if current_user is not None and region is not None and current_user.region != region:
        current_user.region = region
        db.commit()

    return {
        "ip": ip,
        "country_code": country_code,
        "region": region,
    }
