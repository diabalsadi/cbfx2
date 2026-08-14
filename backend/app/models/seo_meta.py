from sqlalchemy import Column, String, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base
import uuid


class SeoMeta(Base):
    __tablename__ = "seo_meta"
    __table_args__ = (
        UniqueConstraint("route", "sub_key", name="uq_seo_meta_route_sub_key"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Route key, e.g. "homepage", "analysis_detail" — matches the frontend's
    # SEO_ROUTES registry. Dynamic routes (e.g. "analysis_detail" for
    # /analysis/[id]) store a template: title/description may contain
    # "{token}" placeholders (e.g. "{pair}") filled in with real page data at
    # render time.
    route = Column(String, nullable=False)
    # Optional sub-identifier for a route that supports per-item overrides on
    # top of its generic template — currently only "markets_symbol" uses
    # this, keyed by the symbol slug (e.g. "eur-usd"). Empty string means
    # "the generic template for this route" (every other route always uses
    # ""). Using "" rather than NULL here is deliberate: SQL unique
    # constraints treat NULL as distinct from itself, so (route, NULL) could
    # otherwise be inserted more than once — "" keeps it enforced at the DB
    # level.
    sub_key = Column(String, nullable=False, default="")
    title = Column(String, nullable=False, default="")
    description = Column(String, nullable=False, default="")
    keywords = Column(String, nullable=True)
    og_title = Column(String, nullable=True)
    og_description = Column(String, nullable=True)
    og_image = Column(String, nullable=True)
    twitter_card = Column(String, nullable=False, default="summary_large_image")
    # Path only (e.g. "/brokers") — the site origin is added at render time.
    canonical_path = Column(String, nullable=True)
    robots = Column(String, nullable=False, default="index, follow")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SeoSettings(Base):
    """Sitewide SEO configuration — a single row, applied on every page."""

    __tablename__ = "seo_settings"

    id = Column(String, primary_key=True, default="global")
    google_site_verification = Column(String, nullable=True)
    bing_site_verification = Column(String, nullable=True)
    pinterest_site_verification = Column(String, nullable=True)
    facebook_domain_verification = Column(String, nullable=True)
    # Handle used for the twitter:site meta tag, e.g. "@cbfx".
    twitter_site = Column(String, nullable=True)
    # Sitewide fallbacks — used for any route whose own og_title /
    # og_description / og_image / keywords isn't set, so every page has
    # usable SEO copy even before it's individually configured.
    default_share_title = Column(String, nullable=True)
    default_share_description = Column(String, nullable=True)
    default_share_image = Column(String, nullable=True)
    default_keywords = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
