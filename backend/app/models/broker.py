from sqlalchemy import Column, String, Float, Integer, Text, DateTime, JSON, ForeignKey, Boolean
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
    # Whether this broker appears in the cashback page's auto-scrolling broker
    # strip. Independent of `status` — a broker can stay active (bookable,
    # editable) while opting out of just this one placement.
    show_on_cashback = Column(Boolean, nullable=False, default=True)
    # 0-10 editorial trust score shown on the cashback strip and the broker's
    # detail page. Editorial/super_admin-only judgment call — distinct from
    # the 1-5 user-submitted ratings in BrokerRating, which are averaged and
    # shown alongside this rather than replacing it. None means no score has
    # been set yet, so nothing renders.
    rating = Column(Float, nullable=True)

    # ── Profile ──────────────────────────────────────────────────────────
    tagline = Column(Text, nullable=True)  # short one-liner shown under the name
    about = Column(Text, nullable=True)  # longer free-text description/bio
    founded_year = Column(Integer, nullable=True)
    headquarters = Column(String, nullable=True)  # free text, e.g. "Limassol, Cyprus"
    min_deposit = Column(Float, nullable=True)  # headline figure for the quick-facts strip
    max_leverage = Column(String, nullable=True)  # free text, e.g. "1:500"
    execution_type = Column(String, nullable=True)  # free text, e.g. "ECN/STP"

    # ── Regulation & safety ──────────────────────────────────────────────
    # Superseded by `regulations` below — left as a harmless unused leftover
    # rather than dropped (see trade_records.rebate_amount for the same
    # pattern elsewhere in this codebase). Never read; do not resurrect.
    regulation_badges = Column(JSON, nullable=False, default=list)
    # [{"regulator": str (code from frontend/helpers/regulators.ts), "license_number": str|None,
    #   "active_since": str|None}, ...] — one row per license; the hero's seal
    # badges are derived from this list (one seal per distinct regulator).
    regulations = Column(JSON, nullable=False, default=list)
    segregated_funds = Column(Boolean, nullable=False, default=False)
    negative_balance_protection = Column(Boolean, nullable=False, default=False)
    compensation_scheme = Column(String, nullable=True)  # free text, e.g. "ICF up to €20,000"

    # ── Trading conditions ───────────────────────────────────────────────
    # [{"category": str|None, "symbol": str|None, "spreads": {account_type_name: str},
    #   "commission": str|None}, ...] — exactly one of category/symbol per row (same
    # convention as account_types[].cashback's InstrumentCashback), one spread value
    # per account type since it genuinely varies by tier — distinct from the cashback
    # rebate rates in account_types[].cashback.
    spreads = Column(JSON, nullable=False, default=list)

    # ── Platforms, funding, support ──────────────────────────────────────
    platforms = Column(JSON, nullable=False, default=list)  # [{"name": str, "description": str}, ...]
    funding_methods = Column(JSON, nullable=False, default=list)  # [{"method","processing_time","fee"}, ...]
    support_channels = Column(JSON, nullable=False, default=list)  # ["Live chat", "Phone", ...]
    support_languages = Column(JSON, nullable=False, default=list)  # ["English", "Arabic", ...]
    support_hours = Column(String, nullable=True)  # free text, e.g. "24/5, market hours"

    # ── Pros & cons ──────────────────────────────────────────────────────
    pros = Column(JSON, nullable=False, default=list)  # list of strings
    cons = Column(JSON, nullable=False, default=list)  # list of strings

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
