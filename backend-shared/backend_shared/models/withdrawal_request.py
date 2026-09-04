from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from backend_shared.database import Base
import uuid


class WithdrawalRequest(Base):
    """A customer's request to withdraw cashback from one MT5 account's
    wallet. amount is deducted from MT5Account.balance the moment the
    request is created (see services/withdrawal.py) — not on approval —
    so a second request can't double-spend the same balance while this one
    is still pending. Approval logs a WalletTransaction debit; rejection
    refunds the amount back to balance."""

    __tablename__ = "withdrawal_requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    mt5_account_id = Column(String, ForeignKey("mt5_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    method = Column(String, nullable=False)  # "crypto" | "bank_wire" | "fund_mt5"
    # Shape depends on method — {currency, network, wallet_address} for crypto;
    # {holder_name, bank_name, account_number, swift_bic} for bank_wire; {} for fund_mt5.
    destination_details = Column(JSON, nullable=False, default=dict)
    status = Column(String, nullable=False, default="pending")  # pending | approved | rejected
    admin_note = Column(String, nullable=True)
    reviewed_by = Column(String, ForeignKey("users.email", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
