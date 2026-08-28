from sqlalchemy import Column, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base
import uuid


class TradeRecord(Base):
    __tablename__ = "trade_records"
    __table_args__ = (
        # The idempotency key — re-fetching a deal already stored is a no-op,
        # not a duplicate, which is what makes repeated polling safe.
        UniqueConstraint("mt5_account_id", "metaapi_deal_id", name="uq_trade_record_account_deal"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    mt5_account_id = Column(String, ForeignKey("mt5_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    metaapi_deal_id = Column(String, nullable=False)
    symbol = Column(String, nullable=False)
    lots = Column(Float, nullable=False)
    direction = Column(String, nullable=True)  # "buy" | "sell"
    opened_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=False)
    profit = Column(Float, nullable=True)  # informational, not used for rebate math
    # Auto-computed by calculate_rebates() from lots x the matching cashback
    # rate — a projection, not money moved. Null until priced (or forever, if
    # unresolvable — see rebate_calculation.py).
    expected_amount = Column(Float, nullable=True)
    # Set once this trade is included in a super_admin-issued RebatePayout —
    # that's the only thing that actually credits the wallet (see §6 of
    # METAAPI_INTEGRATION_ARCHITECTURE.md: expected vs. actual, decided
    # 2026-08-29). Null means still pending payout.
    payout_id = Column(String, ForeignKey("rebate_payouts.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
