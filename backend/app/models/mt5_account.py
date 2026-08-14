from sqlalchemy import Column, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base
import uuid


class MT5Account(Base):
    __tablename__ = "mt5_accounts"
    __table_args__ = (
        # A given broker's MT5 number space is unique, but nothing stops the
        # same user (or different users) from linking several MT5 accounts
        # with the same broker, each under a different number.
        UniqueConstraint("broker_id", "mt5_number", name="uq_mt5_account_broker_number"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_email = Column(String, ForeignKey("users.email", ondelete="CASCADE"), nullable=False)
    broker_id = Column(String, ForeignKey("brokers.id", ondelete="CASCADE"), nullable=False)
    mt5_number = Column(String, nullable=False)
    # This account's cashback wallet — balance is currently withdrawable,
    # lifetime_earned is the running total ever credited (>= balance).
    balance = Column(Float, nullable=False, default=0.0)
    lifetime_earned = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
