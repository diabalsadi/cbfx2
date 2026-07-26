from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Play(Base):
    __tablename__ = "plays"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    pair = Column(String, nullable=False)                  # e.g. "EUR/USD"
    direction = Column(String, nullable=False)             # "LONG" | "SHORT"
    entry_price = Column(String, nullable=False)
    take_profit = Column(String, nullable=True)
    stop_loss = Column(String, nullable=True)
    timeframe = Column(String, nullable=True)              # e.g. "4H"
    play_type = Column(String, nullable=False, default="Swing")  # "Scalp" | "Swing" | "Long-term"
    # "open" | "closed" | "cancelled"
    status = Column(String, nullable=False, default="open")
    notes = Column(Text, nullable=True)
    author_email = Column(String, ForeignKey("users.email"), nullable=False)
    opened_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
