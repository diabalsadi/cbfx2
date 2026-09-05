from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, case
from sqlalchemy.orm import Session
from typing import List

from backend_shared.database import get_db
from backend_shared.models.campaign import Campaign
from backend_shared.models.notification import Notification
from backend_shared.schemas.campaign import (
    CampaignCreate,
    CampaignUpdate,
    CampaignReviewDecision,
    Campaign as CampaignSchema,
)
from backend_shared.utils.auth import get_current_user
from backend_shared.models.user import User
from backend_shared.auth.rbac import require_roles

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

ALLOWED_ROLES = {"super_admin", "broker"}

def _notify_admins_pending_review(db: Session, campaign: Campaign, submitted_by: str, resubmitted: bool = False):
    """Fan out one Notification per super_admin — called both when a
    campaign is first launched and when a declined one is fixed up and
    auto-resubmitted (see update_campaign)."""
    verb = "resubmitted" if resubmitted else "submitted"
    admins = db.query(User).filter(User.role == "super_admin").all()
    for admin in admins:
        db.add(
            Notification(
                recipient_email=admin.email,
                type="campaign_pending_review",
                title="Campaign awaiting review" if resubmitted else "New campaign awaiting review",
                body=f'{submitted_by} {verb} "{campaign.name}" for review.',
                related_type="campaign",
                related_id=campaign.id,
            )
        )
    db.commit()


@router.get("/", response_model=List[CampaignSchema])
def list_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    q = db.query(Campaign)
    if current_user.role != "super_admin":
        # A "broker"-role account only manages campaigns it created — not
        # every advertiser's campaign in the system.
        q = q.filter(Campaign.created_by == current_user.email)
    return q.order_by(Campaign.created_at.desc()).all()


@router.get("/stats")
def campaign_stats(
    db: Session = Depends(get_db),
    # Aggregate totals across every campaign — platform-wide business
    # metrics, not something a single broker's account should see for
    # competitors' campaigns.
    current_user: User = Depends(require_roles({"super_admin"})),
):
    total, active, total_budget, total_impressions, total_clicks, total_spend = db.query(
        func.count(Campaign.id),
        func.coalesce(func.sum(case((Campaign.status == "active", 1), else_=0)), 0),
        func.coalesce(func.sum(Campaign.budget), 0),
        func.coalesce(func.sum(Campaign.impressions), 0),
        func.coalesce(func.sum(Campaign.clicks), 0),
        func.coalesce(func.sum(Campaign.spend), 0),
    ).one()
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
    if current_user.role != "super_admin" and campaign.created_by != current_user.email:
        raise HTTPException(status_code=403, detail="Not authorised")
    return campaign


@router.post("/", response_model=CampaignSchema, status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    data = payload.model_dump()
    if current_user.role != "super_admin":
        # A broker "launching" a campaign always starts it out awaiting
        # super_admin review — whatever status they sent is ignored, so
        # there's no way to submit a campaign as already "active".
        data["status"] = "pending_review"
    campaign = Campaign(**data, created_by=current_user.email)
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    if campaign.status == "pending_review":
        _notify_admins_pending_review(db, campaign, current_user.email)

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
    if current_user.role != "super_admin" and campaign.created_by != current_user.email:
        raise HTTPException(status_code=403, detail="Not authorised")

    updates = payload.model_dump(exclude_unset=True)
    resubmitted = False
    if current_user.role != "super_admin":
        # Only a super_admin's review decision (POST .../review) may move a
        # campaign to "active"/"declined" — a broker editing their own
        # campaign can't just set status themselves.
        updates.pop("status", None)
        # Editing a declined campaign is treated as fixing it up and
        # resubmitting — otherwise a broker would have no way to get a
        # rejected campaign back in front of a super_admin.
        if campaign.status == "declined":
            campaign.status = "pending_review"
            resubmitted = True
    for field, value in updates.items():
        setattr(campaign, field, value)
    db.commit()
    db.refresh(campaign)

    if resubmitted:
        _notify_admins_pending_review(db, campaign, current_user.email, resubmitted=True)

    return campaign


@router.post("/{campaign_id}/review", response_model=CampaignSchema)
def review_campaign(
    campaign_id: str,
    payload: CampaignReviewDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles({"super_admin"})),
):
    """Confirm or decline a broker-launched campaign. The only path by
    which a campaign's status can become "active" or "declined"."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = "active" if payload.decision == "confirm" else "declined"
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
