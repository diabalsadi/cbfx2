from sqlalchemy import Column, String, Boolean, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base
import uuid


class AdBanner(Base):
    __tablename__ = "ad_banners"
    __table_args__ = (
        UniqueConstraint("page", "slot", "region", name="uq_ad_banner_page_slot_region"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Route the banner renders on, e.g. "homepage"
    page = Column(String, nullable=False)
    # Banner slot within that page, e.g. "demo_banner", "prime_banner"
    slot = Column(String, nullable=False)
    # Coverage scope this content targets: "default" (fallback shown whenever
    # a visitor's detected region has no override for this slot) or one of the
    # broker geo_coverage region codes (e.g. "europe") or an ISO country code
    # (e.g. "US"), letting admins show different banner content per region.
    region = Column(String, nullable=False, default="default")
    sponsor_name = Column(String, nullable=False)
    description = Column(String, nullable=False, default="")
    badge_text = Column(String, nullable=False, default="SPONSORED")
    logo_src = Column(String, nullable=True)
    link_url = Column(String, nullable=True)
    cta_label = Column(String, nullable=True)
    dismissible = Column(Boolean, nullable=False, default=False)
    status = Column(String, nullable=False, default="active")  # active | inactive
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
