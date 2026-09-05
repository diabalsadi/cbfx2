from pydantic import BaseModel, model_validator
from typing import Optional, Literal
from datetime import datetime

WithdrawalMethod = Literal["crypto", "bank_wire", "fund_mt5"]

# Required destination_details keys per method — "fund_mt5" needs none since
# the admin credits the customer's trading account at the broker directly.
_REQUIRED_DETAIL_KEYS = {
    "crypto": {"currency", "network", "wallet_address"},
    "bank_wire": {"holder_name", "bank_name", "account_number", "swift_bic"},
    "fund_mt5": set(),
}


class WithdrawalRequestCreate(BaseModel):
    mt5_account_id: str
    amount: float
    method: WithdrawalMethod
    destination_details: dict = {}

    @model_validator(mode="after")
    def _check_destination_details(self):
        required = _REQUIRED_DETAIL_KEYS[self.method]
        missing = required - set(self.destination_details or {})
        if missing:
            raise ValueError(
                f"destination_details missing required field(s) for {self.method}: {', '.join(sorted(missing))}"
            )
        return self


class WithdrawalReviewDecision(BaseModel):
    """super_admin-only decision on a pending withdrawal request — the only
    way a request's status can become "approved" or "rejected"."""

    decision: Literal["approve", "reject"]
    admin_note: Optional[str] = None


class WithdrawalRequest(BaseModel):
    id: str
    mt5_account_id: str
    broker_name: str
    mt5_number: str
    amount: float
    method: WithdrawalMethod
    destination_details: dict
    status: str
    admin_note: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
