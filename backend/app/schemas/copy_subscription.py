from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CopySubscriptionCreate(BaseModel):
    copy_trader_id: str
    mt5_account_id: str
    # The account's real trading password — never the investor password.
    # See CopySubscription.trading_password_encrypted for why this is a
    # deliberate, narrow exception to this app's usual investor-password-only
    # rule.
    trading_password: str
    multiplier: float = 1.0


class CopySubscription(BaseModel):
    id: str
    copy_trader_id: str
    copy_trader_name: str
    mt5_account_id: str
    broker_name: str
    mt5_number: str
    multiplier: float
    status: str
    metaapi_connection_status: str
    created_at: datetime

    class Config:
        from_attributes = True
