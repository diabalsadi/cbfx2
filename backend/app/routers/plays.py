from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.play import Play as PlayModel
from app.schemas.play import Play, PlayCreate, PlayUpdate
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/plays", tags=["plays"])


@router.get("", response_model=List[Play])
def list_open_plays(
    play_type: Optional[str] = Query(None, description="Filter by type: Scalp, Swing, Long-term"),
    db: Session = Depends(get_db)
):
    """Public — returns all open plays ordered newest first."""
    q = db.query(PlayModel).filter(PlayModel.status == "open")
    if play_type:
        q = q.filter(PlayModel.play_type == play_type)
    return q.order_by(PlayModel.opened_at.desc()).all()


@router.get("/all", response_model=List[Play])
def list_all_plays(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin-only — all plays regardless of status."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return db.query(PlayModel).order_by(PlayModel.created_at.desc()).all()


@router.get("/{play_id}", response_model=Play)
def get_play(play_id: str, db: Session = Depends(get_db)):
    """Public — single play detail."""
    play = db.query(PlayModel).filter(PlayModel.id == play_id).first()
    if not play:
        raise HTTPException(status_code=404, detail="Play not found")
    return play


@router.post("", response_model=Play, status_code=status.HTTP_201_CREATED)
def create_play(
    data: PlayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin-only — create a new play."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    play = PlayModel(**data.model_dump(), author_email=current_user.email)
    db.add(play)
    db.commit()
    db.refresh(play)
    return play


@router.put("/{play_id}", response_model=Play)
def update_play(
    play_id: str,
    data: PlayUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin-only — update a play (e.g. close it)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    play = db.query(PlayModel).filter(PlayModel.id == play_id).first()
    if not play:
        raise HTTPException(status_code=404, detail="Play not found")
    updates = data.model_dump(exclude_unset=True)
    # Auto-set closed_at when status changes to closed/cancelled
    if updates.get("status") in ("closed", "cancelled") and not updates.get("closed_at"):
        updates["closed_at"] = datetime.now(timezone.utc)
    for field, value in updates.items():
        setattr(play, field, value)
    db.commit()
    db.refresh(play)
    return play


@router.delete("/{play_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_play(
    play_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin-only — delete a play."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    play = db.query(PlayModel).filter(PlayModel.id == play_id).first()
    if not play:
        raise HTTPException(status_code=404, detail="Play not found")
    db.delete(play)
    db.commit()
