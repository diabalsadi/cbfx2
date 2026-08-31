from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MT5AccountCreate(BaseModel):
    broker_id: str
    mt5_number: str  # MT5 login
    # Optional at the schema level so registration (auth.py, which reuses this
    # model but doesn't collect MetaApi credentials at signup) keeps working
    # unchanged. The dedicated "add account" endpoint enforces these three as
    # required itself — see routers/mt5_accounts.py:add_account.
    server: Optional[str] = None
    platform: Optional[str] = None  # "mt4" | "mt5"
    investor_password: Optional[str] = None  # read-only investor password — never the main trading password
    account_type: Optional[str] = None  # matches one of the broker's configured account_types[].name


class MT5Account(BaseModel):
    id: str
    broker_id: str
    broker_name: str
    broker_img_src: Optional[str] = None
    mt5_number: str
    account_type: Optional[str] = None
    balance: float
    lifetime_earned: float
    # Sum of unsettled, priced TradeRecord.expected_amount for this account —
    # the system's own automatic calculation, not yet credited to balance.
    # Shown to the customer as "System Estimate" (see rebate_calculation.py:
    # pending_amount_by_account) — deliberately not called "pending" so it
    # doesn't read as a queued/delayed payment.
    pending_expected_amount: float = 0.0
    metaapi_connection_status: str
    created_at: datetime


class AdminMT5Account(BaseModel):
    id: str
    user_email: str
    broker_id: str
    broker_name: str
    mt5_number: str
    account_type: Optional[str] = None
    metaapi_connection_status: str
    metaapi_last_synced_at: Optional[datetime] = None
    created_at: datetime


class WalletTransaction(BaseModel):
    id: str
    mt5_account_id: str
    broker_name: str
    mt5_number: str
    type: str  # "credit" (money in) | "debit" (money out)
    amount: float
    description: str
    created_at: datetime
