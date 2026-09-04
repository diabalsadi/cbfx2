from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from backend_shared.database import Base
import uuid


class CopySubscription(Base):
    """One customer's live copy-trading link to one CopyTrader strategy —
    the follower side of METAAPI_INTEGRATION_ARCHITECTURE.md §10 step 6.

    Deliberately keeps its own MetaApi account registration
    (metaapi_account_id) separate from MT5Account.metaapi_account_id: the
    cashback-tracking registration uses the read-only investor password and
    must never gain trading capability. This row's metaapi_account_id is
    registered with the customer's real trading password instead, since
    CopyFactory has to place/close trades on it to actually mirror the
    strategy — see trading_password_encrypted below.
    """

    __tablename__ = "copy_subscriptions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_email = Column(String, ForeignKey("users.email", ondelete="CASCADE"), nullable=False, index=True)
    copy_trader_id = Column(String, ForeignKey("copy_traders.id", ondelete="CASCADE"), nullable=False, index=True)
    # The customer's own existing cashback-linked account whose broker/number
    # this subscription trades against — not the same MetaApi registration.
    mt5_account_id = Column(String, ForeignKey("mt5_accounts.id", ondelete="CASCADE"), nullable=False, index=True)

    multiplier = Column(Float, nullable=False, default=1.0)
    # "pending" | "active" | "paused" | "stopped" | "error"
    status = Column(String, nullable=False, default="pending")

    # The customer's real trading (not investor) password — a deliberate,
    # narrowly-scoped exception to this app's usual investor-password-only
    # rule, required because CopyFactory must be able to execute trades on
    # this account to mirror the strategy. Encrypted at rest like other
    # password fields (app/utils/encryption.py) but, unlike the investor
    # password, cleared to NULL the moment status becomes "stopped" — see
    # DELETE /copy-subscriptions/{id}. Never returned in any API response.
    trading_password_encrypted = Column(String, nullable=True)

    metaapi_account_id = Column(String, nullable=True)
    metaapi_connection_status = Column(String, nullable=False, default="not_connected")
    # Equal to metaapi_account_id per the CopyFactory SDK's own convention
    # (a subscriber's id in CopyFactory config is its MetaApi account id) —
    # stored separately anyway for clarity at the CopyFactory teardown call.
    copyfactory_subscriber_id = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
