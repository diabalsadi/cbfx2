from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from backend_shared.database import Base
import uuid


class BrokerRating(Base):
    """A signed-in user's own 1-5 rating of a broker — one row per
    (broker, user), upserted on resubmission. Distinct from Broker.rating,
    the separate 0-10 editorial score set by a super_admin; the two are
    shown side by side, never merged."""

    __tablename__ = "broker_ratings"
    __table_args__ = (
        UniqueConstraint("broker_id", "user_email", name="uq_broker_rating_broker_user"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    broker_id = Column(String, ForeignKey("brokers.id", ondelete="CASCADE"), nullable=False, index=True)
    user_email = Column(String, ForeignKey("users.email", ondelete="CASCADE"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)  # 1-5
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
