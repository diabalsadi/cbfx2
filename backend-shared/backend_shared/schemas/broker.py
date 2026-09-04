from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Literal, Dict
from datetime import datetime

from backend_shared.utils.countries import COUNTRY_CODES

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
WITHDRAWAL_METHODS = {"crypto", "bank_wire", "fund_mt5"}


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
    # Specs shown in the account types table on the broker detail page —
    # independent of cashback (our rebate to the customer); these describe
    # the account's own trading terms at the broker.
    min_deposit: Optional[float] = None
    spread_from: Optional[str] = None  # free text, e.g. "0.0 pips"
    commission: Optional[str] = None  # free text, e.g. "$3.50/lot"
    swap_free: bool = False


class PlatformInfo(BaseModel):
    name: str
    description: Optional[str] = None


class FundingMethod(BaseModel):
    method: str
    processing_time: Optional[str] = None
    fee: Optional[str] = None


class SpreadInfo(BaseModel):
    # Exactly one of category/symbol — same convention as InstrumentCashback.
    category: Optional[str] = None
    symbol: Optional[str] = None
    # Account-type name -> spread value, e.g. {"Standard": "1.0 pips", "ECN": "0.0 pips"}.
    # Keyed by name rather than index so it survives account_types being reordered
    # (but goes stale if an account type is renamed — same trade-off admins accept
    # for InstrumentCashback's symbol strings).
    spreads: Dict[str, str] = {}
    commission: Optional[str] = None  # shared across account types for this instrument

    @model_validator(mode="after")
    def _check_exactly_one(self):
        if bool(self.category) == bool(self.symbol):
            raise ValueError("SpreadInfo requires exactly one of category or symbol")
        return self


class RegulationEntry(BaseModel):
    regulator: str  # code from frontend/helpers/regulators.ts, e.g. "fca"
    license_number: Optional[str] = None
    active_since: Optional[str] = None  # free text — a year or full date, admin's choice


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
    # Whether this broker appears in the cashback page's auto-scrolling broker
    # strip. Independent of status — see Broker model.
    show_on_cashback: bool = True
    # Only a super_admin caller's value for this field is honored on update —
    # see update_broker(). Present on BrokerBase (not update_broker-only)
    # because create_broker's whole endpoint is already super_admin-gated.
    # 0-10 editorial score — distinct from BrokerRating's 1-5 user ratings.
    rating: Optional[float] = Field(default=None, ge=0, le=10)

    # Profile
    tagline: Optional[str] = None
    about: Optional[str] = None
    founded_year: Optional[int] = None
    headquarters: Optional[str] = None
    min_deposit: Optional[float] = None
    max_leverage: Optional[str] = None
    execution_type: Optional[str] = None

    # Regulation & safety — super_admin-only on update, same rationale as rating.
    regulations: List[RegulationEntry] = []
    segregated_funds: bool = False
    negative_balance_protection: bool = False
    compensation_scheme: Optional[str] = None

    # Trading conditions, platforms, funding, support, pros & cons
    spreads: List[SpreadInfo] = []
    platforms: List[PlatformInfo] = []
    funding_methods: List[FundingMethod] = []
    # Which cashback withdrawal methods this broker offers — see Broker model.
    withdrawal_methods: List[Literal["crypto", "bank_wire", "fund_mt5"]] = []
    support_channels: List[str] = []
    support_languages: List[str] = []
    support_hours: Optional[str] = None
    pros: List[str] = []
    cons: List[str] = []

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
    show_on_cashback: Optional[bool] = None
    rating: Optional[float] = Field(default=None, ge=0, le=10)
    # Only a super_admin caller's value for this field is honored — see
    # update_broker(); present here so the same schema/endpoint can be used
    # by both roles without a super_admin-only duplicate.
    owner_email: Optional[str] = None

    tagline: Optional[str] = None
    about: Optional[str] = None
    founded_year: Optional[int] = None
    headquarters: Optional[str] = None
    min_deposit: Optional[float] = None
    max_leverage: Optional[str] = None
    execution_type: Optional[str] = None

    # Super_admin-only on update, same rationale as rating — see update_broker().
    regulations: Optional[List[RegulationEntry]] = None
    segregated_funds: Optional[bool] = None
    negative_balance_protection: Optional[bool] = None
    compensation_scheme: Optional[str] = None

    spreads: Optional[List[SpreadInfo]] = None
    platforms: Optional[List[PlatformInfo]] = None
    funding_methods: Optional[List[FundingMethod]] = None
    withdrawal_methods: Optional[List[Literal["crypto", "bank_wire", "fund_mt5"]]] = None
    support_channels: Optional[List[str]] = None
    support_languages: Optional[List[str]] = None
    support_hours: Optional[str] = None
    pros: Optional[List[str]] = None
    cons: Optional[List[str]] = None

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
