from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PlayBase(BaseModel):
    pair: str
    direction: str           # "LONG" | "SHORT"
    entry_price: str
    take_profit: Optional[str] = None
    stop_loss: Optional[str] = None
    timeframe: Optional[str] = None
    play_type: str = "Swing" # "Scalp" | "Swing" | "Long-term"
    status: str = "open"     # "open" | "closed" | "cancelled"
    notes: Optional[str] = None


class PlayCreate(PlayBase):
    pass


class PlayUpdate(BaseModel):
    pair: Optional[str] = None
    direction: Optional[str] = None
    entry_price: Optional[str] = None
    take_profit: Optional[str] = None
    stop_loss: Optional[str] = None
    timeframe: Optional[str] = None
    play_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    closed_at: Optional[datetime] = None


class Play(PlayBase):
    id: str
    author_email: str
    opened_at: datetime
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
