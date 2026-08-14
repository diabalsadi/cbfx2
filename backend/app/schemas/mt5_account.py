from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MT5AccountCreate(BaseModel):
    broker_id: str
    mt5_number: str


class MT5Account(BaseModel):
    id: str
    broker_id: str
    broker_name: str
    broker_img_src: Optional[str] = None
    mt5_number: str
    balance: float
    lifetime_earned: float
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
