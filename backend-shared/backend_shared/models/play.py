from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from backend_shared.database import Base
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
    status = Column(String, nullable=False, default="open", index=True)
    # Why a closed/cancelled play ended, distinct from status itself since
    # "closed" alone doesn't say whether it was take_profit or stop_loss:
    # "hit" | "miss" | "market_shift" (cancelled because the underlying
    # thesis broke down, not because it reached take_profit/stop_loss).
    # Set by the signals-service pipeline; null for manually-managed plays.
    close_reason = Column(String, nullable=True)
    # AI-generated plays only — a 0-100 confidence score from Gemini, stored
    # as its string form (e.g. "78"). The signals-service pipeline only ever
    # inserts a play when the score is >= its CONFIDENCE_THRESHOLD (70 as of
    # 2026-09-02), so this is mostly a record of that decision for later
    # review. Earlier signals (before 2026-09-02) may hold the legacy
    # "High"/"Medium"/"Low" labels instead — this column's meaning changed,
    # not just its values, so don't assume every row is numeric. Null for
    # manually-created plays, which have no confidence score.
    confidence = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    author_email = Column(String, ForeignKey("users.email"), nullable=False, index=True)
    opened_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
