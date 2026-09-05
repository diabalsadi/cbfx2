from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from backend_shared.database import get_db
from backend_shared.models.broker import Broker
from backend_shared.models.broker_placement import BrokerPlacement
from backend_shared.schemas.broker_placement import (
    SECTIONS,
    is_valid_placement_region,
    BrokerPlacementSet,
    BrokerPlacement as BrokerPlacementSchema,
)
from backend_shared.utils.auth import get_current_user
from backend_shared.utils.cache import purge_public_cache
from backend_shared.models.user import User
from backend_shared.auth.rbac import require_roles

router = APIRouter(prefix="/broker-placements", tags=["broker-placements"])

@router.get("/", response_model=List[BrokerPlacementSchema])
def list_placements(
    section: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    # Sitewide layout curation, not scoped to "my own broker" — admin-only,
    # same reasoning as set_placement/clear_placement below.
    current_user: User = Depends(require_roles({"super_admin"})),
):
    q = db.query(BrokerPlacement)
    if section:
        q = q.filter(BrokerPlacement.section == section)
    if region:
        q = q.filter(BrokerPlacement.region == region)
    return q.order_by(BrokerPlacement.section, BrokerPlacement.region, BrokerPlacement.position).all()


@router.put("/{section}/{region}/{position}", response_model=BrokerPlacementSchema)
def set_placement(
    section: str,
    region: str,
    position: int,
    payload: BrokerPlacementSet,
    db: Session = Depends(get_db),
    # Reassigning a sitewide layout slot to any broker isn't scoped to "my
    # own broker" the way brokers.py/campaigns.py are — it's homepage
    # curation, admin-only.
    current_user: User = Depends(require_roles({"super_admin"})),
):
    """Assign a broker to fill this section+region+slot. Upserts — replaces
    whatever broker currently occupies the slot, if any. `region` is "default"
    for the fallback order, a coverage region code (e.g. "europe"), or an ISO
    country code (e.g. "US") to order this section differently for visitors
    detected in that region or country."""
    if section not in SECTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid section. Must be one of: {', '.join(sorted(SECTIONS))}")
    if not is_valid_placement_region(region):
        raise HTTPException(
            status_code=400,
            detail='Invalid region. Must be "default", a valid region code, or a valid ISO country code',
        )
    if position < 1:
        raise HTTPException(status_code=400, detail="Position must be 1 or greater")

    broker = db.query(Broker).filter(Broker.id == payload.broker_id).first()
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")

    placement = (
        db.query(BrokerPlacement)
        .filter(
            BrokerPlacement.section == section,
            BrokerPlacement.region == region,
            BrokerPlacement.position == position,
        )
        .first()
    )
    if placement:
        placement.broker_id = payload.broker_id
    else:
        placement = BrokerPlacement(section=section, region=region, position=position, broker_id=payload.broker_id)
        db.add(placement)
    db.commit()
    db.refresh(placement)
    purge_public_cache()
    return placement


@router.delete("/{section}/{region}/{position}", status_code=status.HTTP_204_NO_CONTENT)
def clear_placement(
    section: str,
    region: str,
    position: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles({"super_admin"})),
):
    """Empty a slot. Idempotent — no error if the slot was already empty."""
    placement = (
        db.query(BrokerPlacement)
        .filter(
            BrokerPlacement.section == section,
            BrokerPlacement.region == region,
            BrokerPlacement.position == position,
        )
        .first()
    )
    if placement:
        db.delete(placement)
        db.commit()
        purge_public_cache()
