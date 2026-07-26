from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.copy_trader import CopyTrader as CopyTraderModel
from app.schemas.copy_trader import CopyTrader, CopyTraderCreate, CopyTraderUpdate
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/copy-traders", tags=["copy-traders"])


@router.get("", response_model=List[CopyTrader])
def list_copy_traders(
    strategy: Optional[str] = Query(None, description="Filter by strategy: Scalping, Swing, Position"),
    pair: Optional[str] = Query(None, description="Filter by traded pair, e.g. EUR/USD"),
    sort_by: str = Query("roi_12m", description="Sort field: roi_12m, roi_3m, roi_1m, followers, win_rate"),
    db: Session = Depends(get_db),
):
    """Public — returns active copy traders with optional filters and sorting."""
    q = db.query(CopyTraderModel).filter(CopyTraderModel.is_active == True)

    if strategy:
        q = q.filter(CopyTraderModel.strategy == strategy)

    traders = q.all()

    # Pair filter is post-processed (JSON column)
    if pair:
        traders = [t for t in traders if pair in (t.pairs or [])]

    # Sort
    sort_map = {
        "roi_12m": lambda t: t.roi_12m,
        "roi_3m": lambda t: t.roi_3m,
        "roi_1m": lambda t: t.roi_1m,
        "followers": lambda t: t.followers,
        "win_rate": lambda t: t.win_rate,
    }
    key_fn = sort_map.get(sort_by, lambda t: t.roi_12m)
    traders = sorted(traders, key=key_fn, reverse=True)

    return traders


@router.get("/{trader_id}", response_model=CopyTrader)
def get_copy_trader(trader_id: str, db: Session = Depends(get_db)):
    """Public — single trader detail."""
    trader = db.query(CopyTraderModel).filter(CopyTraderModel.id == trader_id).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")
    return trader


@router.post("", response_model=CopyTrader, status_code=status.HTTP_201_CREATED)
def create_copy_trader(
    data: CopyTraderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin-only — create a copy trader profile."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    trader = CopyTraderModel(**data.model_dump())
    db.add(trader)
    db.commit()
    db.refresh(trader)
    return trader


@router.put("/{trader_id}", response_model=CopyTrader)
def update_copy_trader(
    trader_id: str,
    data: CopyTraderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin-only — update a copy trader profile."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    trader = db.query(CopyTraderModel).filter(CopyTraderModel.id == trader_id).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(trader, field, value)
    db.commit()
    db.refresh(trader)
    return trader


@router.delete("/{trader_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_copy_trader(
    trader_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin-only — remove a copy trader profile."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    trader = db.query(CopyTraderModel).filter(CopyTraderModel.id == trader_id).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")
    db.delete(trader)
    db.commit()
