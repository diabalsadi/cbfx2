from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend_shared.database import get_db
from backend_shared.models.market_price import MarketPrice as MarketPriceModel
from backend_shared.schemas.market_price import MarketPrice, MarketPriceCreate, MarketPriceUpdate
from backend_shared.utils.auth import get_current_user
from backend_shared.utils.cache import purge_public_cache
from backend_shared.models.user import User
from backend_shared.auth.rbac import require_roles

router = APIRouter(prefix="/market-prices", tags=["market-prices"])

ALLOWED_ROLES = {"super_admin", "editor"}

@router.get("", response_model=List[MarketPrice])
def list_market_prices(db: Session = Depends(get_db)):
    """Public — returns all market price snapshots."""
    return db.query(MarketPriceModel).order_by(MarketPriceModel.symbol).all()


@router.post("", response_model=MarketPrice, status_code=status.HTTP_201_CREATED)
def create_market_price(
    data: MarketPriceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    """Admin-only — create a new market price entry."""
    existing = db.query(MarketPriceModel).filter(MarketPriceModel.symbol == data.symbol).first()
    if existing:
        raise HTTPException(status_code=400, detail="Symbol already exists")
    entry = MarketPriceModel(**data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    purge_public_cache()
    return entry


@router.put("/{symbol}", response_model=MarketPrice)
def update_market_price(
    symbol: str,
    data: MarketPriceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    """Admin-only — update price/change for a symbol."""
    entry = db.query(MarketPriceModel).filter(MarketPriceModel.symbol == symbol).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Symbol not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    purge_public_cache()
    return entry
