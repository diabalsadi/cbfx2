from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.campaign import Campaign
from app.schemas.campaign import CampaignCreate, CampaignUpdate, Campaign as CampaignSchema
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

ALLOWED_ROLES = {"super_admin", "broker"}


def require_roles(roles: set):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker


@router.get("/", response_model=List[CampaignSchema])
def list_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    return db.query(Campaign).order_by(Campaign.created_at.desc()).all()


@router.get("/stats")
def campaign_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    campaigns = db.query(Campaign).all()
    total = len(campaigns)
    total_budget = sum(c.budget or 0 for c in campaigns)
    total_impressions = sum(c.impressions or 0 for c in campaigns)
    total_clicks = sum(c.clicks or 0 for c in campaigns)
    total_spend = sum(c.spend or 0 for c in campaigns)
    active = sum(1 for c in campaigns if c.status == "active")
    return {
        "total_campaigns": total,
        "active_campaigns": active,
        "total_budget": total_budget,
        "total_impressions": total_impressions,
        "total_clicks": total_clicks,
        "total_spend": total_spend,
        "ctr": round(total_clicks / total_impressions * 100, 2) if total_impressions > 0 else 0,
    }


@router.get("/{campaign_id}", response_model=CampaignSchema)
def get_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.post("/", response_model=CampaignSchema, status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    campaign = Campaign(**payload.model_dump(), created_by=current_user.email)
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.put("/{campaign_id}", response_model=CampaignSchema)
def update_campaign(
    campaign_id: str,
    payload: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(campaign, field, value)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles({"super_admin"})),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
