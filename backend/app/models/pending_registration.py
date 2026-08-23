from sqlalchemy import Column, String, DateTime, Integer, JSON
from sqlalchemy.sql import func
from app.database import Base


class PendingRegistration(Base):
    """A signup that hasn't cleared email OTP verification yet. Holds
    everything /auth/register validated (hashed password, resolved referrer,
    detected region, requested MT5 accounts) so /auth/verify-otp can create
    the real User row without re-asking the client for anything.

    An *unexpired* row may only be replaced or verified by whoever holds
    token_hash's plaintext counterpart — a secret handed back only in the
    direct HTTPS response to the /auth/register call that created it, never
    emailed. Without that, knowing the target email alone isn't enough to
    overwrite someone else's in-progress signup (which would otherwise let
    an attacker swap in their own password before the real owner verifies)
    or complete verification on their behalf. Once expired, the row is
    treated as abandoned and anyone may claim the email fresh."""

    __tablename__ = "pending_registrations"

    email = Column(String, primary_key=True, index=True)
    name = Column(String)
    hashed_password = Column(String)
    region = Column(String, nullable=True)
    country_code = Column(String, nullable=True)
    referred_by = Column(String, nullable=True)
    # [{"broker_id": ..., "mt5_number": ...}, ...] — re-validated against
    # brokers/mt5_accounts at verification time since the 5-minute window
    # means the world can move between register() and verify_otp().
    accounts = Column(JSON, default=list)
    token_hash = Column(String)
    otp_hash = Column(String)
    otp_expires_at = Column(DateTime(timezone=True))
    attempts = Column(Integer, default=0)
    last_sent_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
