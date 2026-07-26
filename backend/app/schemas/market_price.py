from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MarketPriceBase(BaseModel):
    symbol: str
    price: str
    change_pct: str
    direction: str = "up"  # "up" | "down"


class MarketPriceCreate(MarketPriceBase):
    pass


class MarketPriceUpdate(BaseModel):
    price: Optional[str] = None
    change_pct: Optional[str] = None
    direction: Optional[str] = None


class MarketPrice(MarketPriceBase):
    id: str
    updated_at: datetime

    class Config:
        from_attributes = True
