from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.ad_banner import AdBanner
from app.models.broker import Broker
from app.schemas.ad_banner import (
    PAGE_BANNER_SLOTS,
    STATUSES,
    is_valid_page_slot,
    is_valid_banner_region,
    AdBannerUpsert,
    AdBanner as AdBannerSchema,
)
from app.utils.auth import get_current_user
from app.utils.cache import purge_public_cache
from app.models.user import User

router = APIRouter(prefix="/ad-banners", tags=["ad-banners"])

ALLOWED_ROLES = {"super_admin", "broker"}


def require_roles(roles: set):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker


@router.get("/", response_model=List[AdBannerSchema])
def list_banners(
    page: Optional[str] = None,
    slot: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    q = db.query(AdBanner)
    if page:
        q = q.filter(AdBanner.page == page)
    if slot:
        q = q.filter(AdBanner.slot == slot)
    return q.order_by(AdBanner.page, AdBanner.slot, AdBanner.region).all()


@router.put("/{page}/{slot}/{region}", response_model=AdBannerSchema)
def set_banner(
    page: str,
    slot: str,
    region: str,
    payload: AdBannerUpsert,
    db: Session = Depends(get_db),
    # Sitewide ad-slot curation, not scoped to "my own broker" — admin-only,
    # same reasoning as broker_placements.py.
    current_user: User = Depends(require_roles({"super_admin"})),
):
    """Create or update the banner ad content for this page+slot+region.
    `region` is "default" for the fallback content, a coverage region code
    (e.g. "europe"), or an ISO country code (e.g. "US") to show different
    banner content to visitors detected in that region or country."""
    if not is_valid_page_slot(page, slot):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid page/slot. Available: {PAGE_BANNER_SLOTS}",
        )
    if not is_valid_banner_region(region):
        raise HTTPException(
            status_code=400,
            detail='Invalid region. Must be "default", a valid region code, or a valid ISO country code',
        )
    if payload.status not in STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(sorted(STATUSES))}")
    if not db.query(Broker).filter(Broker.id == payload.broker_id).first():
        raise HTTPException(status_code=400, detail="Invalid broker selected")

    banner = (
        db.query(AdBanner)
        .filter(AdBanner.page == page, AdBanner.slot == slot, AdBanner.region == region)
        .first()
    )
    if banner:
        for field, value in payload.model_dump().items():
            setattr(banner, field, value)
    else:
        banner = AdBanner(page=page, slot=slot, region=region, **payload.model_dump())
        db.add(banner)
    db.commit()
    db.refresh(banner)
    purge_public_cache()
    return banner


@router.delete("/{page}/{slot}/{region}", status_code=status.HTTP_204_NO_CONTENT)
def clear_banner(
    page: str,
    slot: str,
    region: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles({"super_admin"})),
):
    """Remove the banner ad content for this page+slot+region. Idempotent."""
    banner = (
        db.query(AdBanner)
        .filter(AdBanner.page == page, AdBanner.slot == slot, AdBanner.region == region)
        .first()
    )
    if banner:
        db.delete(banner)
        db.commit()
        purge_public_cache()
