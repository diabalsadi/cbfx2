from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SymbolCategoryBase(BaseModel):
    symbol: str
    category: str  # "forex" | "metals" | "commodities" | "crypto" | "indices" | ...


class SymbolCategoryCreate(SymbolCategoryBase):
    pass


class SymbolCategoryUpdate(BaseModel):
    category: Optional[str] = None


class SymbolCategory(SymbolCategoryBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
