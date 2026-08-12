from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.broker import Broker
from app.models.broker_placement import BrokerPlacement
from app.schemas.broker_placement import (
    SECTIONS,
    is_valid_placement_region,
    BrokerPlacementSet,
    BrokerPlacement as BrokerPlacementSchema,
)
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/broker-placements", tags=["broker-placements"])

ALLOWED_ROLES = {"super_admin", "broker"}


def require_roles(roles: set):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker


@router.get("/", response_model=List[BrokerPlacementSchema])
def list_placements(
    section: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
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
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
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
    return placement


@router.delete("/{section}/{region}/{position}", status_code=status.HTTP_204_NO_CONTENT)
def clear_placement(
    section: str,
    region: str,
    position: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
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
