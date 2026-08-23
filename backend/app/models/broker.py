from sqlalchemy import Column, String, Float, DateTime, JSON, ForeignKey
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
    cashback_rate = Column(Float, nullable=False, default=0.0)  # percentage points, e.g. 82.5 (%)
    # Our affiliate/referral identifier with this broker, used to attribute users who sign up through us
    referral_id = Column(String, nullable=True)
    status = Column(String, default="active")  # active, inactive
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
