from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.market_price import MarketPrice as MarketPriceModel
from app.schemas.market_price import MarketPrice, MarketPriceCreate, MarketPriceUpdate
from app.utils.auth import get_current_user
from app.utils.cache import purge_public_cache
from app.models.user import User

router = APIRouter(prefix="/market-prices", tags=["market-prices"])

ALLOWED_ROLES = {"super_admin", "editor"}


def require_roles(roles: set):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker


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
