from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from backend_shared.database import Base
import uuid


class SymbolCategory(Base):
    __tablename__ = "symbol_categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Canonical symbol, broker-suffix normalized before lookup (e.g. "XAUUSDm" -> "XAUUSD").
    symbol = Column(String, nullable=False, unique=True, index=True)
    category = Column(String, nullable=False)  # "forex" | "metals" | "commodities" | "crypto" | "indices" | ...
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
