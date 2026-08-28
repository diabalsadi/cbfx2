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
    metaapi_connection_status: str
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
