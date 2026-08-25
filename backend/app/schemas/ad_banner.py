from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

from app.schemas.broker_placement import is_valid_placement_region

# Ad-placement routes and the banner-ad slots available on each. Keyed the
# same way the admin "Ad Placements" page's route dropdown is keyed.
PAGE_BANNER_SLOTS = {
    "homepage": {
        "sticky_top_banner",
        "sidebar_left_banner",
        "sidebar_right_banner",
        "pre_cashback_banner",
        "pre_copytrading_banner",
        "pre_signals_banner",
        "pre_markets_banner",
    },
    "signin": {"featured_broker"},
}

STATUSES = {"active", "inactive"}


def is_valid_page_slot(page: str, slot: str) -> bool:
    return slot in PAGE_BANNER_SLOTS.get(page, set())


# Re-exported so routers only need to import from this module. A banner's
# `region` is "default" (fallback content) or a geo_coverage region/ISO
# country code — the same scope semantics as broker placements.
is_valid_banner_region = is_valid_placement_region


class AdBannerUpsert(BaseModel):
    sponsor_name: str
    description: str = ""
    badge_text: str = "SPONSORED"
    logo_src: Optional[str] = None
    link_url: Optional[str] = None
    cta_label: Optional[str] = None
    features: List[str] = []
    disclaimer: Optional[str] = None
    dismissible: bool = False
    status: str = "active"


class AdBanner(AdBannerUpsert):
    id: str
    page: str
    slot: str
    region: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
