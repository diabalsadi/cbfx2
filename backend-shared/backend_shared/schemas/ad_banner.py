from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Dict, Optional

from backend_shared.schemas.broker_placement import is_valid_placement_region
from backend_shared.utils.translate import SUPPORTED_LOCALES

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
    # The "Sponsored by" logo shown next to the site logo in the public header.
    "header": {"sponsor_logo"},
}

STATUSES = {"active", "inactive"}


def is_valid_page_slot(page: str, slot: str) -> bool:
    return slot in PAGE_BANNER_SLOTS.get(page, set())


# Re-exported so routers only need to import from this module. A banner's
# `region` is "default" (fallback content) or a geo_coverage region/ISO
# country code — the same scope semantics as broker placements.
is_valid_banner_region = is_valid_placement_region


class AdBannerUpsert(BaseModel):
    broker_id: str
    # {"en": "https://...", ...} — one creative image per language. Resolved
    # to the visitor's locale at read time (falls back to default_image_url,
    # then any available image) rather than machine-translated like other
    # content.
    images: Dict[str, str] = {}
    # Shown when the visitor's locale has no entry in `images`.
    default_image_url: Optional[str] = None
    # Click-through override; falls back to the broker's own referral link
    # when unset.
    link_url: Optional[str] = None
    dismissible: bool = False
    status: str = "active"

    @field_validator("images")
    @classmethod
    def _check_locales(cls, v: Dict[str, str]) -> Dict[str, str]:
        invalid = sorted(set(v) - SUPPORTED_LOCALES)
        if invalid:
            raise ValueError(f"Unsupported locale(s): {', '.join(invalid)}")
        return v


class AdBanner(AdBannerUpsert):
    id: str
    page: str
    slot: str
    region: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
