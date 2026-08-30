from pydantic import BaseModel
from typing import Optional, List

from app.schemas.broker import BrokerAccountType, FundingMethod, PlatformInfo, SpreadInfo


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
    # None when no super_admin has set a score yet — the detail page hides
    # the score badge in that case rather than showing an empty/zero score.
    # 0-10 editorial score — distinct from user_rating_avg below.
    rating: Optional[float] = None

    tagline: Optional[str] = None
    founded_year: Optional[int] = None
    headquarters: Optional[str] = None
    min_deposit: Optional[float] = None
    max_leverage: Optional[str] = None
    execution_type: Optional[str] = None

    regulation_badges: List[str] = []
    segregated_funds: bool = False
    negative_balance_protection: bool = False
    compensation_scheme: Optional[str] = None

    spreads: List[SpreadInfo] = []
    platforms: List[PlatformInfo] = []
    funding_methods: List[FundingMethod] = []
    support_channels: List[str] = []
    support_languages: List[str] = []
    support_hours: Optional[str] = None
    pros: List[str] = []
    cons: List[str] = []

    # Aggregate of BrokerRating rows (1-5 each) for this broker — average is
    # None when nobody has rated it yet, count is 0 in that case.
    user_rating_avg: Optional[float] = None
    user_rating_count: int = 0
