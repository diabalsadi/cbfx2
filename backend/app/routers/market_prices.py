from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.market_price import MarketPrice as MarketPriceModel
from app.schemas.market_price import MarketPrice, MarketPriceCreate, MarketPriceUpdate
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/market-prices", tags=["market-prices"])


@router.get("", response_model=List[MarketPrice])
def list_market_prices(db: Session = Depends(get_db)):
    """Public — returns all market price snapshots."""
    return db.query(MarketPriceModel).order_by(MarketPriceModel.symbol).all()


@router.post("", response_model=MarketPrice, status_code=status.HTTP_201_CREATED)
def create_market_price(
    data: MarketPriceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin-only — create a new market price entry."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    existing = db.query(MarketPriceModel).filter(MarketPriceModel.symbol == data.symbol).first()
    if existing:
        raise HTTPException(status_code=400, detail="Symbol already exists")
    entry = MarketPriceModel(**data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.put("/{symbol}", response_model=MarketPrice)
def update_market_price(
    symbol: str,
    data: MarketPriceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin-only — update price/change for a symbol."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    entry = db.query(MarketPriceModel).filter(MarketPriceModel.symbol == symbol).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Symbol not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry
