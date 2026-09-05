from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from backend_shared.database import Base
import uuid


class RebatePayout(Base):
    """One super_admin-issued payout, settling every unpaid TradeRecord for
    one MT5 account at the time it's issued. expected_amount is the sum of
    those trades' auto-computed expected_amount (a reference figure);
    actual_amount is what the admin actually chose to credit — they aren't
    required to match. See METAAPI_INTEGRATION_ARCHITECTURE.md §6."""

    __tablename__ = "rebate_payouts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    mt5_account_id = Column(String, ForeignKey("mt5_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    expected_amount = Column(Float, nullable=False)
    actual_amount = Column(Float, nullable=False)
    trade_count = Column(Integer, nullable=False)
    note = Column(String, nullable=True)
    created_by = Column(String, ForeignKey("users.email", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
