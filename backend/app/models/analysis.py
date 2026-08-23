from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Analysis(Base):
    __tablename__ = "analysis"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    pair = Column(String, nullable=False)          # e.g. "GBP/USD"
    timeframe = Column(String, nullable=False)     # "1H" | "4H" | "1D" | "1W"
    # "Bullish" | "Bearish" | "Neutral"
    bias = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    author_email = Column(String, ForeignKey("users.email"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
