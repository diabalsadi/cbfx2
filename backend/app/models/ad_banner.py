from sqlalchemy import Column, String, Boolean, DateTime, JSON, ForeignKey, UniqueConstraint
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
    broker_id = Column(String, ForeignKey("brokers.id", ondelete="CASCADE"), nullable=False, index=True)
    # {"en": "https://...", "ar": "https://...", ...} — one creative image the
    # broker supplied per language. Resolved at read time to the visitor's
    # locale, falling back to default_image_url, then any available image.
    images = Column(JSON, nullable=False, default=dict)
    # Shown when the visitor's locale has no entry in `images` — a single
    # creative that works for any language (e.g. a logo-only or text-free
    # image), so a banner isn't blank for languages the broker hasn't
    # supplied a specific creative for.
    default_image_url = Column(String, nullable=True)
    # Click-through override; when unset, falls back to the broker's own
    # UTM referral link (see utils/broker_offer.py:referral_url).
    link_url = Column(String, nullable=True)
    dismissible = Column(Boolean, nullable=False, default=False)
    status = Column(String, nullable=False, default="active")  # active | inactive
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
