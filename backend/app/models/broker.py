from sqlalchemy import Column, String, Float, Integer, Text, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Broker(Base):
    __tablename__ = "brokers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    # The "broker"-role account (if any) allowed to manage this listing —
    # only a super_admin may set/change this. A broker-role account with no
    # broker owning them can't manage anything via /brokers, matching the
    # same ownership-scoping pattern as Campaign.created_by.
    owner_email = Column(String, ForeignKey("users.email"), nullable=True, index=True)
    img_src = Column(String, nullable=True)
    # "region" (geo_coverage holds region codes) or "country" (geo_coverage holds ISO
    # country codes) — a broker picks one mode, not a mix of both.
    coverage_type = Column(String, nullable=False, default="region")
    # JSON list of region codes (e.g. ["north_america", "europe"]) or ISO country
    # codes (e.g. ["US", "CA"]), depending on coverage_type.
    geo_coverage = Column(JSON, nullable=False, default=list)
    cashback_rate = Column(Float, nullable=False, default=0.0)  # fallback %, used where no account-type/instrument override applies
    # Our affiliate/referral identifier with this broker, used to attribute users who sign up through us
    referral_id = Column(String, nullable=True)
    # The broker's own registration/login page. The customer-facing referral
    # link is this URL with UTM params appended at render time (see
    # utils/broker_offer.py:referral_url) — referral_id, if set, rides along
    # as one more query param for brokers whose own tracking needs it.
    signup_url = Column(String, nullable=True)
    # [{"name": str, "description": str|None, "cashback": [{"symbol": str, "rate": float}]}, ...]
    # An account type with an empty/missing "cashback" list falls back to the
    # broker-level cashback_rate above. This is the one structured "template"
    # every broker's offer page is filled in from and rendered from.
    account_types = Column(JSON, nullable=False, default=list)
    # Broker-specific terms that affect the cashback (exclusions, minimum
    # volume, etc.) — free text, shown as-is on the broker's offer page.
    terms_text = Column(Text, nullable=True)
    # "wallet" (paid into the customer's T.V wallet) or "trading_account"
    # (credited straight to their trading account with the broker).
    payout_destination = Column(String, nullable=False, default="wallet")
    payout_duration_days = Column(Integer, nullable=True)  # e.g. 7 = paid out weekly
    status = Column(String, default="active")  # active, inactive
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
