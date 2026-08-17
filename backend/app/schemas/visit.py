from typing import Dict, List

from pydantic import BaseModel


class VisitBucket(BaseModel):
    label: str
    count: int


class VisitStats(BaseModel):
    total: int
    # Always computed across every visit, regardless of the `country` filter
    # — the country breakdown pie and the filter dropdown's options both come
    # from this, so picking a country never leaves the pie with one slice.
    by_country: Dict[str, int]
    # These respect the `country` filter (all visits when none is given).
    daily: List[VisitBucket]
    weekly: List[VisitBucket]
    monthly: List[VisitBucket]
    yearly: List[VisitBucket]
