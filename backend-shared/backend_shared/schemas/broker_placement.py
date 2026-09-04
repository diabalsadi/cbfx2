from pydantic import BaseModel
from datetime import datetime

from backend_shared.schemas.broker import REGIONS
from backend_shared.utils.countries import COUNTRY_CODES

SECTIONS = {"featured"}


def is_valid_placement_region(value: str) -> bool:
    """A placement's `region` is "default" (fallback order), one of the broker
    geo_coverage region codes (e.g. "europe"), or an ISO country code (e.g.
    "US") — letting admins order a section per broad region or drill down to a
    single country. Region codes are lowercase and country codes are uppercase,
    so the two spaces never collide."""
    return value == "default" or value in REGIONS or value in COUNTRY_CODES


class BrokerPlacementSet(BaseModel):
    broker_id: str


class BrokerPlacement(BaseModel):
    id: str
    section: str
    region: str
    position: int
    broker_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
