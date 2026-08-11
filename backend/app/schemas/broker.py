from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime

REGIONS = {
    "north_america",
    "south_america",
    "europe",
    "asia",
    "africa",
    "middle_east",
}


def _validate_regions(v: Optional[List[str]]):
    if v is None:
        return v
    invalid = sorted(set(v) - REGIONS)
    if invalid:
        raise ValueError(
            f"Invalid region(s): {', '.join(invalid)}. Must be one of: {', '.join(sorted(REGIONS))}"
        )
    return v


class BrokerBase(BaseModel):
    name: str
    img_src: Optional[str] = None
    geo_coverage: List[str] = []
    cashback_rate: float = 0.0  # percentage points, e.g. 82.5 means 82.5%
    referral_id: Optional[str] = None
    status: Optional[str] = "active"

    @field_validator("geo_coverage")
    @classmethod
    def validate_geo_coverage(cls, v):
        return _validate_regions(v)


class BrokerCreate(BrokerBase):
    pass


class BrokerUpdate(BaseModel):
    name: Optional[str] = None
    img_src: Optional[str] = None
    geo_coverage: Optional[List[str]] = None
    cashback_rate: Optional[float] = None
    referral_id: Optional[str] = None
    status: Optional[str] = None

    @field_validator("geo_coverage")
    @classmethod
    def validate_geo_coverage(cls, v):
        return _validate_regions(v)


class Broker(BrokerBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
