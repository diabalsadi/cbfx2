"""Read-only broker list/detail + user rating submission — duplicated from
crm-backend (the owner of the full brokers CRUD) per plan.md Phase 3's
mixed-file split.

Note: list_brokers/get_broker below keep their original
require_roles({"super_admin", "broker"}) gate unchanged (preserving
existing behavior, not "no behavior change" reinterpreted) — despite the
plan calling this pair "read-only list/detail" as if user-facing, they are
NOT reachable by a plain "user"/"client" role today. Worth confirming
against actual crm/user-frontend usage before wiring user-frontend to call
these two specifically; submit_broker_rating/get_my_broker_rating are
genuinely open to any signed-in user and need no such caveat.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from backend_shared.database import get_db
from backend_shared.models.broker import Broker
from backend_shared.models.broker_rating import BrokerRating
from backend_shared.schemas.broker import Broker as BrokerSchema
from backend_shared.schemas.broker_rating import BrokerRatingSubmit, BrokerRatingOut
from backend_shared.utils.auth import get_current_user
from backend_shared.utils.cache import purge_public_cache
from backend_shared.models.user import User
from backend_shared.auth.rbac import require_roles

router = APIRouter(prefix="/brokers", tags=["brokers"])

ALLOWED_ROLES = {"super_admin", "broker"}


@router.get("/", response_model=List[BrokerSchema])
def list_brokers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    q = db.query(Broker)
    if current_user.role != "super_admin":
        # A "broker"-role account only manages its own listing(s) — not
        # every broker in the system.
        q = q.filter(Broker.owner_email == current_user.email)
    return q.order_by(Broker.created_at.desc()).all()


@router.get("/{broker_id}", response_model=BrokerSchema)
def get_broker(
    broker_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    broker = db.query(Broker).filter(Broker.id == broker_id).first()
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    if current_user.role != "super_admin" and broker.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="Not authorised")
    return broker


# ── User-submitted ratings (1-5) ─────────────────────────────────────────
# Distinct from the super_admin-only `rating` field (0-10 editorial score,
# crm-backend only) — this is any signed-in visitor's own opinion, averaged
# and shown alongside the editorial score rather than replacing it.


@router.post("/{broker_id}/rating", response_model=BrokerRatingOut)
def submit_broker_rating(
    broker_id: str,
    payload: BrokerRatingSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Any signed-in user may rate any broker — upserts their own rating
    rather than allowing duplicates (see uq_broker_rating_broker_user)."""
    broker = db.query(Broker).filter(Broker.id == broker_id).first()
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")

    existing = (
        db.query(BrokerRating)
        .filter(BrokerRating.broker_id == broker_id, BrokerRating.user_email == current_user.email)
        .first()
    )
    if existing:
        existing.rating = payload.rating
    else:
        existing = BrokerRating(
            broker_id=broker_id, user_email=current_user.email, rating=payload.rating
        )
        db.add(existing)
    db.commit()
    db.refresh(existing)
    # The public aggregate (user_rating_avg/count on PublicBrokerOffer) just changed.
    purge_public_cache()
    return existing


@router.get("/{broker_id}/rating/me", response_model=Optional[BrokerRatingOut])
def get_my_broker_rating(
    broker_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """None when this user hasn't rated this broker yet — lets the detail
    page distinguish "no rating yet" from an actual 1-5 value to pre-fill."""
    return (
        db.query(BrokerRating)
        .filter(BrokerRating.broker_id == broker_id, BrokerRating.user_email == current_user.email)
        .first()
    )
