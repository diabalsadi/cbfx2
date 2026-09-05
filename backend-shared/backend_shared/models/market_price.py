from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from backend_shared.database import Base
import uuid


class MarketPrice(Base):
    __tablename__ = "market_prices"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    symbol = Column(String, nullable=False, unique=True, index=True)  # e.g. "EUR/USD"
    price = Column(String, nullable=False)                            # e.g. "1.0842"
    change_pct = Column(String, nullable=False)                       # e.g. "+0.32%"
    direction = Column(String, nullable=False, default="up")          # "up" | "down"
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
