from typing import Dict, List, Optional

from pydantic import BaseModel


class ReferralInfo(BaseModel):
    referral_code: Optional[str] = None


class ReferralBucket(BaseModel):
    label: str
    count: int


class ReferralStats(BaseModel):
    total: int
    by_country: Dict[str, int]
    weekly: List[ReferralBucket]
    monthly: List[ReferralBucket]


class ClientReferralSummary(BaseModel):
    client_email: str
    client_name: Optional[str] = None
    referral_code: Optional[str] = None
    total: int


class AdminReferralStats(ReferralStats):
    by_client: List[ClientReferralSummary]
