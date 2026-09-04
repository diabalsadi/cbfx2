from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend_shared.database import get_db
from backend_shared.models.notification import Notification
from backend_shared.schemas.notification import Notification as NotificationSchema, UnreadCount
from backend_shared.utils.auth import get_current_user
from backend_shared.models.user import User

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/me", response_model=List[NotificationSchema])
def list_my_notifications(
    unread_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Notification).filter(Notification.recipient_email == current_user.email)
    if unread_only:
        q = q.filter(Notification.is_read.is_(False))
    return q.order_by(Notification.created_at.desc()).limit(min(limit, 200)).all()


@router.get("/me/unread-count", response_model=UnreadCount)
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = (
        db.query(Notification)
        .filter(Notification.recipient_email == current_user.email, Notification.is_read.is_(False))
        .count()
    )
    return {"count": count}


@router.patch("/{notification_id}/read", response_model=NotificationSchema)
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notif.recipient_email != current_user.email:
        raise HTTPException(status_code=403, detail="Not authorised")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.patch("/me/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    (
        db.query(Notification)
        .filter(Notification.recipient_email == current_user.email, Notification.is_read.is_(False))
        .update({"is_read": True})
    )
    db.commit()
    return {"message": "All notifications marked read"}
