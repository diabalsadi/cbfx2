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
    close_reason: Optional[str] = None  # "hit" | "miss" | "market_shift"
    notes: Optional[str] = None
    closed_at: Optional[datetime] = None


class Play(PlayBase):
    id: str
    author_email: str
    # "hit" | "miss" | "market_shift" | null — set by the signals-service
    # pipeline; null for manually-managed plays.
    close_reason: Optional[str] = None
    # A 0-100 confidence score as a string (e.g. "78") | null — AI-generated
    # plays only. Legacy rows from before 2026-09-02 may hold "High"/"Medium"/
    # "Low" instead.
    confidence: Optional[str] = None
    opened_at: datetime
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
