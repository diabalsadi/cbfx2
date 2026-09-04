from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from backend_shared.database import Base
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

    # Real MetaApi/CopyFactory master-account link, admin-provisioned via
    # POST /copy-traders/{id}/connect-live (see copyfactory_client.py). All
    # nullable — a curated-only trader (is_live=False) has none of these set
    # and keeps working exactly as before. Only the trader's own read-only
    # investor password is needed here: CopyFactory only *reads* this
    # account's trades to build the strategy feed, it never trades on it.
    is_live = Column(Boolean, default=False)
    broker_id = Column(String, ForeignKey("brokers.id"), nullable=True)
    mt5_number = Column(String, nullable=True)
    server = Column(String, nullable=True)
    platform = Column(String, nullable=True)  # "mt4" | "mt5"
    investor_password_encrypted = Column(String, nullable=True)
    metaapi_account_id = Column(String, nullable=True)
    metaapi_connection_status = Column(String, nullable=False, default="not_connected")
    copyfactory_strategy_id = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
