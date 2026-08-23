from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base
import uuid


class CopyTrader(Base):
    __tablename__ = "copy_traders"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    avatar_initials = Column(String, nullable=False)          # e.g. "AM"
    bio = Column(String, nullable=True)
    roi_12m = Column(Float, nullable=False, default=0.0)      # e.g. 184.0  (%)
    roi_3m = Column(Float, nullable=False, default=0.0)
    roi_1m = Column(Float, nullable=False, default=0.0)
    followers = Column(Integer, nullable=False, default=0)
    win_rate = Column(Float, nullable=False, default=0.0)     # e.g. 67.5   (%)
    drawdown = Column(Float, nullable=False, default=0.0)     # e.g. 12.3   (%)
    # "Scalping" | "Swing" | "Position"
    strategy = Column(String, nullable=False, default="Swing")
    # JSON list of pair strings, e.g. ["EUR/USD", "XAU/USD"]
    pairs = Column(JSON, nullable=False, default=list)
    is_featured = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
