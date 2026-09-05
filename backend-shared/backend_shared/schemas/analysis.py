from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AnalysisBase(BaseModel):
    pair: str
    timeframe: str         # "1H" | "4H" | "1D" | "1W"
    bias: str              # "Bullish" | "Bearish" | "Neutral"
    summary: Optional[str] = None


class AnalysisCreate(AnalysisBase):
    pass


class AnalysisUpdate(BaseModel):
    pair: Optional[str] = None
    timeframe: Optional[str] = None
    bias: Optional[str] = None
    summary: Optional[str] = None


class Analysis(AnalysisBase):
    id: str
    author_email: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
