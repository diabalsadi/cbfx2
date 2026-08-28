from pydantic import BaseModel
from typing import Optional, List

from app.schemas.broker import BrokerAccountType


class PublicBrokerOffer(BaseModel):
    """The full cashback offer for one broker — what a visitor sees on that
    broker's detail page, deciding whether to sign up through us."""

    id: str
    name: str
    img_src: Optional[str] = None
    coverage_type: str
    geo_coverage: List[str]
    cashback_rate: float
    account_types: List[BrokerAccountType]
    terms_text: Optional[str] = None
    payout_destination: str
    payout_duration_days: Optional[int] = None
    # None when the broker has no signup_url configured yet — nothing to
    # link the visitor through to.
    referral_url: Optional[str] = None
