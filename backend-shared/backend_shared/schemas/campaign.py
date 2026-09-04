from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime


class CampaignBase(BaseModel):
    name: str
    client_id: Optional[str] = None
    budget: Optional[float] = 0.0
    impressions: Optional[int] = 0
    clicks: Optional[int] = 0
    spend: Optional[float] = 0.0
    status: Optional[str] = "draft"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    image_url: Optional[str] = None


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    client_id: Optional[str] = None
    budget: Optional[float] = None
    impressions: Optional[int] = None
    clicks: Optional[int] = None
    spend: Optional[float] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    image_url: Optional[str] = None


class Campaign(CampaignBase):
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CampaignReviewDecision(BaseModel):
    """super_admin-only decision on a broker-launched campaign — the only
    way a campaign's status can ever become "active" or "declined"."""

    decision: Literal["confirm", "decline"]
