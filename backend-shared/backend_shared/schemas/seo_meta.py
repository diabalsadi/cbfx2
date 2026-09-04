from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# Every public route the frontend generates server-side metadata for.
# "_detail"/"_symbol" suffixed keys are templates for dynamic routes —
# see backend_shared.models.seo_meta.SeoMeta.route.
SEO_ROUTES = {
    "homepage",
    "login",
    "register",
    "account",
    "analysis",
    "analysis_detail",
    "brokers_detail",
    "calendar",
    "cashback",
    "copy_trading",
    "forum",
    "forum_detail",
    "markets",
    "markets_symbol",
    "news",
    "news_detail",
    "plays",
    "referrals",
}

# Routes that support a per-item override on top of their generic template,
# keyed by sub_key (e.g. "markets_symbol" -> a specific symbol slug).
SUB_KEY_ROUTES = {"markets_symbol"}

TWITTER_CARDS = {"summary", "summary_large_image"}


class SeoMetaUpsert(BaseModel):
    title: str
    description: str
    keywords: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    twitter_card: str = "summary_large_image"
    canonical_path: Optional[str] = None
    robots: str = "index, follow"


class SeoMeta(SeoMetaUpsert):
    id: str
    route: str
    sub_key: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SeoSettingsUpsert(BaseModel):
    google_site_verification: Optional[str] = None
    bing_site_verification: Optional[str] = None
    pinterest_site_verification: Optional[str] = None
    facebook_domain_verification: Optional[str] = None
    twitter_site: Optional[str] = None
    default_share_title: Optional[str] = None
    default_share_description: Optional[str] = None
    default_share_image: Optional[str] = None
    default_keywords: Optional[str] = None


class SeoSettings(SeoSettingsUpsert):
    updated_at: datetime

    class Config:
        from_attributes = True
