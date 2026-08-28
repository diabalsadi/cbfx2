from pydantic import BaseModel, model_validator
from typing import Optional, List, Literal
from datetime import datetime

from app.utils.countries import COUNTRY_CODES

REGIONS = {
    "north_america",
    "south_america",
    "europe",
    "asia",
    "africa",
    "middle_east",
}

COVERAGE_TYPES = {"region", "country"}
PAYOUT_DESTINATIONS = {"wallet", "trading_account"}


class InstrumentCashback(BaseModel):
    # Exactly one of category/symbol — a category-level rate, or an exact-symbol
    # override that wins over a category match when resolving a trade's rate
    # (see METAAPI_INTEGRATION_ARCHITECTURE.md §5/§6).
    category: Optional[str] = None  # "forex" | "metals" | "commodities" | "crypto" | "indices" | "stocks" | "other"
    symbol: Optional[str] = None  # exact override, e.g. "EURUSD"
    rate: float  # $ per lot — NOT the same units as Broker.cashback_rate (a separate headline %)

    @model_validator(mode="after")
    def _check_exactly_one(self):
        if bool(self.category) == bool(self.symbol):
            raise ValueError("InstrumentCashback requires exactly one of category or symbol")
        return self


class BrokerAccountType(BaseModel):
    name: str
    description: Optional[str] = None
    # Empty means this account type just uses the broker's flat cashback_rate.
    cashback: List[InstrumentCashback] = []


def _validate_coverage(coverage_type: Optional[str], geo_coverage: Optional[List[str]]):
    if geo_coverage is None:
        return
    valid_set = COUNTRY_CODES if coverage_type == "country" else REGIONS
    invalid = sorted(set(geo_coverage) - valid_set)
    if invalid:
        kind = "country code" if coverage_type == "country" else "region"
        raise ValueError(
            f"Invalid {kind}(s) for coverage_type={coverage_type!r}: {', '.join(invalid)}"
        )


class BrokerBase(BaseModel):
    name: str
    img_src: Optional[str] = None
    coverage_type: Literal["region", "country"] = "region"
    geo_coverage: List[str] = []
    cashback_rate: float = 0.0  # percentage points, e.g. 82.5 means 82.5%
    referral_id: Optional[str] = None
    signup_url: Optional[str] = None
    account_types: List[BrokerAccountType] = []
    terms_text: Optional[str] = None
    payout_destination: Literal["wallet", "trading_account"] = "wallet"
    payout_duration_days: Optional[int] = None
    status: Optional[str] = "active"

    @model_validator(mode="after")
    def _check_geo_coverage(self):
        _validate_coverage(self.coverage_type, self.geo_coverage)
        return self


class BrokerCreate(BrokerBase):
    # Who (if anyone) may manage this listing via the "broker" role once
    # created — only settable by the super_admin who is the only caller
    # allowed to create brokers in the first place.
    owner_email: Optional[str] = None


class BrokerUpdate(BaseModel):
    name: Optional[str] = None
    img_src: Optional[str] = None
    coverage_type: Optional[Literal["region", "country"]] = None
    geo_coverage: Optional[List[str]] = None
    cashback_rate: Optional[float] = None
    referral_id: Optional[str] = None
    signup_url: Optional[str] = None
    account_types: Optional[List[BrokerAccountType]] = None
    terms_text: Optional[str] = None
    payout_destination: Optional[Literal["wallet", "trading_account"]] = None
    payout_duration_days: Optional[int] = None
    status: Optional[str] = None
    # Only a super_admin caller's value for this field is honored — see
    # update_broker(); present here so the same schema/endpoint can be used
    # by both roles without a super_admin-only duplicate.
    owner_email: Optional[str] = None

    @model_validator(mode="after")
    def _check_geo_coverage(self):
        # A partial update may send geo_coverage without coverage_type (or vice
        # versa) if only one changed. Validating requires knowing the mode, so
        # only cross-check when both are present together; otherwise skip and
        # trust the values were validated against the broker's existing mode by
        # a prior save that did include both fields.
        if self.geo_coverage is not None and self.coverage_type is not None:
            _validate_coverage(self.coverage_type, self.geo_coverage)
        return self


class Broker(BrokerBase):
    id: str
    owner_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
