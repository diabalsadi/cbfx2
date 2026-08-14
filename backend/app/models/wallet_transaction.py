from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
import uuid


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    mt5_account_id = Column(String, ForeignKey("mt5_accounts.id", ondelete="CASCADE"), nullable=False)
    # "credit" (money in — a cashback rebate) or "debit" (money out — a withdrawal).
    type = Column(String, nullable=False)
    amount = Column(Float, nullable=False)  # always positive; `type` gives direction
    description = Column(String, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
