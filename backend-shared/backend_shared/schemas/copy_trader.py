from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CopyTraderBase(BaseModel):
    name: str
    avatar_initials: str
    bio: Optional[str] = None
    roi_12m: float = 0.0
    roi_3m: float = 0.0
    roi_1m: float = 0.0
    followers: int = 0
    win_rate: float = 0.0
    drawdown: float = 0.0
    strategy: str = "Swing"  # "Scalping" | "Swing" | "Position"
    pairs: List[str] = []
    is_featured: bool = False
    is_active: bool = True


class CopyTraderCreate(CopyTraderBase):
    pass


class CopyTraderUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    roi_12m: Optional[float] = None
    roi_3m: Optional[float] = None
    roi_1m: Optional[float] = None
    followers: Optional[int] = None
    win_rate: Optional[float] = None
    drawdown: Optional[float] = None
    strategy: Optional[str] = None
    pairs: Optional[List[str]] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None


class CopyTrader(CopyTraderBase):
    id: str
    # Live MetaApi/CopyFactory link — never includes the encrypted password.
    is_live: bool = False
    broker_id: Optional[str] = None
    mt5_number: Optional[str] = None
    metaapi_connection_status: str = "not_connected"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CopyTraderConnectLive(BaseModel):
    broker_id: str
    mt5_number: str
    server: str
    platform: str  # "mt4" | "mt5"
    investor_password: str
